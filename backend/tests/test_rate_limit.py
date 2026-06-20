"""
Unit tests for the per-user rate limiter (app.routers.auth.check_rate_limit).

Covers the two failure modes the limiter is designed to prevent:
  1. Redis-down must NOT remove the limit (it falls back to a process-local
     counter), and
  2. the Redis path counts atomically so concurrent requests can't exceed the cap.
All external services are faked — no live Redis.
"""

import pytest
from unittest.mock import AsyncMock, patch

import app.routers.auth as auth


# --- Fakes -----------------------------------------------------------------


class _FakePipeline:
    """Mimics redis.asyncio pipeline: sync queue methods + async execute()."""

    def __init__(self, store):
        self._store = store
        self._key = None

    def incr(self, key):
        self._key = key
        return self

    def expire(self, key, ttl, nx=False):
        return self

    async def execute(self):
        self._store[self._key] = self._store.get(self._key, 0) + 1
        return [self._store[self._key], True]


class _FakeRedis:
    def __init__(self):
        self.store = {}

    def pipeline(self):
        return _FakePipeline(self.store)


@pytest.fixture(autouse=True)
def _clear_local_buckets():
    """Isolate the process-local fallback state between tests."""
    auth._local_buckets.clear()
    yield
    auth._local_buckets.clear()


def _limit() -> int:
    from app.config import get_settings
    return get_settings().rate_limit_per_hour


# --- Redis-down fallback (the fail-open bug) -------------------------------


@pytest.mark.asyncio
async def test_local_fallback_enforces_limit_when_redis_down():
    """With Redis unavailable, the limit must still be enforced, not bypassed."""
    limit = _limit()
    with patch.object(auth, "get_redis", new=AsyncMock(return_value=None)):
        # The first `limit` calls are allowed.
        for _ in range(limit):
            await auth.check_rate_limit("user-a")
        # The next one trips the limiter.
        with pytest.raises(auth.HTTPException) as exc:
            await auth.check_rate_limit("user-a")
        assert exc.value.status_code == 429


@pytest.mark.asyncio
async def test_local_fallback_isolates_users():
    """One user hitting the cap must not affect a different user."""
    limit = _limit()
    with patch.object(auth, "get_redis", new=AsyncMock(return_value=None)):
        for _ in range(limit + 5):
            try:
                await auth.check_rate_limit("heavy-user")
            except auth.HTTPException:
                pass
        # A fresh user is unaffected.
        await auth.check_rate_limit("fresh-user")  # must not raise


# --- Redis atomic path -----------------------------------------------------


@pytest.mark.asyncio
async def test_redis_path_enforces_limit():
    """The Redis counter rejects the request once the count exceeds the limit."""
    limit = _limit()
    fake = _FakeRedis()
    with patch.object(auth, "get_redis", new=AsyncMock(return_value=fake)):
        for _ in range(limit):
            await auth.check_rate_limit("user-b")
        with pytest.raises(auth.HTTPException) as exc:
            await auth.check_rate_limit("user-b")
        assert exc.value.status_code == 429


@pytest.mark.asyncio
async def test_redis_error_falls_back_to_local_limit():
    """If Redis errors mid-flight, requests are still counted (not let through)."""
    limit = _limit()
    broken = AsyncMock()
    broken.pipeline.side_effect = RuntimeError("connection reset")
    with patch.object(auth, "get_redis", new=AsyncMock(return_value=broken)):
        for _ in range(limit):
            await auth.check_rate_limit("user-c")
        with pytest.raises(auth.HTTPException) as exc:
            await auth.check_rate_limit("user-c")
        assert exc.value.status_code == 429
