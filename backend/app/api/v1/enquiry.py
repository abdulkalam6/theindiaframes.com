"""
Enquiry REST API Router.
Mounted under /api/v1/enquiries.
"""

from typing import List, Optional

from fastapi import APIRouter, Depends, HTTPException, status
from pymongo.asynchronous.database import AsyncDatabase

from app.api.v1.auth import get_current_user
from app.core.responses import SuccessResponse
from app.database.session import get_db
from app.schemas.auth import UserResponse
from app.schemas.enquiry import EnquiryCreateRequest, EnquiryResponse
from app.services.enquiry import EnquiryService

router = APIRouter(prefix="/enquiries", tags=["Enquiries"])


def get_enquiry_service(db: Optional[AsyncDatabase] = Depends(get_db)) -> EnquiryService:
    if db is None:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Database service not available.",
        )
    return EnquiryService(db)


@router.post("", response_model=SuccessResponse[EnquiryResponse], status_code=status.HTTP_201_CREATED)
async def create_enquiry(
    payload: EnquiryCreateRequest,
    current_user: UserResponse = Depends(get_current_user),
    service: EnquiryService = Depends(get_enquiry_service),
):
    """
    Saves an authenticated enquiry to MongoDB with immutable snapshots,
    validates tier prices and MOQs, and returns the pre-filled WhatsApp click-to-chat URL.
    """
    result = await service.create_enquiry(user_id=current_user.id, payload=payload)
    return SuccessResponse(data=result)


@router.get("", response_model=SuccessResponse[List[EnquiryResponse]])
async def list_my_enquiries(
    current_user: UserResponse = Depends(get_current_user),
    service: EnquiryService = Depends(get_enquiry_service),
):
    """List historical enquiries submitted by the current authenticated customer."""
    results = await service.list_customer_enquiries(user_id=current_user.id)
    return SuccessResponse(data=results)


@router.get("/{enquiry_id}", response_model=SuccessResponse[EnquiryResponse])
async def get_enquiry_detail(
    enquiry_id: str,
    current_user: UserResponse = Depends(get_current_user),
    service: EnquiryService = Depends(get_enquiry_service),
):
    """Retrieve detailed enquiry snapshot."""
    is_owner = current_user.account_type == "owner"
    result = await service.get_enquiry_by_id(
        enquiry_id=enquiry_id,
        user_id=current_user.id,
        is_owner=is_owner,
    )
    return SuccessResponse(data=result)
