"""
Researcher Node — Search → Scrape → Chunk → Rerank pipeline.
Runs ONCE per research turn and fans out over all sub-queries internally with
asyncio (not via a LangGraph Send fan-out). Because there is a single writer,
single-value state fields like `images` and `ranked_chunks` are safe without
reducers — do not convert this to a graph-level fan-out without adding them.
"""

import asyncio
import logging
from app.services.search import search_web, search_images
from app.services.scraper import scrape_urls
from app.services.tavily import tavily_search
from app.services.reranker import rerank_chunks
from app.services.cache import cache_get, cache_get_many, cache_set
from app.utils.chunker import chunk_text
from app.agents.state import ResearchState
from app.config import get_settings

logger = logging.getLogger(__name__)


async def _search_single_query(sub_query: str, max_results: int) -> tuple[str, list[dict]]:
    """Search a single sub-query, using cache when available.

    Returns:
        Tuple of (sub_query, results_list).
    """
    cached = await cache_get("search", sub_query)
    if cached:
        logger.info("Cache hit for search: %s", sub_query[:50])
        return sub_query, cached

    results_objs = await search_web(sub_query, max_results=max_results)
    results = [r.model_dump() for r in results_objs]
    await cache_set("search", sub_query, results)
    return sub_query, results


async def _search_and_emit_images(query: str, sse_callback) -> list[dict]:
    """Fetch images for the ORIGINAL query once and stream them to the UI.

    Runs concurrently with web search so it never delays the answer, and is
    fully best-effort: any failure yields an empty list and is swallowed here so
    an image lookup can never break the research run.
    """
    try:
        images = await search_images(query)
    except Exception as e:  # search_images already guards, but be doubly safe
        logger.warning("Image search failed for '%s': %s", query[:50], e)
        images = []

    if sse_callback and images:
        try:
            await sse_callback("images", {"images": images})
        except Exception as e:
            logger.warning("Failed to emit images event: %s", e)

    return images


async def _tavily_single_query(sub_query: str, settings) -> list[dict]:
    """Tavily search+content for one sub-query, using cache when available."""
    cached = await cache_get("tavily", sub_query)
    if cached:
        logger.info("Cache hit for tavily: %s", sub_query[:50])
        return cached

    results = await tavily_search(
        sub_query,
        max_results=settings.search_results_per_query,
        search_depth=settings.tavily_search_depth,
    )
    await cache_set("tavily", sub_query, results)
    return results


async def _tavily_search_and_read(sub_queries: list[str], settings) -> tuple[list[dict], list[dict]]:
    """Search + read all sub-queries via Tavily (one call each, no separate scrape).

    Returns:
        (all_search_results, scraped_pages) where each scraped page is
        {url, text, title, domain}. Content for the top `scrape_top_n` results of
        each sub-query is fed to the chunker; the rest still appear as sources.
    """
    tasks = [_tavily_single_query(sq, settings) for sq in sub_queries]
    per_query = await asyncio.gather(*tasks, return_exceptions=True)

    all_search_results: list[dict] = []
    scraped_pages: list[dict] = []
    seen: set[str] = set()

    for res in per_query:
        if isinstance(res, Exception):
            logger.warning("Tavily task failed: %s", res)
            continue
        for i, r in enumerate(res):
            url = r.get("url", "")
            if not url or url in seen:
                continue
            seen.add(url)
            all_search_results.append({
                "url": url,
                "title": r.get("title", ""),
                "domain": r.get("domain", ""),
                "favicon": r.get("favicon", ""),
                "snippet": r.get("snippet", ""),
            })
            # Take the cleaned content of the top results per sub-query for
            # chunking; lower-ranked hits still surface as sources.
            if i < settings.scrape_top_n and r.get("content"):
                scraped_pages.append({
                    "url": url,
                    "text": r["content"],
                    "title": r.get("title", ""),
                    "domain": r.get("domain", ""),
                })

    return all_search_results, scraped_pages


async def _serper_search_and_scrape(sub_queries: list[str], settings) -> tuple[list[dict], list[dict]]:
    """Search via Serper then scrape the top URLs (the original pipeline).

    Returns:
        (all_search_results, scraped_pages) — same shape as the Tavily path.
    """
    search_tasks = [
        _search_single_query(sq, settings.search_results_per_query)
        for sq in sub_queries
    ]
    search_results_per_query = await asyncio.gather(*search_tasks, return_exceptions=True)

    all_search_results: list[dict] = []
    all_urls_to_scrape: list[str] = []
    url_to_result: dict[str, dict] = {}

    for result in search_results_per_query:
        if isinstance(result, Exception):
            logger.warning("Search task failed: %s", result)
            continue
        _sub_query, results = result
        for r in results:
            if r["url"] not in url_to_result:
                url_to_result[r["url"]] = r
                all_search_results.append(r)
                if len(all_urls_to_scrape) < settings.scrape_top_n * len(sub_queries):
                    all_urls_to_scrape.append(r["url"])

    # --- Scrape URLs in parallel (cache-first) ---
    scraped_pages: list[dict] = []
    cached_map = await cache_get_many("scrape", all_urls_to_scrape)
    uncached_urls = []
    for url in all_urls_to_scrape:
        cached = cached_map.get(url)
        if cached:
            scraped_pages.append(cached)
        else:
            uncached_urls.append(url)

    if uncached_urls:
        scraped = await scrape_urls(uncached_urls)
        for url, text in scraped.items():
            if text:
                result_info = url_to_result.get(url, {})
                content_entry = {
                    "url": url,
                    "text": text,
                    "title": result_info.get("title", ""),
                    "domain": result_info.get("domain", ""),
                }
                scraped_pages.append(content_entry)
                await cache_set("scrape", url, content_entry)

    return all_search_results, scraped_pages


async def researcher_node(state: ResearchState) -> dict:
    """
    Researcher node: runs the full search → read → chunk pipeline for all
    sub-queries. Called once with all sub-queries, processes them in parallel.

    Uses Tavily (one search+content call per sub-query) when configured;
    otherwise falls back to Serper search + Trafilatura scraping.

    Args:
        state: Current research state with sub_queries.

    Returns:
        Updated state with search_results, scraped_content.
    """
    sub_queries = state.get("sub_queries", [])
    sse_callback = state.get("sse_callback")
    original_query = state.get("query", "")
    settings = get_settings()

    if not sub_queries:
        logger.warning("Researcher: no sub-queries to process")
        # Still surface images for the original query so the Images tab can fill
        # even when planning produced no sub-queries.
        images = await _search_and_emit_images(original_query, sse_callback) if original_query else []
        return {"search_results": [], "scraped_content": [], "images": images}

    logger.info("Researcher: processing %d sub-queries", len(sub_queries))

    # Phase: Searching
    if sse_callback:
        await sse_callback("phase", {
            "phase": "searching",
            "message": f"Searching {len(sub_queries)} sub-questions across the web..."
        })

    # The image search runs ONCE for the original user query (not per sub-query,
    # to limit API usage) concurrently with web search, and streams its own
    # `images` SSE event from inside the helper. Images always come from Serper.
    image_task = asyncio.ensure_future(
        _search_and_emit_images(original_query, sse_callback)
    ) if original_query else None

    # --- Search + read: Tavily (one call) or Serper search + scrape ---
    use_tavily = bool(settings.use_tavily_search and settings.tavily_api_key)
    if use_tavily:
        all_search_results, scraped_content = await _tavily_search_and_read(sub_queries, settings)
    else:
        all_search_results, scraped_content = await _serper_search_and_scrape(sub_queries, settings)

    # Send sources event to frontend
    if sse_callback and all_search_results:
        await sse_callback("sources", {
            "sources": all_search_results[:15]  # Send top 15 sources
        })

    logger.info(
        "Researcher: %d unique sources, %d pages with content (provider=%s)",
        len(all_search_results), len(scraped_content), "tavily" if use_tavily else "serper",
    )

    # Phase: Reading
    if sse_callback:
        await sse_callback("phase", {
            "phase": "reading",
            "message": f"Reading and analyzing {len(scraped_content)} sources..."
        })

    # --- Chunk all page content IN PARALLEL ---
    all_chunks = []
    loop = asyncio.get_running_loop()

    async def _process_content(content):
        # Run CPU-bound chunking in a thread pool to avoid blocking the event loop
        chunks = await loop.run_in_executor(
            None, chunk_text, content["text"], settings.chunk_size, settings.chunk_overlap
        )
        return [
            {
                "text": chunk_text_str,
                "source_url": content["url"],
                "source_title": content.get("title", ""),
                "source_domain": content.get("domain", ""),
            }
            for chunk_text_str in chunks
        ]

    if scraped_content:
        chunk_tasks = [_process_content(c) for c in scraped_content]
        chunk_results = await asyncio.gather(*chunk_tasks)
        for res in chunk_results:
            all_chunks.extend(res)

    logger.info("Researcher: generated %d chunks from %d scraped pages",
                len(all_chunks), len(scraped_content))

    # Collect the concurrently-running image results (already streamed to the UI
    # inside the helper). Never let an image failure break the run.
    images: list[dict] = []
    if image_task is not None:
        try:
            images = await image_task
        except Exception as e:
            logger.warning("Image task failed: %s", e)
            images = []

    return {
        "search_results": all_search_results,
        "scraped_content": all_chunks,
        "images": images,
    }


async def rerank_node(state: ResearchState) -> dict:
    """
    Re-rank all accumulated chunks by relevance to the original query.

    Args:
        state: Current state with scraped_content chunks.

    Returns:
        Updated state with ranked_chunks and all_sources.
    """
    query = state["query"]
    chunks = state.get("scraped_content", [])
    search_results = state.get("search_results", [])
    settings = get_settings()

    if not chunks:
        logger.warning("Reranker: no chunks to rank")
        return {"ranked_chunks": [], "all_sources": search_results}

    logger.info("Reranker: ranking %d chunks for query: %s", len(chunks), query[:80])

    ranked = await rerank_chunks(query, chunks, top_k=settings.rerank_top_k)

    ranked_dicts = [r.model_dump() for r in ranked]

    logger.info("Reranker: top chunk score=%.3f, bottom=%.3f",
                ranked_dicts[0]["score"] if ranked_dicts else 0,
                ranked_dicts[-1]["score"] if ranked_dicts else 0)

    return {
        "ranked_chunks": ranked_dicts,
        "all_sources": search_results,
    }
