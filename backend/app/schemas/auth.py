"""
Pydantic schemas for Customer & Owner Authentication.
"""

from datetime import datetime
from typing import Literal, Optional

from pydantic import BaseModel, EmailStr, Field


# Registration Request (Only retail or wholesale intent, NEVER owner)
class RegisterRequest(BaseModel):
    name: str = Field(..., min_length=2, max_length=100)
    email: EmailStr
    phone: Optional[str] = Field(None, pattern=r"^\+?[0-9]{10,15}$")
    password: str = Field(..., min_length=8, max_length=128)
    # Requested account type defaults to retail; wholesale is subject to approval
    requested_account_type: Literal["retail", "wholesale"] = "retail"


# Login Request
class LoginRequest(BaseModel):
    email: EmailStr
    password: str


# Google Sign-In Request
class GoogleLoginRequest(BaseModel):
    id_token: str


# Customer Profile Response
class UserResponse(BaseModel):
    id: str
    name: str
    email: str
    phone: Optional[str] = None
    account_type: Literal["retail", "wholesale", "owner"]
    account_status: Literal["active", "suspended", "disabled"]
    wholesale_status: Literal["not_applied", "pending", "approved", "rejected"]
    has_password: bool
    is_google_linked: bool
    created_at: datetime
    last_login_at: Optional[datetime] = None


# Session capabilities
class AuthSessionResponse(BaseModel):
    user: UserResponse
    message: str = "Authenticated successfully."
