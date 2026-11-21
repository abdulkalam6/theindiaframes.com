"""
Cart REST API Router.
Handles cart pricing calculation and inventory/MOQ validation.
"""

from typing import Optional

from fastapi import APIRouter, Cookie, Depends, HTTPException, status
from pymongo.asynchronous.database import AsyncDatabase

from app.core.responses import SuccessResponse
from app.database.session import get_db
from app.schemas.cart import CartValidateRequest, CartValidateResponse
from app.services.auth import AuthService
from app.services.cart import CartService

router = APIRouter(prefix="/cart", tags=["Cart"])


def get_cart_service(db: Optional[AsyncDatabase] = Depends(get_db)) -> CartService:
    if db is None:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Database service not available.",
        )
    return CartService(db)


def get_auth_service(db: Optional[AsyncDatabase] = Depends(get_db)) -> AuthService:
    if db is None:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Database service not available.",
        )
    return AuthService(db)


@router.post("/validate", response_model=SuccessResponse[CartValidateResponse])
async def validate_cart(
    payload: CartValidateRequest,
    tif_session: Optional[str] = Cookie(None),
    cart_service: CartService = Depends(get_cart_service),
    auth_service: AuthService = Depends(get_auth_service),
):
    """
    Validates items in customer's local cart, determines authoritative tier price
    (retail or approved wholesale), and confirms MOQ compliance.
    """
    user_id = None
    if tif_session:
        current_user = await auth_service.get_current_user_from_token(tif_session)
        if current_user:
            user_id = current_user.id

    result = await cart_service.validate_cart(payload.items, user_id=user_id)
    return SuccessResponse(data=result)
