"""
Pydantic schemas for Categories, Products, and Variants.
Follows docs/DATABASE_SCHEMA.md & docs/API_SPECIFICATION.md.
"""

from datetime import datetime
from typing import Any, Dict, List, Literal, Optional

from pydantic import BaseModel, Field


# --- Media Asset Schema ---
class MediaAsset(BaseModel):
    asset_id: Optional[str] = None
    url: str
    alt: Optional[str] = None
    sort_order: int = 0


# --- Category Schemas ---
class CategoryBase(BaseModel):
    name: str = Field(..., min_length=1, max_length=100)
    slug: str = Field(..., min_length=1, max_length=100)
    description: Optional[str] = None
    parent_id: Optional[str] = None
    image: Optional[MediaAsset] = None
    sort_order: int = 0
    is_active: bool = True
    seo_title: Optional[str] = None
    seo_description: Optional[str] = None


class CategoryCreate(CategoryBase):
    pass


class CategoryUpdate(BaseModel):
    name: Optional[str] = None
    slug: Optional[str] = None
    description: Optional[str] = None
    parent_id: Optional[str] = None
    image: Optional[MediaAsset] = None
    sort_order: Optional[int] = None
    is_active: Optional[bool] = None
    seo_title: Optional[str] = None
    seo_description: Optional[str] = None


class CategoryResponse(CategoryBase):
    id: str
    created_at: datetime
    updated_at: datetime


# --- Product Variant Schemas ---
class VariantBase(BaseModel):
    sku: str = Field(..., min_length=2, max_length=50)
    label: str = Field(..., min_length=1, max_length=100)
    attributes: Dict[str, Any] = Field(default_factory=dict)
    retail_price_paise: int = Field(..., ge=0)
    wholesale_price_paise: Optional[int] = Field(None, ge=0)
    wholesale_moq: int = Field(1, ge=1)
    gallery: List[MediaAsset] = Field(default_factory=list)
    availability: Literal["available", "unavailable"] = "available"
    is_active: bool = True


class VariantCreate(VariantBase):
    pass


class VariantUpdate(BaseModel):
    sku: Optional[str] = None
    label: Optional[str] = None
    attributes: Optional[Dict[str, Any]] = None
    retail_price_paise: Optional[int] = Field(None, ge=0)
    wholesale_price_paise: Optional[int] = Field(None, ge=0)
    wholesale_moq: Optional[int] = Field(None, ge=1)
    gallery: Optional[List[MediaAsset]] = None
    availability: Optional[Literal["available", "unavailable"]] = None
    is_active: Optional[bool] = None


# Public/Retail projected variant (STRICT: Never exposes wholesale prices)
class PublicVariantResponse(BaseModel):
    id: str
    product_id: str
    sku: str
    label: str
    attributes: Dict[str, Any]
    retail_price_paise: int
    gallery: List[MediaAsset]
    availability: Literal["available", "unavailable"]
    is_active: bool


# Wholesale-approved projected variant (Wholesale price & MOQ only)
class WholesaleVariantResponse(BaseModel):
    id: str
    product_id: str
    sku: str
    label: str
    attributes: Dict[str, Any]
    wholesale_price_paise: int
    wholesale_moq: int
    gallery: List[MediaAsset]
    availability: Literal["available", "unavailable"]
    is_active: bool


# Owner/Admin full variant
class AdminVariantResponse(VariantBase):
    id: str
    product_id: str
    created_at: datetime
    updated_at: datetime


# --- Product Schemas ---
class ProductBase(BaseModel):
    name: str = Field(..., min_length=1, max_length=200)
    slug: str = Field(..., min_length=1, max_length=200)
    base_sku: str = Field(..., min_length=2, max_length=50)
    short_description: Optional[str] = None
    description: Optional[str] = None
    category_id: str
    subcategory_id: Optional[str] = None
    tags: List[str] = Field(default_factory=list)
    gallery: List[MediaAsset] = Field(default_factory=list)
    is_featured: bool = False
    is_active: bool = True
    seo_title: Optional[str] = None
    seo_description: Optional[str] = None


class ProductCreate(ProductBase):
    pass


class ProductUpdate(BaseModel):
    name: Optional[str] = None
    slug: Optional[str] = None
    base_sku: Optional[str] = None
    short_description: Optional[str] = None
    description: Optional[str] = None
    category_id: Optional[str] = None
    subcategory_id: Optional[str] = None
    tags: Optional[List[str]] = None
    gallery: Optional[List[MediaAsset]] = None
    is_featured: Optional[bool] = None
    is_active: Optional[bool] = None
    seo_title: Optional[str] = None
    seo_description: Optional[str] = None


# Public view of product with projected variants
class PublicProductResponse(ProductBase):
    id: str
    variants: List[PublicVariantResponse] = Field(default_factory=list)
    created_at: datetime
    updated_at: datetime


# Wholesale view of product with projected variants
class WholesaleProductResponse(ProductBase):
    id: str
    variants: List[WholesaleVariantResponse] = Field(default_factory=list)
    created_at: datetime
    updated_at: datetime


# Admin view of product with all variant fields
class AdminProductResponse(ProductBase):
    id: str
    variants: List[AdminVariantResponse] = Field(default_factory=list)
    created_at: datetime
    updated_at: datetime
