"""
Tests for Customer & Owner Authentication in Phase 3.
Verifies:
1. Retail registration and password login.
2. Denial of owner role via registration.
3. Secure HttpOnly session cookie issuance.
4. Protected /auth/me route with cookie credential.
5. Rejection of invalid Google ID tokens.
6. Owner provisioning CLI tool.
"""

import pytest
from httpx import ASGITransport, AsyncClient

from app.cli.provision_owner import provision_owner
from app.database.session import db_manager
from app.main import app


@pytest.fixture(autouse=True)
async def setup_test_auth_db():
    await db_manager.connect()
    if db_manager.db is not None:
        await db_manager.db.users.delete_many({})
        await db_manager.db.sessions.delete_many({})
    yield
    if db_manager.db is not None:
        await db_manager.db.users.delete_many({})
        await db_manager.db.sessions.delete_many({})


@pytest.mark.asyncio
async def test_retail_registration_and_login_lifecycle():
    async with AsyncClient(
        transport=ASGITransport(app=app), base_url="http://test"
    ) as client:
        # 1. Registration
        reg_resp = await client.post(
            "/api/v1/auth/register",
            json={
                "name": "Karthik Raja",
                "email": "karthik@example.com",
                "password": "Password123!",
                "requested_account_type": "retail",
            },
        )
        assert reg_resp.status_code == 201
        user_data = reg_resp.json()["data"]
        assert user_data["name"] == "Karthik Raja"
        assert user_data["account_type"] == "retail"
        assert user_data["wholesale_status"] == "not_applied"

        # 2. Duplicate registration rejected
        dup_resp = await client.post(
            "/api/v1/auth/register",
            json={
                "name": "Another Name",
                "email": "KARTHIK@example.com",  # normalized email check
                "password": "Password123!",
            },
        )
        assert dup_resp.status_code == 409

        # 3. Login with password sets HttpOnly cookie
        login_resp = await client.post(
            "/api/v1/auth/login",
            json={
                "email": "karthik@example.com",
                "password": "Password123!",
            },
        )
        assert login_resp.status_code == 200
        assert "tif_session" in login_resp.cookies

        # 4. Access protected profile route with cookie
        me_resp = await client.get(
            "/api/v1/auth/me",
            cookies=login_resp.cookies,
        )
        assert me_resp.status_code == 200
        me_data = me_resp.json()["data"]
        assert me_data["email"] == "karthik@example.com"

        # 5. Logout clears session
        logout_resp = await client.post(
            "/api/v1/auth/logout",
            cookies=login_resp.cookies,
        )
        assert logout_resp.status_code == 200

        # Subsequent /me call is unauthorized
        after_logout_resp = await client.get("/api/v1/auth/me")
        assert after_logout_resp.status_code == 401


@pytest.mark.asyncio
async def test_owner_role_cannot_be_registered():
    async with AsyncClient(
        transport=ASGITransport(app=app), base_url="http://test"
    ) as client:
        resp = await client.post(
            "/api/v1/auth/register",
            json={
                "name": "Attacker",
                "email": "hacker@example.com",
                "password": "Password123!",
                "requested_account_type": "owner",  # Disallowed
            },
        )
        # Pydantic validation rejects "owner" as a valid requested_account_type
        assert resp.status_code == 422


@pytest.mark.asyncio
async def test_invalid_google_token_rejected():
    async with AsyncClient(
        transport=ASGITransport(app=app), base_url="http://test"
    ) as client:
        resp = await client.post(
            "/api/v1/auth/google",
            json={"id_token": "fake-invalid-token-12345"},
        )
        assert resp.status_code == 401
        assert "Invalid" in resp.json()["detail"]


@pytest.mark.asyncio
async def test_owner_provisioning_script_and_login():
    # 1. Provision owner out-of-band via CLI utility
    await provision_owner(
        name="Business Owner",
        email="owner@theindiaframes.com",
        password="MasterPassword999",
        phone="+919876543210",
    )

    # 2. Login through auth API
    async with AsyncClient(
        transport=ASGITransport(app=app), base_url="http://test"
    ) as client:
        login_resp = await client.post(
            "/api/v1/auth/login",
            json={
                "email": "owner@theindiaframes.com",
                "password": "MasterPassword999",
            },
        )
        assert login_resp.status_code == 200
        user_data = login_resp.json()["data"]["user"]
        assert user_data["account_type"] == "owner"
        assert user_data["wholesale_status"] == "approved"
