"""
Owner Admin REST API Router.
Mounted under /api/v1/admin.
Enforces owner authentication across all operations.
"""

from typing import List, Optional

from fastapi import APIRouter, Depends, HTTPException, Query, status
from pymongo.asynchronous.database import AsyncDatabase

from app.api.v1.auth import get_current_user
from app.core.responses import SuccessResponse
from app.database.session import get_db
from app.schemas.admin import AdminDashboardSummary, EnquiryQuoteUpdateRequest, EnquiryStatusUpdateRequest
from app.schemas.auth import UserResponse
from app.schemas.enquiry import EnquiryResponse
from app.services.admin import AdminService

router = APIRouter(prefix="/admin", tags=["Owner Admin"])


def require_owner(current_user: UserResponse = Depends(get_current_user)) -> UserResponse:
    if current_user.account_type != "owner":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Owner privileges required.",
        )
    return current_user


def get_admin_service(db: Optional[AsyncDatabase] = Depends(get_db)) -> AdminService:
    if db is None:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Database service not available.",
        )
    return AdminService(db)


@router.get("/dashboard", response_model=SuccessResponse[AdminDashboardSummary])
async def get_dashboard(
    owner: UserResponse = Depends(require_owner),
    service: AdminService = Depends(get_admin_service),
):
    """Retrieve owner KPI statistics and recent enquiry summary."""
    data = await service.get_dashboard_summary()
    return SuccessResponse(data=data)


@router.get("/enquiries", response_model=SuccessResponse[List[EnquiryResponse]])
async def list_enquiries(
    status_filter: Optional[str] = Query(None, alias="status"),
    limit: int = Query(50, ge=1, le=100),
    skip: int = Query(0, ge=0),
    owner: UserResponse = Depends(require_owner),
    service: AdminService = Depends(get_admin_service),
):
    """List online customer enquiries with status filtering."""
    results = await service.list_enquiries(status_filter=status_filter, limit=limit, skip=skip)
    return SuccessResponse(data=results)


@router.get("/enquiries/{enquiry_id}", response_model=SuccessResponse[EnquiryResponse])
async def get_enquiry_detail(
    enquiry_id: str,
    owner: UserResponse = Depends(require_owner),
    service: AdminService = Depends(get_admin_service),
):
    """Retrieve a single enquiry with snapshots and status audit trail."""
    result = await service.get_enquiry_detail(enquiry_id=enquiry_id)
    return SuccessResponse(data=result)


@router.patch("/enquiries/{enquiry_id}/status", response_model=SuccessResponse[EnquiryResponse])
async def update_enquiry_status(
    enquiry_id: str,
    payload: EnquiryStatusUpdateRequest,
    owner: UserResponse = Depends(require_owner),
    service: AdminService = Depends(get_admin_service),
):
    """Transition enquiry state with recorded audit history."""
    result = await service.update_enquiry_status(
        enquiry_id=enquiry_id,
        owner_id=owner.id,
        payload=payload,
    )
    return SuccessResponse(data=result)


@router.patch("/enquiries/{enquiry_id}/quote", response_model=SuccessResponse[EnquiryResponse])
async def update_enquiry_quote(
    enquiry_id: str,
    payload: EnquiryQuoteUpdateRequest,
    owner: UserResponse = Depends(require_owner),
    service: AdminService = Depends(get_admin_service),
):
    """Update owner final quoted total and recalculate payable basis."""
    result = await service.update_enquiry_quote(
        enquiry_id=enquiry_id,
        owner_id=owner.id,
        payload=payload,
    )
    return SuccessResponse(data=result)


@router.get("/customers", response_model=SuccessResponse[List[UserResponse]])
async def list_customers(
    limit: int = Query(50, ge=1, le=100),
    skip: int = Query(0, ge=0),
    owner: UserResponse = Depends(require_owner),
    service: AdminService = Depends(get_admin_service),
):
    """List registered customers with wholesale status."""
    results = await service.list_customers(limit=limit, skip=skip)
    return SuccessResponse(data=results)


@router.get("/audit-logs", response_model=SuccessResponse[List[dict]])
async def list_audit_logs(
    entity_type: Optional[str] = Query(None),
    action: Optional[str] = Query(None),
    limit: int = Query(50, ge=1, le=200),
    skip: int = Query(0, ge=0),
    owner: UserResponse = Depends(require_owner),
    service: AdminService = Depends(get_admin_service),
):
    """List recent owner audit log events."""
    results = await service.list_audit_logs(
        entity_type=entity_type, action=action, limit=limit, skip=skip
    )
    return SuccessResponse(data=results)
