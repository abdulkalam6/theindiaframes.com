"""
Pydantic schemas for Owner Billing Foundation, Unified Records, and Payments Ledger.
Follows docs/DATABASE_SCHEMA.md & docs/API_SPECIFICATION.md.
Money values are integer paise (INR); tax_amount_paise remains null until confirmed.
"""

from datetime import datetime
from typing import List, Literal, Optional

from pydantic import BaseModel

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
