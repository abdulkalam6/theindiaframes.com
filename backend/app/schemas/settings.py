"""
Pydantic schemas for Public & Owner Business Settings.
Never includes secrets or credentials (docs/DATABASE_SCHEMA.md Section 11).
"""

from datetime import datetime
from typing import Optional

from pydantic import BaseModel, Field


class BusinessSettingsResponse(BaseModel):
    business_name: str = "The India Frames"
    tagline: str = "Where Memories Become Art"
    whatsapp_number: str = "919443312345"
    phone_display: Optional[str] = None
    email: Optional[str] = None
    address_line: str = "Cumbum, Theni District, Tamil Nadu, India"
    map_url: Optional[str] = None
    opening_hours: Optional[str] = None
    instagram_url: Optional[str] = None
    facebook_url: Optional[str] = None
    currency: str = "INR"
    updated_at: Optional[datetime] = None


class BusinessSettingsUpdateRequest(BaseModel):
    business_name: Optional[str] = Field(None, min_length=1, max_length=120)
    tagline: Optional[str] = Field(None, max_length=200)
    whatsapp_number: Optional[str] = Field(None, pattern=r"^[0-9]{10,15}$")
    phone_display: Optional[str] = Field(None, max_length=40)
    email: Optional[str] = Field(None, max_length=120)
    address_line: Optional[str] = Field(None, max_length=300)
    map_url: Optional[str] = Field(None, max_length=500)
    opening_hours: Optional[str] = Field(None, max_length=200)
    instagram_url: Optional[str] = Field(None, max_length=300)
    facebook_url: Optional[str] = Field(None, max_length=300)
