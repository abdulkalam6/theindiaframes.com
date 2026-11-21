"""
Authentication and Customer User API Endpoints.
Mounted under /api/v1/auth.
"""

from typing import Optional

from fastapi import APIRouter, Cookie, Depends, HTTPException, Response, status
from pymongo.asynchronous.database import AsyncDatabase

from app.core.responses import SuccessResponse
from app.database.session import get_db
from app.schemas.auth import (
    AuthSessionResponse,
    GoogleLoginRequest,
    LoginRequest,
    RegisterRequest,
    UserResponse,
)
from app.services.auth import AuthService

router = APIRouter(prefix="/auth", tags=["Authentication"])


def get_auth_service(db: Optional[AsyncDatabase] = Depends(get_db)) -> AuthService:
    if db is None:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Database service not available.",
        )
    return AuthService(db)


async def get_current_user(
    tif_session: Optional[str] = Cookie(None),
    auth_service: AuthService = Depends(get_auth_service),
) -> UserResponse:
    user = await auth_service.get_current_user_from_token(tif_session)
    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Authentication required. Please sign in.",
        )
    return user


@router.post("/register", response_model=SuccessResponse[UserResponse], status_code=status.HTTP_201_CREATED)
async def register(
    payload: RegisterRequest,
    service: AuthService = Depends(get_auth_service),
):
    user = await service.register(payload)
    return SuccessResponse(data=user)


@router.post("/login", response_model=SuccessResponse[AuthSessionResponse])
async def login(
    payload: LoginRequest,
    response: Response,
    service: AuthService = Depends(get_auth_service),
):
    user = await service.login_password(payload, response)
    return SuccessResponse(data=AuthSessionResponse(user=user))


@router.post("/google", response_model=SuccessResponse[AuthSessionResponse])
async def google_login(
    payload: GoogleLoginRequest,
    response: Response,
    service: AuthService = Depends(get_auth_service),
):
    user = await service.login_google(payload.id_token, response)
    return SuccessResponse(data=AuthSessionResponse(user=user))


@router.post("/logout", response_model=SuccessResponse[dict])
async def logout(
    response: Response,
    tif_session: Optional[str] = Cookie(None),
    service: AuthService = Depends(get_auth_service),
):
    await service.logout(tif_session, response)
    return SuccessResponse(data={"message": "Logged out successfully."})


@router.get("/me", response_model=SuccessResponse[UserResponse])
async def get_me(user: UserResponse = Depends(get_current_user)):
    return SuccessResponse(data=user)
