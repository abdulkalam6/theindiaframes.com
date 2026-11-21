"""
Pydantic schemas for Owner Admin Dashboard, Enquiry Updates, and Customer Management.
"""

from typing import List, Literal, Optional

from pydantic import BaseModel, Field

from app.schemas.enquiry import EnquiryResponse


# Enquiry Status Modification
class EnquiryStatusUpdateRequest(BaseModel):
    status: Literal["pending", "quoted", "accepted", "in_progress", "completed", "cancelled"]
    note: Optional[str] = None


# Quoted Amount Adjustment
class EnquiryQuoteUpdateRequest(BaseModel):
    quoted_total_paise: int = Field(..., ge=0)
    note: Optional[str] = None


# Admin Dashboard Summary KPI metrics
class AdminDashboardSummary(BaseModel):
    total_enquiries: int
    pending_enquiries: int
    total_products: int
    total_wholesale_pending: int
    total_customers: int
    recent_enquiries: List[EnquiryResponse]
