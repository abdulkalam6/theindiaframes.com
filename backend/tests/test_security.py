"""
Phase 10 Security & Hardening Tests.
Verifies:
1. Forged `X-Auth-Role` headers cannot bypass wholesale price protection or admin mutations.
2. Security headers (`X-Content-Type-Options`, `X-Frame-Options`, `Referrer-Policy`, `Permissions-Policy`)
   and `X-Request-ID` are returned on API responses.
3. Rate limiting enforces 429 Too Many Requests with `Retry-After` on auth endpoints.
4. Untrusted CORS origins are never reflected with credentials.
"""

import pytest
from httpx import ASGITransport, AsyncClient

from app.cli.provision_owner import provision_owner
from app.core.config import settings
from app.database.session import db_manager
from app.main import app


@pytest.fixture(autouse=True)
async def setup_security_db():
    await db_manager.connect()
    if db_manager.db is not None:
        await db_manager.db.users.delete_many({})
        await db_manager.db.sessions.delete_many({})
        await db_manager.db.categories.delete_many({})
        await db_manager.db.products.delete_many({})
        await db_manager.db.product_variants.delete_many({})
    yield
    if db_manager.db is not None:
        await db_manager.db.users.delete_many({})
        await db_manager.db.sessions.delete_many({})
        await db_manager.db.categories.delete_many({})
        await db_manager.db.products.delete_many({})
        await db_manager.db.product_variants.delete_many({})


@pytest.mark.asyncio
async def test_header_spoofing_blocked_and_no_wholesale_leakage():
    await provision_owner(
        name="Security Owner",
        email="sec.owner@theindiaframes.com",
        password="OwnerPassword123!",
    )

    async with AsyncClient(
        transport=ASGITransport(app=app), base_url="http://test"
    ) as owner_client:
        await owner_client.post(
            "/api/v1/auth/login",
            json={"email": "sec.owner@theindiaframes.com", "password": "OwnerPassword123!"},
        )
        cat = await owner_client.post(
            "/api/v1/admin/categories",
            json={"name": "Sec Frames", "slug": "sec-frames"},
        )
        cat_id = cat.json()["data"]["id"]
        prod = await owner_client.post(
            "/api/v1/admin/products",
            json={
                "name": "Secure Frame",
                "slug": "secure-frame",
                "base_sku": "SEC-01",
                "category_id": cat_id,
            },
        )
        prod_id = prod.json()["data"]["id"]
        await owner_client.post(
            f"/api/v1/admin/products/{prod_id}/variants",
            json={
                "sku": "SEC-01-A4",
                "label": "A4 Frame",
                "retail_price_paise": 50000,
                "wholesale_price_paise": 31000,
                "wholesale_moq": 10,
                "availability": "available",
            },
        )

    # Visitor attempting to spoof X-Auth-Role headers
    async with AsyncClient(
        transport=ASGITransport(app=app), base_url="http://test"
    ) as attacker_client:
        # Spoofing wholesale_approved must still only yield retail price
        ws_spoof = await attacker_client.get(
            "/api/v1/products/secure-frame",
            headers={"X-Auth-Role": "wholesale_approved"},
        )
        assert ws_spoof.status_code == 200
        variant = ws_spoof.json()["data"]["variants"][0]
        assert variant["retail_price_paise"] == 50000
        assert "wholesale_price_paise" not in variant
        assert "wholesale_moq" not in variant

        # Spoofing owner cannot mutate catalogue
        cat_spoof = await attacker_client.post(
            "/api/v1/admin/categories",
            headers={"X-Auth-Role": "owner"},
            json={"name": "Evil Cat", "slug": "evil-cat"},
        )
        assert cat_spoof.status_code == 401


@pytest.mark.asyncio
async def test_security_headers_and_cors_strictness():
    async with AsyncClient(
        transport=ASGITransport(app=app), base_url="http://test"
    ) as client:
        resp = await client.get(
            "/health",
            headers={"Origin": "https://untrusted-evil-site.example"},
        )
        assert resp.status_code == 200
        assert resp.headers.get("X-Content-Type-Options") == "nosniff"
        assert resp.headers.get("X-Frame-Options") == "DENY"
        assert resp.headers.get("Referrer-Policy") == "strict-origin-when-cross-origin"
        assert "Permissions-Policy" in resp.headers
        assert "X-Request-ID" in resp.headers
        # Untrusted origin must NOT be reflected
        assert resp.headers.get("Access-Control-Allow-Origin") is None


@pytest.mark.asyncio
async def test_auth_rate_limiting_enforced(monkeypatch):
    monkeypatch.setattr(settings, "RATE_LIMIT_ENABLED", True)
    monkeypatch.setattr(settings, "RATE_LIMIT_AUTH_MAX_REQUESTS", 3)
    monkeypatch.setattr(settings, "RATE_LIMIT_WINDOW_SECONDS", 60)

    async with AsyncClient(
        transport=ASGITransport(app=app), base_url="http://test"
    ) as client:
        for _ in range(3):
            r = await client.post(
                "/api/v1/auth/login",
                json={"email": "nobody@example.com", "password": "wrong"},
            )
            assert r.status_code == 401

        # 4th attempt within window must trigger 429
        limited = await client.post(
            "/api/v1/auth/login",
            json={"email": "nobody@example.com", "password": "wrong"},
        )
        assert limited.status_code == 429
        assert "Retry-After" in limited.headers
        assert limited.json()["error"]["code"] == "RATE_LIMIT_EXCEEDED"
