"""
Wholesale Application and Owner Review Endpoints.
Mounted under /api/v1/wholesale and /api/v1/admin/wholesale-applications.
"""

import json
from typing import List, Optional

from fastapi import APIRouter, Depends, File, Form, HTTPException, Query, UploadFile, status
from fastapi.responses import Response
from pymongo.asynchronous.database import AsyncDatabase

from app.api.v1.auth import get_current_user
from app.core.responses import SuccessResponse
from app.database.session import get_db
from app.schemas.auth import UserResponse
from app.schemas.wholesale import (
    AdminWholesaleApplicationResponse,
    CustomerWholesaleApplicationResponse,
    WholesaleApplicationCreate,
    WholesaleReviewRequest,
)
from app.services.wholesale import WholesaleService

router = APIRouter(tags=["Wholesale Applications"])


def get_wholesale_service(db: Optional[AsyncDatabase] = Depends(get_db)) -> WholesaleService:
    if db is None:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Database service not available.",
        )
    return WholesaleService(db)


def require_owner(current_user: UserResponse = Depends(get_current_user)) -> UserResponse:
    if current_user.account_type != "owner":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Owner privileges required.",
        )
    return current_user


# --- CUSTOMER ENDPOINTS ---
@router.post(
    "/wholesale/apply",
    response_model=SuccessResponse[CustomerWholesaleApplicationResponse],
    status_code=status.HTTP_201_CREATED,
)
async def submit_wholesale_application(
    application_data: str = Form(..., description="JSON stringified WholesaleApplicationCreate"),
    proof_document: UploadFile = File(..., description="Trade license, GST certificate or business proof"),
    current_user: UserResponse = Depends(get_current_user),
    service: WholesaleService = Depends(get_wholesale_service),
):
    try:
        parsed_data = json.loads(application_data)
        payload = WholesaleApplicationCreate(**parsed_data)
    except Exception as exc:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail=f"Invalid application JSON payload: {str(exc)}",
        )

    result = await service.submit_application(
        user_id=current_user.id,
        payload=payload,
        proof_file=proof_document,
    )
    return SuccessResponse(data=result)


@router.get(
    "/wholesale/my-application",
    response_model=SuccessResponse[Optional[CustomerWholesaleApplicationResponse]],
)
async def get_my_wholesale_application(
    current_user: UserResponse = Depends(get_current_user),
    service: WholesaleService = Depends(get_wholesale_service),
):
    result = await service.get_user_application(current_user.id)
    return SuccessResponse(data=result)


# --- OWNER/ADMIN REVIEW ENDPOINTS ---
@router.get(
    "/admin/wholesale-applications",
    response_model=SuccessResponse[List[AdminWholesaleApplicationResponse]],
)
async def list_wholesale_applications(
    status_filter: Optional[str] = Query(None, alias="status"),
    owner: UserResponse = Depends(require_owner),
    service: WholesaleService = Depends(get_wholesale_service),
):
    results = await service.list_admin_applications(status_filter=status_filter)
    return SuccessResponse(data=results)


@router.post(
    "/admin/wholesale-applications/{application_id}/review",
    response_model=SuccessResponse[AdminWholesaleApplicationResponse],
)
async def review_wholesale_application(
    application_id: str,
    payload: WholesaleReviewRequest,
    owner: UserResponse = Depends(require_owner),
    service: WholesaleService = Depends(get_wholesale_service),
):
    result = await service.review_application(
        application_id=application_id,
        reviewer_id=owner.id,
        payload=payload,
    )
    return SuccessResponse(data=result)


@router.get("/admin/wholesale-applications/{application_id}/document")
async def download_private_proof_document(
    application_id: str,
    owner: UserResponse = Depends(require_owner),
    service: WholesaleService = Depends(get_wholesale_service),
):
    """Owner-only authenticated access to private customer proof document."""
    file_bytes, filename, mime_type = await service.get_proof_file_bytes(application_id)
    return Response(
        content=file_bytes,
        media_type=mime_type,
        headers={
            "Content-Disposition": f'attachment; filename="{filename}"',
            "Cache-Control": "private, no-store",
        },
    )
