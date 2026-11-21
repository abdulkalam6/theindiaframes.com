"""Shared pytest fixtures for backend test suite."""

import pytest

from app.core.security_middleware import rate_limiter


@pytest.fixture(autouse=True)
def reset_rate_limiter_per_test():
    """Ensure sliding-window rate limiter starts clean for every test."""
    rate_limiter.reset()
    yield
    rate_limiter.reset()
