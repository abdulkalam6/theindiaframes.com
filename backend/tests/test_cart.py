"""
Tests for Cart Validation, Pricing Calculation & MOQ Enforcement in Phase 5.
"""

import pytest
from httpx import ASGITransport, AsyncClient

from app.cli.provision_owner import provision_owner
from app.database.session import db_manager
from app.main import app


@pytest.fixture(autouse=True)
async def setup_test_cart_db():
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
async def test_cart_validation_and_pricing_tiers():
    await provision_owner(
        name="Owner",
        email="owner@theindiaframes.com",
        password="Password123!",
    )

    # 1. Setup Catalogue Data using an authenticated owner client session
    async with AsyncClient(
        transport=ASGITransport(app=app), base_url="http://test"
    ) as setup_client:
        login_res = await setup_client.post(
            "/api/v1/auth/login",
            json={"email": "owner@theindiaframes.com", "password": "Password123!"},
        )
        assert login_res.status_code == 200

        cat_resp = await setup_client.post(
            "/api/v1/admin/categories",
            json={"name": "Photo Frames", "slug": "photo-frames"},
        )
        cat_id = cat_resp.json()["data"]["id"]

        prod_resp = await setup_client.post(
            "/api/v1/admin/products",
            json={
                "name": "Teak Wood Frame",
                "slug": "teak-wood-frame",
                "base_sku": "TWF-01",
                "category_id": cat_id,
            },
        )
        prod_id = prod_resp.json()["data"]["id"]

        var_resp = await setup_client.post(
            f"/api/v1/admin/products/{prod_id}/variants",
            json={
                "sku": "TWF-01-8X12",
                "label": "8x12 inches",
                "retail_price_paise": 50000,      # ₹500
                "wholesale_price_paise": 35000,   # ₹350
                "wholesale_moq": 5,
                "availability": "available",
            },
        )
        var_id = var_resp.json()["data"]["id"]

    # 2. Anonymous / Visitor Cart Validation (no cookies -> retail price ₹500, MOQ not enforced)
    async with AsyncClient(
        transport=ASGITransport(app=app), base_url="http://test"
    ) as anon_client:
        anon_cart = await anon_client.post(
            "/api/v1/cart/validate",
            json={"items": [{"product_id": prod_id, "variant_id": var_id, "quantity": 2}]},
        )
        assert anon_cart.status_code == 200
        anon_data = anon_cart.json()["data"]
        assert anon_data["pricing_tier"] == "retail"
        assert anon_data["items"][0]["unit_price_paise"] == 50000
        assert anon_data["items"][0]["line_total_paise"] == 100000
        assert anon_data["subtotal_paise"] == 100000
        assert anon_data["can_submit"] is True

    # 3. Approved Wholesale Customer Cart (separate client holding owner session cookies)
    async with AsyncClient(
        transport=ASGITransport(app=app), base_url="http://test"
    ) as ws_client:
        owner_login = await ws_client.post(
            "/api/v1/auth/login",
            json={"email": "owner@theindiaframes.com", "password": "Password123!"},
        )
        assert owner_login.status_code == 200

        # a) If quantity < MOQ (qty=2 vs MOQ=5), can_submit must be FALSE with warning
        ws_cart_low = await ws_client.post(
            "/api/v1/cart/validate",
            json={"items": [{"product_id": prod_id, "variant_id": var_id, "quantity": 2}]},
        )
        assert ws_cart_low.status_code == 200
        ws_low_data = ws_cart_low.json()["data"]
        assert ws_low_data["pricing_tier"] == "wholesale"
        assert ws_low_data["can_submit"] is False
        assert ws_low_data["items"][0]["moq_satisfied"] is False
        assert any("minimum order quantity" in err for err in ws_low_data["validation_issues"])

        # b) If quantity >= MOQ (qty=5), receives wholesale price ₹350 and can_submit is TRUE
        ws_cart_ok = await ws_client.post(
            "/api/v1/cart/validate",
            json={"items": [{"product_id": prod_id, "variant_id": var_id, "quantity": 5}]},
        )
        assert ws_cart_ok.status_code == 200
        ws_ok_data = ws_cart_ok.json()["data"]
        assert ws_ok_data["pricing_tier"] == "wholesale"
        assert ws_ok_data["items"][0]["unit_price_paise"] == 35000
        assert ws_ok_data["items"][0]["line_total_paise"] == 175000  # 35000 * 5
        assert ws_ok_data["subtotal_paise"] == 175000
        assert ws_ok_data["can_submit"] is True
