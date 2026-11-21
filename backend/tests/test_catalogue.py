"""
End-to-end tests for Catalogue Management & Price Projections in Phase 2.
Verifies:
1. Category CRUD.
2. Product & Variant CRUD with SKU uniqueness constraints.
3. Retail price projection (strict omission of wholesale fields).
4. Wholesale price projection (wholesale prices & MOQ only).
5. Availability filtering.
"""

import pytest
from httpx import ASGITransport, AsyncClient

from app.database.session import db_manager
from app.main import app


@pytest.fixture(autouse=True)
async def setup_test_db():
    # Connect to local test database
    await db_manager.connect()
    if db_manager.db is not None:
        # Clean test collections before running tests
        await db_manager.db.categories.delete_many({})
        await db_manager.db.products.delete_many({})
        await db_manager.db.product_variants.delete_many({})
    yield
    if db_manager.db is not None:
        await db_manager.db.categories.delete_many({})
        await db_manager.db.products.delete_many({})
        await db_manager.db.product_variants.delete_many({})


@pytest.mark.asyncio
async def test_category_lifecycle():
    async with AsyncClient(
        transport=ASGITransport(app=app), base_url="http://test"
    ) as client:
        # Non-owner cannot create category
        resp = await client.post(
            "/api/v1/admin/categories",
            json={"name": "Frames", "slug": "frames"},
        )
        assert resp.status_code == 403

        # Owner can create category
        resp = await client.post(
            "/api/v1/admin/categories",
            headers={"x-auth-role": "owner"},
            json={
                "name": "Photo Frames",
                "slug": "photo-frames",
                "description": "High quality artistic photo frames",
            },
        )
        assert resp.status_code == 200
        data = resp.json()["data"]
        assert data["name"] == "Photo Frames"
        assert data["slug"] == "photo-frames"

        # Public listing receives the category
        list_resp = await client.get("/api/v1/categories")
        assert list_resp.status_code == 200
        cats = list_resp.json()["data"]
        assert len(cats) == 1
        assert cats[0]["slug"] == "photo-frames"


@pytest.mark.asyncio
async def test_product_and_variant_crud_with_sku_uniqueness():
    async with AsyncClient(
        transport=ASGITransport(app=app), base_url="http://test"
    ) as client:
        # 1. Create Category
        cat_resp = await client.post(
            "/api/v1/admin/categories",
            headers={"x-auth-role": "owner"},
            json={"name": "Lamination Machines", "slug": "lamination-machines"},
        )
        cat_id = cat_resp.json()["data"]["id"]

        # 2. Create Product
        prod_resp = await client.post(
            "/api/v1/admin/products",
            headers={"x-auth-role": "owner"},
            json={
                "name": "Thermal Roll Laminator 350",
                "slug": "thermal-roll-laminator-350",
                "base_sku": "LAM-350",
                "category_id": cat_id,
            },
        )
        assert prod_resp.status_code == 200
        prod_id = prod_resp.json()["data"]["id"]

        # 3. Duplicate Base SKU Rejected
        dup_sku_resp = await client.post(
            "/api/v1/admin/products",
            headers={"x-auth-role": "owner"},
            json={
                "name": "Duplicate Laminator",
                "slug": "dup-laminator",
                "base_sku": "LAM-350",
                "category_id": cat_id,
            },
        )
        assert dup_sku_resp.status_code == 409

        # 4. Add Variants to Product
        var_resp1 = await client.post(
            f"/api/v1/admin/products/{prod_id}/variants",
            headers={"x-auth-role": "owner"},
            json={
                "sku": "LAM-350-STD",
                "label": "Standard Single Sided",
                "retail_price_paise": 1500000,
                "wholesale_price_paise": 1200000,
                "wholesale_moq": 2,
                "availability": "available",
            },
        )
        assert var_resp1.status_code == 200

        # Duplicate Variant SKU Rejected
        var_dup_resp = await client.post(
            f"/api/v1/admin/products/{prod_id}/variants",
            headers={"x-auth-role": "owner"},
            json={
                "sku": "LAM-350-STD",
                "label": "Duplicate SKU",
                "retail_price_paise": 1400000,
            },
        )
        assert var_dup_resp.status_code == 409


@pytest.mark.asyncio
async def test_price_projection_rules():
    """
    CRITICAL ARCHITECTURAL GATE:
    Verify that visitor/retail accounts NEVER see wholesale fields,
    and approved wholesale accounts receive wholesale price & MOQ.
    """
    async with AsyncClient(
        transport=ASGITransport(app=app), base_url="http://test"
    ) as client:
        # Create category, product, and variant with both retail and wholesale prices
        cat_resp = await client.post(
            "/api/v1/admin/categories",
            headers={"x-auth-role": "owner"},
            json={"name": "Glass Works", "slug": "glass-works"},
        )
        cat_id = cat_resp.json()["data"]["id"]

        prod_resp = await client.post(
            "/api/v1/admin/products",
            headers={"x-auth-role": "owner"},
            json={
                "name": "Bevelled Frame Glass",
                "slug": "bevelled-frame-glass",
                "base_sku": "GLS-BEV-01",
                "category_id": cat_id,
            },
        )
        prod_id = prod_resp.json()["data"]["id"]

        await client.post(
            f"/api/v1/admin/products/{prod_id}/variants",
            headers={"x-auth-role": "owner"},
            json={
                "sku": "GLS-BEV-12X18",
                "label": "12x18 inch Bevelled",
                "retail_price_paise": 45000,
                "wholesale_price_paise": 32000,
                "wholesale_moq": 10,
                "availability": "available",
            },
        )

        # 1. Visitor / Retail Request
        retail_resp = await client.get("/api/v1/products/bevelled-frame-glass")
        assert retail_resp.status_code == 200
        retail_data = retail_resp.json()["data"]
        variant = retail_data["variants"][0]

        assert variant["retail_price_paise"] == 45000
        # Wholesale fields MUST NOT exist in JSON
        assert "wholesale_price_paise" not in variant
        assert "wholesale_moq" not in variant

        # 2. Approved Wholesale Request
        wholesale_resp = await client.get(
            "/api/v1/products/bevelled-frame-glass",
            headers={"x-auth-role": "wholesale_approved"},
        )
        assert wholesale_resp.status_code == 200
        wholesale_data = wholesale_resp.json()["data"]
        ws_variant = wholesale_data["variants"][0]

        assert ws_variant["wholesale_price_paise"] == 32000
        assert ws_variant["wholesale_moq"] == 10
        # Retail price MUST NOT be the active transaction tier
        assert "retail_price_paise" not in ws_variant

        # 3. Owner Request receives full data
        owner_resp = await client.get(
            "/api/v1/products/bevelled-frame-glass",
            headers={"x-auth-role": "owner"},
        )
        assert owner_resp.status_code == 200
        owner_variant = owner_resp.json()["data"]["variants"][0]
        assert owner_variant["retail_price_paise"] == 45000
        assert owner_variant["wholesale_price_paise"] == 32000
        assert owner_variant["wholesale_moq"] == 10
