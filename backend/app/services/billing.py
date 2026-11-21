"""
Owner Billing Service Layer.
Provides unified online enquiry + offline sale billing views, summaries, and payment ledger reads.
"""

from datetime import datetime
from typing import List, Optional

from fastapi import HTTPException, status
from pymongo.asynchronous.database import AsyncDatabase

from app.repositories.billing import BillingRepository
from app.schemas.billing import (
    BillingRecordDetail,
    BillingRecordSummary,
    BillingSummaryResponse,
    PaymentEntryResponse,
)


class BillingService:
    def __init__(self, db: AsyncDatabase):
        self.repo = BillingRepository(db)

    async def list_records(
        self,
        source_type: Optional[str] = None,
        payment_status: Optional[str] = None,
        q: Optional[str] = None,
        start_date: Optional[datetime] = None,
        end_date: Optional[datetime] = None,
        limit: int = 50,
        skip: int = 0,
    ) -> List[BillingRecordSummary]:
        rows = await self.repo.list_unified_records(
            source_type=source_type,
            payment_status=payment_status,
            q=q,
            start_date=start_date,
            end_date=end_date,
            limit=limit,
            skip=skip,
        )
        return [BillingRecordSummary(**r) for r in rows]

    async def get_summary(
        self,
        source_type: Optional[str] = None,
        start_date: Optional[datetime] = None,
        end_date: Optional[datetime] = None,
    ) -> BillingSummaryResponse:
        data = await self.repo.get_billing_summary(
            source_type=source_type,
            start_date=start_date,
            end_date=end_date,
        )
        return BillingSummaryResponse(**data)

    async def get_record_detail(
        self, source_type: str, source_id: str
    ) -> BillingRecordDetail:
        record = await self.repo.get_source_record(source_type, source_id)
        if not record:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Billing record not found.",
            )
        payments = await self.repo.list_payments_for_source(
            source_type=record["source_type"], source_id=record["source_id"]
        )
        return BillingRecordDetail(
            **record,
            payments=[PaymentEntryResponse(**p) for p in payments],
        )

    async def list_record_payments(
        self, source_type: str, source_id: str
    ) -> List[PaymentEntryResponse]:
        record = await self.repo.get_source_record(source_type, source_id)
        if not record:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Billing record not found.",
            )
        payments = await self.repo.list_payments_for_source(
            source_type=record["source_type"], source_id=record["source_id"]
        )
        return [PaymentEntryResponse(**p) for p in payments]

    async def list_payments(
        self,
        source_type: Optional[str] = None,
        method: Optional[str] = None,
        start_date: Optional[datetime] = None,
        end_date: Optional[datetime] = None,
        limit: int = 50,
        skip: int = 0,
    ) -> List[PaymentEntryResponse]:
        rows = await self.repo.list_payments(
            source_type=source_type,
            method=method,
            start_date=start_date,
            end_date=end_date,
            limit=limit,
            skip=skip,
        )
        return [PaymentEntryResponse(**p) for p in rows]
