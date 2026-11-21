"""
Owner Billing REST API Router.
Mounted under /api/v1/billing.
Shares the exact same owner session authentication (`require_owner`) as /api/v1/admin.
"""

from datetime import datetime
from typing import List, Optional

from fastapi import APIRouter, Depends, HTTPException, Query, Request, status
from pymongo.asynchronous.database import AsyncDatabase

from app.api.v1.admin import require_owner
from app.core.responses import SuccessResponse
from app.database.session import get_db
from app.schemas.auth import UserResponse
from app.schemas.billing import (
    BillingRecordDetail,
    BillingRecordSummary,
    BillingSummaryResponse,
    OfflineSaleCreateRequest,
    OfflineSaleUpdateRequest,
    PaymentCreateRequest,
    PaymentEntryResponse,
    PaymentMethod,
    PaymentRecordResult,
    PaymentStatus,
    ReconciliationReport,
    SourceType,
)
from app.services.billing import BillingService

router = APIRouter(prefix="/billing", tags=["Owner Billing"])


def get_billing_service(db: Optional[AsyncDatabase] = Depends(get_db)) -> BillingService:
    if db is None:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Database service not available.",
        )
    return BillingService(db)


@router.get("/records", response_model=SuccessResponse[List[BillingRecordSummary]])
async def list_billing_records(
    source_type: Optional[SourceType] = Query(None),
    payment_status: Optional[PaymentStatus] = Query(None),
    q: Optional[str] = Query(None),
    start_date: Optional[datetime] = Query(None),
    end_date: Optional[datetime] = Query(None),
    limit: int = Query(50, ge=1, le=100),
    skip: int = Query(0, ge=0),
    owner: UserResponse = Depends(require_owner),
    service: BillingService = Depends(get_billing_service),
):
    """Unified list of online enquiries and offline sales without duplicating enquiries."""
    results = await service.list_records(
        source_type=source_type,
        payment_status=payment_status,
        q=q,
        start_date=start_date,
        end_date=end_date,
        limit=limit,
        skip=skip,
    )
    return SuccessResponse(data=results)


@router.get("/summary", response_model=SuccessResponse[BillingSummaryResponse])
async def get_billing_summary(
    source_type: Optional[SourceType] = Query(None),
    start_date: Optional[datetime] = Query(None),
    end_date: Optional[datetime] = Query(None),
    owner: UserResponse = Depends(require_owner),
    service: BillingService = Depends(get_billing_service),
):
    """Totals, received, outstanding, and counts across online enquiries and offline sales."""
    data = await service.get_summary(
        source_type=source_type,
        start_date=start_date,
        end_date=end_date,
    )
    return SuccessResponse(data=data)


@router.get(
    "/records/{source_type}/{source_id}",
    response_model=SuccessResponse[BillingRecordDetail],
)
async def get_billing_record_detail(
    source_type: SourceType,
    source_id: str,
    owner: UserResponse = Depends(require_owner),
    service: BillingService = Depends(get_billing_service),
):
    """Unified billing detail view for a single online enquiry or offline sale."""
    result = await service.get_record_detail(
        source_type=source_type, source_id=source_id
    )
    return SuccessResponse(data=result)


@router.get(
    "/records/{source_type}/{source_id}/payments",
    response_model=SuccessResponse[List[PaymentEntryResponse]],
)
async def list_billing_record_payments(
    source_type: SourceType,
    source_id: str,
    owner: UserResponse = Depends(require_owner),
    service: BillingService = Depends(get_billing_service),
):
    """List immutable payment ledger entries for a specific enquiry or offline sale."""
    results = await service.list_record_payments(
        source_type=source_type, source_id=source_id
    )
    return SuccessResponse(data=results)


@router.get("/payments", response_model=SuccessResponse[List[PaymentEntryResponse]])
async def list_payments_ledger(
    source_type: Optional[SourceType] = Query(None),
    method: Optional[PaymentMethod] = Query(None),
    start_date: Optional[datetime] = Query(None),
    end_date: Optional[datetime] = Query(None),
    limit: int = Query(50, ge=1, le=100),
    skip: int = Query(0, ge=0),
    owner: UserResponse = Depends(require_owner),
    service: BillingService = Depends(get_billing_service),
):
    """Search and filter the immutable payments ledger across all records."""
    results = await service.list_payments(
        source_type=source_type,
        method=method,
        start_date=start_date,
        end_date=end_date,
        limit=limit,
        skip=skip,
    )
    return SuccessResponse(data=results)


# --- Phase 9: Offline Sales, Payments, Reversals & Reconciliation ---


@router.post(
    "/offline-sales",
    response_model=SuccessResponse[BillingRecordDetail],
    status_code=status.HTTP_201_CREATED,
)
async def create_offline_sale(
    payload: OfflineSaleCreateRequest,
    request: Request,
    owner: UserResponse = Depends(require_owner),
    service: BillingService = Depends(get_billing_service),
):
    """Create a shop-counter offline sale with multi-line items and audited manual pricing."""
    request_id = getattr(request.state, "request_id", None)
    result = await service.create_offline_sale(
        owner_id=owner.id, payload=payload, request_id=request_id
    )
    return SuccessResponse(data=result)


@router.patch(
    "/offline-sales/{sale_id}",
    response_model=SuccessResponse[BillingRecordDetail],
)
async def update_offline_sale(
    sale_id: str,
    payload: OfflineSaleUpdateRequest,
    request: Request,
    owner: UserResponse = Depends(require_owner),
    service: BillingService = Depends(get_billing_service),
):
    """Adjust editable offline sale fields or void a sale subject to payment safeguards."""
    request_id = getattr(request.state, "request_id", None)
    result = await service.update_offline_sale(
        sale_id=sale_id, owner_id=owner.id, payload=payload, request_id=request_id
    )
    return SuccessResponse(data=result)


@router.post(
    "/records/{source_type}/{source_id}/payments",
    response_model=SuccessResponse[PaymentRecordResult],
    status_code=status.HTTP_201_CREATED,
)
async def record_billing_payment(
    source_type: SourceType,
    source_id: str,
    payload: PaymentCreateRequest,
    request: Request,
    owner: UserResponse = Depends(require_owner),
    service: BillingService = Depends(get_billing_service),
):
    """Record an immutable payment receipt or reversal and update source payment summary."""
    request_id = getattr(request.state, "request_id", None)
    result = await service.record_payment(
        source_type=source_type,
        source_id=source_id,
        owner_id=owner.id,
        payload=payload,
        request_id=request_id,
    )
    return SuccessResponse(data=result)


@router.get("/reconciliation", response_model=SuccessResponse[ReconciliationReport])
async def check_billing_reconciliation(
    request: Request,
    owner: UserResponse = Depends(require_owner),
    service: BillingService = Depends(get_billing_service),
):
    """Compare denormalized payment summaries against the immutable payments ledger."""
    request_id = getattr(request.state, "request_id", None)
    report = await service.reconcile_payments(
        owner_id=owner.id, repair=False, request_id=request_id
    )
    return SuccessResponse(data=report)


@router.post(
    "/reconciliation/repair", response_model=SuccessResponse[ReconciliationReport]
)
async def repair_billing_reconciliation(
    request: Request,
    owner: UserResponse = Depends(require_owner),
    service: BillingService = Depends(get_billing_service),
):
    """Recompute and repair any drifted payment summaries from the immutable ledger."""
    request_id = getattr(request.state, "request_id", None)
    report = await service.reconcile_payments(
        owner_id=owner.id, repair=True, request_id=request_id
    )
    return SuccessResponse(data=report)
