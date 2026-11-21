"""
Pydantic schemas for Owner Billing Foundation, Unified Records, and Payments Ledger.
Follows docs/DATABASE_SCHEMA.md & docs/API_SPECIFICATION.md.
Money values are integer paise (INR); tax_amount_paise remains null until confirmed.
"""

from datetime import datetime
from typing import List, Literal, Optional

from pydantic import BaseModel, Field

SourceType = Literal["enquiry", "offline_sale"]
SourceLabel = Literal["Online Enquiry", "Offline Sale"]
PaymentStatus = Literal["unpaid", "partial", "paid"]
PaymentEntryType = Literal["receipt", "reversal"]
PaymentMethod = Literal["cash", "upi", "bank_transfer", "card", "other"]


class BillingCustomerInfo(BaseModel):
    customer_id: Optional[str] = None
    name: str
    email: Optional[str] = None
    phone: Optional[str] = None


class BillingLineItem(BaseModel):
    product_id: Optional[str] = None
    variant_id: Optional[str] = None
    sku: Optional[str] = None
    product_name: str
    variant_label: Optional[str] = None
    quantity: int
    unit_price_paise: int
    line_total_paise: int


class PaymentEntryResponse(BaseModel):
    id: str
    payment_id: str
    source_type: SourceType
    source_id: str
    entry_type: PaymentEntryType
    reversed_payment_id: Optional[str] = None
    amount_paise: int
    currency: str = "INR"
    method: PaymentMethod
    reference_number: Optional[str] = None
    paid_at: datetime
    notes: Optional[str] = None
    created_by: str
    created_at: datetime


class BillingRecordSummary(BaseModel):
    source_type: SourceType
    source_label: SourceLabel
    source_id: str
    reference_id: str
    customer: BillingCustomerInfo
    record_status: str
    currency: str = "INR"
    payable_total_paise: int
    received_total_paise: int
    outstanding_paise: int
    payment_status: PaymentStatus
    item_count: int
    created_at: datetime
    updated_at: datetime


class BillingRecordDetail(BillingRecordSummary):
    items: List[BillingLineItem]
    subtotal_paise: int
    discount_paise: int = 0
    tax_amount_paise: Optional[int] = None
    estimated_total_paise: Optional[int] = None
    quoted_total_paise: Optional[int] = None
    notes: Optional[str] = None
    payments: List[PaymentEntryResponse]


class BillingSummaryResponse(BaseModel):
    total_records: int
    online_enquiries_count: int
    offline_sales_count: int
    total_payable_paise: int
    total_received_paise: int
    total_outstanding_paise: int
    unpaid_count: int
    partial_count: int
    paid_count: int
    currency: str = "INR"


# --- Phase 9: Offline Sales & Payments ---


class OfflineSaleCustomerInput(BaseModel):
    customer_id: Optional[str] = None
    name: Optional[str] = None
    phone: Optional[str] = None
    email: Optional[str] = None


class OfflineSaleItemInput(BaseModel):
    product_id: Optional[str] = None
    variant_id: Optional[str] = None
    sku: Optional[str] = None
    product_name: Optional[str] = None
    variant_label: Optional[str] = None
    quantity: int = Field(..., ge=1)
    unit_price_paise: Optional[int] = Field(None, ge=0)


class OfflineSaleCreateRequest(BaseModel):
    customer: OfflineSaleCustomerInput
    items: List[OfflineSaleItemInput] = Field(..., min_length=1)
    discount_paise: int = Field(0, ge=0)
    notes: Optional[str] = None


class OfflineSaleUpdateRequest(BaseModel):
    items: Optional[List[OfflineSaleItemInput]] = Field(None, min_length=1)
    discount_paise: Optional[int] = Field(None, ge=0)
    notes: Optional[str] = None
    sale_status: Optional[Literal["recorded", "voided"]] = None


class PaymentCreateRequest(BaseModel):
    entry_type: PaymentEntryType = "receipt"
    amount_paise: Optional[int] = Field(None, gt=0)
    reversed_payment_id: Optional[str] = None
    method: PaymentMethod
    paid_at: Optional[datetime] = None
    reference_number: Optional[str] = None
    notes: Optional[str] = None
    idempotency_key: Optional[str] = None


class PaymentRecordResult(BaseModel):
    payment: PaymentEntryResponse
    billing_record: BillingRecordDetail
    idempotent_replay: bool = False


class ReconciliationMismatch(BaseModel):
    source_type: SourceType
    source_id: str
    reference_id: str
    payable_total_paise: int
    stored_received_paise: int
    ledger_net_received_paise: int
    stored_outstanding_paise: int
    expected_outstanding_paise: int
    stored_payment_status: str
    expected_payment_status: str


class ReconciliationReport(BaseModel):
    checked_records: int
    consistent_records: int
    mismatched_records: int
    repaired_records: int
    mismatches: List[ReconciliationMismatch]
