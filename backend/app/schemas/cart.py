"""
Pydantic schemas for Server-Side Cart Pricing and Validation.
Used to recalculate authoritative totals and validate availability/MOQs before enquiry submission.
"""

from typing import List, Literal, Optional

from pydantic import BaseModel, Field


class CartLineItemRequest(BaseModel):
    product_id: str
    variant_id: str
    quantity: int = Field(..., ge=1)


class CartValidateRequest(BaseModel):
    items: List[CartLineItemRequest] = Field(..., min_length=1)


class CartLineItemResponse(BaseModel):
    product_id: str
    variant_id: str
    sku: str
    product_name: str
    variant_label: str
    image_url: Optional[str] = None
    category_id: str
    quantity: int
    unit_price_paise: int
    line_total_paise: int
    wholesale_moq: int
    availability: Literal["available", "unavailable"]
    moq_satisfied: bool
    is_valid: bool
    issue: Optional[str] = None


class CartValidateResponse(BaseModel):
    pricing_tier: Literal["retail", "wholesale"]
    currency: str = "INR"
    items: List[CartLineItemResponse]
    subtotal_paise: int
    total_quantity: int
    can_submit: bool
    validation_issues: List[str] = Field(default_factory=list)
