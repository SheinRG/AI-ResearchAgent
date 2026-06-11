"""
Web scraping service using Trafilatura for content extraction.
Fetches pages with a shared, connection-pooled httpx client and extracts
clean text using Trafilatura. Scrapes URLs in parallel with a concurrency cap.
"""

import asyncio
import logging
from typing import Optional

import httpx
import trafilatura

from app.config import get_settings

logger = logging.getLogger(__name__)

# Request headers to mimic a browser
_HEADERS = {
    "User-Agent": (
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) "
        "AppleWebKit/537.36 (KHTML, like Gecko) "
        "Chrome/120.0.0.0 Safari/537.36"
    ),
    "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
    "Accept-Language": "en-US,en;q=0.9",
}

# Shared client so connections (and keep-alive) are reused across scrapes
# instead of opening a fresh TCP/TLS handshake for every single URL.
_client: Optional[httpx.AsyncClient] = None


def _get_client() -> httpx.AsyncClient:
    """Get or create the shared, pooled scraping client."""
    global _client
    if _client is None:
        settings = get_settings()
        _client = httpx.AsyncClient(
            timeout=httpx.Timeout(settings.scrape_timeout),
            follow_redirects=True,
            headers=_HEADERS,
            limits=httpx.Limits(
                max_connections=settings.scrape_max_concurrent * 2,
                max_keepalive_connections=settings.scrape_max_concurrent,
            ),
        )
    return _client


async def close_scraper() -> None:
    """Close the shared scraping client (call on shutdown)."""
    global _client
    if _client is not None:
        await _client.aclose()
        _client = None
        logger.info("Scraper client closed")


async def scrape_url(url: str) -> Optional[str]:
    """
    Fetch a URL and extract its main text content using Trafilatura.

    Args:
        url: The URL to scrape.

    Returns:
        Extracted text content, or None if extraction fails.
    """
    try:
        client = _get_client()
        response = await client.get(url)
        response.raise_for_status()
        html = response.text

        # Run Trafilatura extraction in a thread (it's CPU-bound) so it doesn't
        # block the event loop while other scrapes are in flight.
        loop = asyncio.get_running_loop()
        text = await loop.run_in_executor(None, _extract_text, html, url)

        if text and len(text.strip()) > 50:
            logger.info("Scraped %s: %d chars", url, len(text))
            return text.strip()
        logger.warning("Scraped %s but got minimal content", url)
        return None

    except httpx.TimeoutException:
        logger.warning("Scrape timeout for %s", url)
        return None
    except httpx.HTTPStatusError as e:
        logger.warning("Scrape HTTP error for %s: %s", url, e.response.status_code)
        return None
    except Exception as e:
        logger.warning("Scrape failed for %s: %s", url, e)
        return None


def _extract_text(html: str, url: str) -> Optional[str]:
    """Extract text from HTML using Trafilatura (synchronous)."""
    try:
        return trafilatura.extract(
            html,
            url=url,
            include_comments=False,
            include_tables=True,
            no_fallback=False,
            favor_precision=True,
        )
    except Exception as e:
        logger.warning("Trafilatura extraction error: %s", e)
        return None


async def scrape_urls(
    urls: list[str],
    max_concurrent: Optional[int] = None,
) -> dict[str, Optional[str]]:
    """
    Scrape multiple URLs in parallel with a concurrency limit.

    Args:
        urls: List of URLs to scrape.
        max_concurrent: Maximum number of concurrent scrape requests.

    Returns:
        Dict mapping URL → extracted text (or None on failure).
    """
    if max_concurrent is None:
        max_concurrent = get_settings().scrape_max_concurrent

    sem = asyncio.Semaphore(max_concurrent)

    async def _scrape_with_sem(url: str):
        async with sem:
            return await scrape_url(url)

    tasks = [_scrape_with_sem(url) for url in urls]
    results = await asyncio.gather(*tasks, return_exceptions=True)

    scraped: dict[str, Optional[str]] = {}
    for url, result in zip(urls, results):
        if isinstance(result, Exception):
            logger.warning("Scrape exception for %s: %s", url, result)
            scraped[url] = None
        else:
            scraped[url] = result

    successful = sum(1 for v in scraped.values() if v is not None)
    logger.info("Scraped %d/%d URLs successfully", successful, len(urls))

    return scraped
