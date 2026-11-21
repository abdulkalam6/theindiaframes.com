"""
Pydantic schemas for Wholesale Applications and Review workflows.
Adheres to docs/DATABASE_SCHEMA.md & docs/API_SPECIFICATION.md.
"""

from datetime import datetime
from typing import Literal, Optional

from pydantic import BaseModel, EmailStr, Field

# Indian 15-character GSTIN regex validation
GSTIN_REGEX = r"^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$"


class BusinessAddress(BaseModel):
    line1: str = Field(..., min_length=2, max_length=150)
    line2: Optional[str] = None
    city: str = Field(..., min_length=2, max_length=100)
    district: Optional[str] = None
    state: str = Field("Tamil Nadu", min_length=2, max_length=50)
    postal_code: str = Field(..., pattern=r"^[1-9][0-9]{5}$")  # 6-digit PIN
    country: str = "IN"


class ProofDocumentMeta(BaseModel):
    original_filename: str
    mime_type: str
    uploaded_at: datetime


# Customer wholesale submission payload
class WholesaleApplicationCreate(BaseModel):
    business_name: str = Field(..., min_length=2, max_length=150)
    business_type: Literal[
        "photo_studio", "framing_shop", "printing_press", "gift_shop", "other"
    ]
    gstin: str = Field(..., pattern=GSTIN_REGEX)
    contact_name: str = Field(..., min_length=2, max_length=100)
    contact_phone: str = Field(..., pattern=r"^\+?[0-9]{10,15}$")
    contact_email: EmailStr
    business_address: BusinessAddress
    applicant_note: Optional[str] = None


# Customer view of their own application (PRIVATE: asset storage paths never leaked)
class CustomerWholesaleApplicationResponse(BaseModel):
    id: str
    business_name: str
    business_type: str
    gstin: str
    status: Literal["pending", "approved", "rejected"]
    applicant_note: Optional[str] = None
    proof_document: ProofDocumentMeta
    created_at: datetime
    updated_at: datetime


# Owner view of wholesale application with review capabilities
class AdminWholesaleApplicationResponse(CustomerWholesaleApplicationResponse):
    user_id: str
    contact_name: str
    contact_phone: str
    contact_email: str
    business_address: BusinessAddress
    owner_internal_note: Optional[str] = None
    reviewed_by: Optional[str] = None
    reviewed_at: Optional[datetime] = None


# Owner review decision request
class WholesaleReviewRequest(BaseModel):
    decision: Literal["approved", "rejected"]
    internal_note: Optional[str] = None
