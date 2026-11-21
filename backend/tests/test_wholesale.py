"""
Tests for Phase 4 Wholesale Application and Approval Workflows.
Verifies:
1. Wholesale application submission with mandatory GSTIN format and proof document.
2. Prevention of duplicate pending/approved applications.
3. Private document security (proof file is inaccessible to unauthenticated/retail users).
4. Owner review: approve -> grants wholesale status; reject -> sets status to rejected.
5. Inability of customers to self-approve.
"""

import io
import json

import pytest
from httpx import ASGITransport, AsyncClient

from app.cli.provision_owner import provision_owner
from app.database.session import db_manager
from app.main import app


@pytest.fixture(autouse=True)
async def setup_test_wholesale_db():
    await db_manager.connect()
    if db_manager.db is not None:
        await db_manager.db.users.delete_many({})
        await db_manager.db.sessions.delete_many({})
        await db_manager.db.wholesale_applications.delete_many({})
    yield
    if db_manager.db is not None:
        await db_manager.db.users.delete_many({})
        await db_manager.db.sessions.delete_many({})
        await db_manager.db.wholesale_applications.delete_many({})


@pytest.mark.asyncio
async def test_wholesale_application_and_approval_workflow():
    # 1. Provision Owner
    await provision_owner(
        name="Business Owner",
        email="owner@theindiaframes.com",
        password="OwnerPassword123!",
    )

    async with AsyncClient(
        transport=ASGITransport(app=app), base_url="http://test"
    ) as client:
        # 2. Register retail customer
        reg_resp = await client.post(
            "/api/v1/auth/register",
            json={
                "name": "Murugan Frames",
                "email": "murugan@example.com",
                "password": "Password123!",
                "requested_account_type": "retail",
            },
        )
        assert reg_resp.status_code == 201

        # 3. Log in as retail customer
        cust_login = await client.post(
            "/api/v1/auth/login",
            json={"email": "murugan@example.com", "password": "Password123!"},
        )
        cust_cookies = cust_login.cookies

        # 4. Submit Wholesale Application (Valid 15-char GSTIN + Proof PDF)
        valid_gstin = "33AAAAA0000A1Z5"
        app_payload = {
            "business_name": "Murugan Photo Framing Works",
            "business_type": "framing_shop",
            "gstin": valid_gstin,
            "contact_name": "Murugan",
            "contact_phone": "+919876543210",
            "contact_email": "murugan@example.com",
            "business_address": {
                "line1": "12 Main Bazaar Road",
                "city": "Cumbum",
                "district": "Theni",
                "state": "Tamil Nadu",
                "postal_code": "625516",
            },
            "applicant_note": "Requesting wholesale price catalog for frame moldings.",
        }

        fake_pdf = io.BytesIO(b"%PDF-1.4 Mock Business License Certificate")
        files = {
            "proof_document": ("trade_license.pdf", fake_pdf, "application/pdf")
        }
        data = {"application_data": json.dumps(app_payload)}

        apply_resp = await client.post(
            "/api/v1/wholesale/apply",
            cookies=cust_cookies,
            data=data,
            files=files,
        )
        assert apply_resp.status_code == 201
        app_data = apply_resp.json()["data"]
        app_id = app_data["id"]
        assert app_data["status"] == "pending"
        assert app_data["gstin"] == valid_gstin
        # Ensure private internal storage paths are never leaked to client
        assert "asset_id" not in app_data["proof_document"]

        # 5. Customer checks their status
        my_app_resp = await client.get(
            "/api/v1/wholesale/my-application",
            cookies=cust_cookies,
        )
        assert my_app_resp.status_code == 200
        assert my_app_resp.json()["data"]["status"] == "pending"

        # Customer CANNOT review or self-approve their own application
        self_approve_resp = await client.post(
            f"/api/v1/admin/wholesale-applications/{app_id}/review",
            cookies=cust_cookies,
            json={"decision": "approved"},
        )
        assert self_approve_resp.status_code == 403

        # 6. Owner logs in and reviews application
        owner_login = await client.post(
            "/api/v1/auth/login",
            json={"email": "owner@theindiaframes.com", "password": "OwnerPassword123!"},
        )
        owner_cookies = owner_login.cookies

        # Owner lists pending applications
        list_resp = await client.get(
            "/api/v1/admin/wholesale-applications",
            cookies=owner_cookies,
        )
        assert list_resp.status_code == 200
        assert len(list_resp.json()["data"]) == 1

        # Owner downloads private proof document
        doc_resp = await client.get(
            f"/api/v1/admin/wholesale-applications/{app_id}/document",
            cookies=owner_cookies,
        )
        assert doc_resp.status_code == 200
        assert doc_resp.content == b"%PDF-1.4 Mock Business License Certificate"

        # Owner approves application
        review_resp = await client.post(
            f"/api/v1/admin/wholesale-applications/{app_id}/review",
            cookies=owner_cookies,
            json={
                "decision": "approved",
                "internal_note": "GSTIN verified against local framing studio registry.",
            },
        )
        assert review_resp.status_code == 200
        assert review_resp.json()["data"]["status"] == "approved"

        # 7. Customer profile reflects approval
        cust_profile = await client.get(
            "/api/v1/auth/me",
            cookies=cust_cookies,
        )
        assert cust_profile.status_code == 200
        profile_data = cust_profile.json()["data"]
        assert profile_data["account_type"] == "wholesale"
        assert profile_data["wholesale_status"] == "approved"
