"""
Owner Admin Service Layer for Enquiry Processing, Quotes, and Dashboard Metrics.
"""

from datetime import datetime, timezone
from typing import List, Optional

from bson import ObjectId
from fastapi import HTTPException, status
from pymongo.asynchronous.database import AsyncDatabase

from app.repositories.audit import AuditRepository
from app.repositories.enquiry import EnquiryRepository
from app.repositories.users import UserRepository
from app.schemas.admin import AdminDashboardSummary, EnquiryQuoteUpdateRequest, EnquiryStatusUpdateRequest
from app.schemas.auth import UserResponse
from app.schemas.enquiry import EnquiryResponse
from app.services.enquiry import EnquiryService


class AdminService:
    def __init__(self, db: AsyncDatabase):
        self.db = db
        self.enquiry_repo = EnquiryRepository(db)
        self.user_repo = UserRepository(db)
        self.enquiry_service = EnquiryService(db)
        self.audit_repo = AuditRepository(db)

    async def get_dashboard_summary(self) -> AdminDashboardSummary:
        total_enquiries = await self.db.enquiries.count_documents({})
        pending_enquiries = await self.db.enquiries.count_documents({"enquiry_status": "pending"})
        total_products = await self.db.products.count_documents({})
        total_wholesale_pending = await self.db.wholesale_applications.count_documents({"status": "pending"})
        total_customers = await self.db.users.count_documents({"account_type": {"$ne": "owner"}})

        recent_docs = await self.enquiry_repo.list_all(limit=5)
        recent_enquiries = [
            EnquiryResponse(**d, whatsapp_url=self.enquiry_service._build_whatsapp_url(d))
            for d in recent_docs
        ]

        return AdminDashboardSummary(
            total_enquiries=total_enquiries,
            pending_enquiries=pending_enquiries,
            total_products=total_products,
            total_wholesale_pending=total_wholesale_pending,
            total_customers=total_customers,
            recent_enquiries=recent_enquiries,
        )

    async def list_enquiries(
        self, status_filter: Optional[str] = None, limit: int = 50, skip: int = 0
    ) -> List[EnquiryResponse]:
        docs = await self.enquiry_repo.list_all(status=status_filter, limit=limit, skip=skip)
        return [
            EnquiryResponse(**d, whatsapp_url=self.enquiry_service._build_whatsapp_url(d))
            for d in docs
        ]

    async def get_enquiry_detail(self, enquiry_id: str) -> EnquiryResponse:
        doc = await self.enquiry_repo.get_by_id(enquiry_id)
        if not doc:
            doc = await self.enquiry_repo.get_by_human_id(enquiry_id)
        if not doc:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND, detail="Enquiry not found."
            )
        return EnquiryResponse(
            **doc, whatsapp_url=self.enquiry_service._build_whatsapp_url(doc)
        )

    async def update_enquiry_status(
        self,
        enquiry_id: str,
        owner_id: str,
        payload: EnquiryStatusUpdateRequest,
    ) -> EnquiryResponse:
        doc = await self.enquiry_repo.get_by_id(enquiry_id)
        if not doc:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Enquiry not found.")

        now = datetime.now(timezone.utc)
        history_entry = {
            "status": payload.status,
            "changed_by": owner_id,
            "changed_at": now,
            "note": payload.note,
        }

        await self.db.enquiries.update_one(
            {"_id": ObjectId(enquiry_id)},
            {
                "$set": {
                    "enquiry_status": payload.status,
                    "updated_at": now,
                },
                "$push": {"status_history": history_entry},
            },
        )

        updated_doc = await self.enquiry_repo.get_by_id(enquiry_id)
        return EnquiryResponse(
            **updated_doc,
            whatsapp_url=self.enquiry_service._build_whatsapp_url(updated_doc),
        )

    async def update_enquiry_quote(
        self,
        enquiry_id: str,
        owner_id: str,
        payload: EnquiryQuoteUpdateRequest,
    ) -> EnquiryResponse:
        doc = await self.enquiry_repo.get_by_id(enquiry_id)
        if not doc:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Enquiry not found.")

        now = datetime.now(timezone.utc)
        received_total = doc.get("payment_summary", {}).get("received_total_paise", 0)
        if payload.quoted_total_paise < received_total:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=(
                    "Quoted total cannot be reduced below net payments already received. "
                    "Reverse excess payments first."
                ),
            )

        new_outstanding = max(0, payload.quoted_total_paise - received_total)

        payment_status = "unpaid"
        if payload.quoted_total_paise == 0 or received_total >= payload.quoted_total_paise:
            payment_status = "paid"
        elif received_total > 0:
            payment_status = "partial"

        rupees = payload.quoted_total_paise / 100
        audit_note = f"Quote updated to ₹{rupees:.2f}. {payload.note or ''}".strip()
        await self.db.enquiries.update_one(
            {"_id": ObjectId(enquiry_id)},
            {
                "$set": {
                    "quoted_total_paise": payload.quoted_total_paise,
                    "payment_summary.outstanding_paise": new_outstanding,
                    "payment_summary.payment_status": payment_status,
                    "updated_at": now,
                },
                "$push": {
                    "status_history": {
                        "status": doc.get("enquiry_status", "pending"),
                        "changed_by": owner_id,
                        "changed_at": now,
                        "note": audit_note,
                    }
                },
            },
        )
        await self.audit_repo.log(
            actor_user_id=owner_id,
            action="enquiry.quote.updated",
            entity_type="enquiry",
            entity_id=enquiry_id,
            before={
                "quoted_total_paise": doc.get("quoted_total_paise"),
                "outstanding_paise": doc.get("payment_summary", {}).get("outstanding_paise"),
            },
            after={
                "quoted_total_paise": payload.quoted_total_paise,
                "outstanding_paise": new_outstanding,
                "payment_status": payment_status,
            },
        )

        updated_doc = await self.enquiry_repo.get_by_id(enquiry_id)
        return EnquiryResponse(
            **updated_doc,
            whatsapp_url=self.enquiry_service._build_whatsapp_url(updated_doc),
        )

    async def list_customers(self, limit: int = 50, skip: int = 0) -> List[UserResponse]:
        cursor = (
            self.db.users.find({"account_type": {"$ne": "owner"}})
            .sort("created_at", -1)
            .skip(skip)
            .limit(limit)
        )
        users = []
        async for u in cursor:
            users.append(
                UserResponse(
                    id=str(u["_id"]),
                    name=u["name"],
                    email=u["email"],
                    phone=u.get("phone"),
                    account_type=u.get("account_type", "retail"),
                    account_status=u.get("account_status", "active"),
                    wholesale_status=u.get("wholesale_status", "not_applied"),
                    has_password=bool(u.get("password_hash")),
                    is_google_linked=bool(u.get("google_sub")),
                    created_at=u["created_at"],
                    last_login_at=u.get("last_login_at"),
                )
            )
        return users

    async def list_audit_logs(
        self,
        entity_type: Optional[str] = None,
        action: Optional[str] = None,
        limit: int = 50,
        skip: int = 0,
    ) -> List[dict]:
        query: dict = {}
        if entity_type:
            query["entity_type"] = entity_type
        if action:
            query["action"] = action
        cursor = (
            self.db.audit_logs.find(query)
            .sort("created_at", -1)
            .skip(skip)
            .limit(limit)
        )
        rows = []
        async for doc in cursor:
            rows.append(
                {
                    "id": str(doc["_id"]),
                    "actor_user_id": str(doc.get("actor_user_id", "")),
                    "action": doc.get("action", ""),
                    "entity_type": doc.get("entity_type", ""),
                    "entity_id": str(doc.get("entity_id", "")),
                    "before": doc.get("before", {}),
                    "after": doc.get("after", {}),
                    "request_id": doc.get("request_id"),
                    "created_at": doc["created_at"].isoformat()
                    if hasattr(doc.get("created_at"), "isoformat")
                    else doc.get("created_at"),
                }
            )
        return rows
