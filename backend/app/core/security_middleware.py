"""
Security Headers & Sliding-Window Rate Limiting Utilities for Phase 10 Hardening.
"""

import time
from collections import defaultdict, deque
from typing import Deque, Dict, Tuple


class SlidingWindowRateLimiter:
    """In-memory sliding-window rate limiter keyed by (bucket, client_ip)."""

    def __init__(self) -> None:
        self._hits: Dict[Tuple[str, str], Deque[float]] = defaultdict(deque)

    def check(
        self, bucket: str, client_ip: str, max_requests: int, window_seconds: int
    ) -> Tuple[bool, int]:
        """
        Returns (allowed, retry_after_seconds).
        Prunes expired timestamps outside the current sliding window.
        """
        now = time.monotonic()
        key = (bucket, client_ip)
        q = self._hits[key]
        cutoff = now - window_seconds
        while q and q[0] <= cutoff:
            q.popleft()

        if len(q) >= max_requests:
            retry_after = max(1, int(window_seconds - (now - q[0])))
            return False, retry_after

        q.append(now)
        return True, 0

    def reset(self) -> None:
        self._hits.clear()


rate_limiter = SlidingWindowRateLimiter()
