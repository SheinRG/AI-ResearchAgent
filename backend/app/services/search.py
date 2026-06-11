"""
Serper.dev web search service.
Uses the Serper Google Search API for fast, reliable search results.
"""

import logging
from typing import Optional
from urllib.parse import urlparse

import httpx

from app.models.schemas import SearchResult
from app.config import get_settings

logger = logging.getLogger(__name__)

SERPER_ENDPOINT = "https://google.serper.dev/search"

_client: Optional[httpx.AsyncClient] = None

def _get_client() -> httpx.AsyncClient:
    """Get or create a persistent HTTP client for reusing connections."""
    global _client
    if _client is None:
        _client = httpx.AsyncClient(timeout=30)
    return _client


async def search_web(
    query: str,
    max_results: Optional[int] = None,
) -> list[SearchResult]:
    """
    Search the web using the Serper.dev Google Search API.

    Args:
        query: The search query string.
        max_results: Maximum number of results to return.

    Returns:
        List of SearchResult objects with url, title, domain, favicon, snippet.
    """
    settings = get_settings()
    if max_results is None:
        max_results = settings.search_results_per_query

    headers = {
        "X-API-KEY": settings.serper_api_key,
        "Content-Type": "application/json",
    }
    payload = {
        "q": query,
        "num": max_results,
    }

    try:
        client = _get_client()
        response = await client.post(
            SERPER_ENDPOINT,
            headers=headers,
            json=payload,
        )
        response.raise_for_status()
        data = response.json()

        raw_results = data.get("organic", [])
        results = []
        domain_counts: dict[str, int] = {}

        for r in raw_results:
            url = r.get("link", "")
            title = r.get("title", "")
            snippet = r.get("snippet", "")

            if not url or not title:
                continue

            domain = urlparse(url).netloc.replace("www.", "")

            # Cap results per domain for diversity, but keep up to 2 so an
            # authoritative site isn't reduced to a single page.
            if domain_counts.get(domain, 0) >= 2:
                continue
            domain_counts[domain] = domain_counts.get(domain, 0) + 1

            favicon = f"https://www.google.com/s2/favicons?domain={domain}&sz=32"

            results.append(SearchResult(
                url=url,
                title=title,
                domain=domain,
                favicon=favicon,
                snippet=snippet[:300] if snippet else "",
            ))

        logger.info("Serper search for '%s': %d results", query, len(results))
        return results

    except httpx.TimeoutException:
        logger.error("Serper search timed out for '%s'", query)
        return []
    except httpx.HTTPStatusError as e:
        logger.error("Serper HTTP error for '%s': %s", query, e.response.status_code)
        return []
    except Exception as e:
        logger.error("Serper search failed for '%s': %s", query, e)
        return []
