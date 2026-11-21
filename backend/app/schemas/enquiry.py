"""
Pydantic schemas for Enquiry Submission, Snapshots, and WhatsApp Click-to-Chat handoff.
Follows docs/DATABASE_SCHEMA.md & docs/API_SPECIFICATION.md.
"""

from datetime import datetime
from typing import Any, Dict, List, Literal, Optional

from pydantic import BaseModel, EmailStr, Field


# Item snapshot captured immutably at submission time
class EnquiryItemSnapshot(BaseModel):
    product_id: str
    variant_id: str
    sku: str
    product_name: str
    variant_label: str
    variant_attributes: Dict[str, Any] = Field(default_factory=dict)
    image_snapshot_url: Optional[str] = None
    quantity: int = Field(..., ge=1)
    unit_price_paise: int = Field(..., ge=0)
    line_total_paise: int = Field(..., ge=0)


class CustomerSnapshot(BaseModel):
    name: str
    email: EmailStr
    phone: Optional[str] = None
    account_type_at_submission: str


class PaymentSummary(BaseModel):
    received_total_paise: int = 0
    outstanding_paise: int
    payment_status: Literal["unpaid", "partial", "paid"] = "unpaid"


class StatusHistoryEntry(BaseModel):
    status: str
    changed_by: Optional[str] = None
    changed_at: datetime
    note: Optional[str] = None


class EnquiryCreateRequest(BaseModel):
    items: List[Dict[str, Any]] = Field(..., min_length=1)  # [{product_id, variant_id, quantity}]
    customer_note: Optional[str] = None
    idempotency_key: Optional[str] = None


class EnquiryResponse(BaseModel):
    id: str
    enquiry_id: str
    customer_id: str
    customer_snapshot: CustomerSnapshot
    pricing_tier: Literal["retail", "wholesale"]
    items: List[EnquiryItemSnapshot]
    currency: str = "INR"
    subtotal_paise: int
    estimated_total_paise: int
    quoted_total_paise: Optional[int] = None
    payment_summary: PaymentSummary
    enquiry_status: Literal["pending", "quoted", "accepted", "in_progress", "completed", "cancelled"]
    status_history: List[StatusHistoryEntry]
    customer_note: Optional[str] = None
    whatsapp_url: str
    created_at: datetime
    updated_at: datetime
