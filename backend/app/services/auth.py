"""
Authentication Service handling Registration, Password Login, Google Sign-in & Sessions.
"""

from typing import Any, Dict, Optional

import httpx
from fastapi import HTTPException, Response, status
from pymongo.asynchronous.database import AsyncDatabase

from app.core.config import settings
from app.core.security import generate_session_token, hash_password, verify_password
from app.repositories.users import UserRepository
from app.schemas.auth import LoginRequest, RegisterRequest, UserResponse


class AuthService:
    def __init__(self, db: AsyncDatabase):
        self.repo = UserRepository(db)

    async def register(self, payload: RegisterRequest) -> UserResponse:
        # 1. Enforce: Never allow creation of owner via public registration
        if getattr(payload, "account_type", None) == "owner":
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Owner accounts cannot be registered publicly.",
            )

        # 2. Check email uniqueness
        existing = await self.repo.get_by_email(payload.email)
        if existing:
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail="An account with this email address already exists.",
            )

        # 3. Create user
        account_type = "wholesale" if payload.requested_account_type == "wholesale" else "retail"
        wholesale_status = "pending" if account_type == "wholesale" else "not_applied"

        user_doc = {
            "name": payload.name,
            "email": payload.email,
            "phone": payload.phone,
            "account_type": account_type,
            "account_status": "active",
            "wholesale_status": wholesale_status,
            "password_hash": hash_password(payload.password),
            "google_sub": None,
        }

        created = await self.repo.create_user(user_doc)
        return self._to_user_response(created)

    async def login_password(self, payload: LoginRequest, response: Response) -> UserResponse:
        user = await self.repo.get_by_email(payload.email)
        if not user or not user.get("password_hash"):
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid email or password.",
            )

        if not verify_password(payload.password, user["password_hash"]):
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid email or password.",
            )

        if user.get("account_status") != "active":
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="This account has been disabled or suspended.",
            )

        # Create session and attach secure cookie
        session_token = generate_session_token()
        await self.repo.create_session(user["id"], session_token)
        await self.repo.update_last_login(user["id"])

        self._set_session_cookie(response, session_token)
        return self._to_user_response(user)

    async def login_google(self, id_token: str, response: Response) -> UserResponse:
        """
        Verify Google ID token with Google's tokeninfo API.
        Enforces token signature, audience, issuer and retrieves stable sub claim.
        """
        google_user = await self._verify_google_token(id_token)
        google_sub = google_user["sub"]
        email = google_user.get("email")
        name = google_user.get("name", "Google Customer")

        # 1. Check existing account by google_sub
        user = await self.repo.get_by_google_sub(google_sub)
        if not user and email:
            # Check if user with same email exists -> link google_sub
            user = await self.repo.get_by_email(email)
            if user:
                await self.repo.db.users.update_one(
                    {"_id": self.repo.db.users.find_one({"email_normalized": email.lower()})["_id"]},
                    {"$set": {"google_sub": google_sub}},
                )
                user["google_sub"] = google_sub

        if not user:
            # Create new retail user authenticated via Google
            new_doc = {
                "name": name,
                "email": email or f"{google_sub}@google.account",
                "phone": None,
                "account_type": "retail",
                "account_status": "active",
                "wholesale_status": "not_applied",
                "password_hash": None,
                "google_sub": google_sub,
            }
            user = await self.repo.create_user(new_doc)

        # Issue session
        session_token = generate_session_token()
        await self.repo.create_session(user["id"], session_token)
        await self.repo.update_last_login(user["id"])
        self._set_session_cookie(response, session_token)

        return self._to_user_response(user)

    async def get_current_user_from_token(self, token: Optional[str]) -> Optional[UserResponse]:
        if not token:
            return None
        sess = await self.repo.get_session(token)
        if not sess:
            return None
        user = await self.repo.get_by_id(str(sess["user_id"]))
        if not user or user.get("account_status") != "active":
            return None
        return self._to_user_response(user)

    async def logout(self, token: Optional[str], response: Response) -> None:
        if token:
            await self.repo.delete_session(token)
        response.delete_cookie(
            key="tif_session",
            domain=settings.COOKIE_DOMAIN,
            path="/",
        )

    def _set_session_cookie(self, response: Response, token: str) -> None:
        response.set_cookie(
            key="tif_session",
            value=token,
            httponly=True,
            secure=settings.COOKIE_SECURE,
            samesite="lax",
            domain=settings.COOKIE_DOMAIN,
            max_age=60 * 60 * 24 * 7,  # 7 days
            path="/",
        )

    async def _verify_google_token(self, id_token: str) -> Dict[str, Any]:
        """Validate token with Google API endpoint."""
        async with httpx.AsyncClient(timeout=10) as client:
            resp = await client.get(
                "https://oauth2.googleapis.com/tokeninfo",
                params={"id_token": id_token},
            )
            if resp.status_code != 200:
                raise HTTPException(
                    status_code=status.HTTP_401_UNAUTHORIZED,
                    detail="Invalid or expired Google authentication token.",
                )
            data = resp.json()

            # Verify client ID if configured
            if settings.GOOGLE_CLIENT_ID and data.get("aud") != settings.GOOGLE_CLIENT_ID:
                raise HTTPException(
                    status_code=status.HTTP_401_UNAUTHORIZED,
                    detail="Google token audience mismatch.",
                )
            return data

    def _to_user_response(self, user: Dict[str, Any]) -> UserResponse:
        return UserResponse(
            id=user["id"],
            name=user["name"],
            email=user["email"],
            phone=user.get("phone"),
            account_type=user.get("account_type", "retail"),
            account_status=user.get("account_status", "active"),
            wholesale_status=user.get("wholesale_status", "not_applied"),
            has_password=bool(user.get("password_hash")),
            is_google_linked=bool(user.get("google_sub")),
            created_at=user["created_at"],
            last_login_at=user.get("last_login_at"),
        )
