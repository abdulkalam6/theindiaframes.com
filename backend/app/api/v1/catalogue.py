"""
Catalogue REST API Router for public and admin operations.
Handles Categories, Products, and Variants.
"""

from typing import List, Optional

from fastapi import APIRouter, Depends, Header, HTTPException, Query, status
from pymongo.asynchronous.database import AsyncDatabase

from app.core.responses import SuccessResponse
from app.database.session import get_db
from app.schemas.catalogue import (
    AdminProductResponse,
    AdminVariantResponse,
    CategoryCreate,
    CategoryResponse,
    CategoryUpdate,
    ProductCreate,
    VariantCreate,
    VariantUpdate,
)
from app.services.catalogue import CatalogueService, UserRole

router = APIRouter(tags=["Catalogue"])


def get_catalogue_service(db: Optional[AsyncDatabase] = Depends(get_db)) -> CatalogueService:
    if db is None:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Database is not connected.",
        )
    return CatalogueService(db)


def get_current_role(x_auth_role: Optional[str] = Header(None)) -> UserRole:
    """
    Header-driven or session-driven role projection provider.
    In Phase 2, allows testing price projection policies before full session auth in Phase 3.
    """
    if x_auth_role in ["owner", "wholesale_approved", "retail", "visitor"]:
        return x_auth_role  # type: ignore
    return "visitor"


# --- PUBLIC & SHOPPER ENDPOINTS ---
@router.get("/categories", response_model=SuccessResponse[List[CategoryResponse]])
async def list_categories(service: CatalogueService = Depends(get_catalogue_service)):
    categories = await service.list_categories(active_only=True)
    return SuccessResponse(data=categories)


@router.get("/categories/{slug}", response_model=SuccessResponse[CategoryResponse])
async def get_category(slug: str, service: CatalogueService = Depends(get_catalogue_service)):
    cat = await service.get_category_by_slug(slug)
    return SuccessResponse(data=cat)


@router.get("/products")
async def list_products(
    category_id: Optional[str] = Query(None),
    limit: int = Query(50, ge=1, le=100),
    skip: int = Query(0, ge=0),
    role: UserRole = Depends(get_current_role),
    service: CatalogueService = Depends(get_catalogue_service),
):
    products = await service.list_products(
        category_id=category_id, role=role, limit=limit, skip=skip
    )
    return SuccessResponse(data=products)


@router.get("/products/{slug}")
async def get_product(
    slug: str,
    role: UserRole = Depends(get_current_role),
    service: CatalogueService = Depends(get_catalogue_service),
):
    product = await service.get_product_by_slug(slug, role=role)
    return SuccessResponse(data=product)


# --- OWNER/ADMIN CATALOGUE ENDPOINTS ---
@router.post("/admin/categories", response_model=SuccessResponse[CategoryResponse])
async def create_category(
    payload: CategoryCreate,
    role: UserRole = Depends(get_current_role),
    service: CatalogueService = Depends(get_catalogue_service),
):
    if role != "owner":
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Owner privileges required.")
    cat = await service.create_category(payload)
    return SuccessResponse(data=cat)


@router.patch("/admin/categories/{category_id}", response_model=SuccessResponse[CategoryResponse])
async def update_category(
    category_id: str,
    payload: CategoryUpdate,
    role: UserRole = Depends(get_current_role),
    service: CatalogueService = Depends(get_catalogue_service),
):
    if role != "owner":
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Owner privileges required.")
    cat = await service.update_category(category_id, payload)
    return SuccessResponse(data=cat)


@router.post("/admin/products", response_model=SuccessResponse[AdminProductResponse])
async def create_product(
    payload: ProductCreate,
    role: UserRole = Depends(get_current_role),
    service: CatalogueService = Depends(get_catalogue_service),
):
    if role != "owner":
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Owner privileges required.")
    prod = await service.create_product(payload)
    return SuccessResponse(data=prod)


@router.post("/admin/products/{product_id}/variants", response_model=SuccessResponse[AdminVariantResponse])
async def create_variant(
    product_id: str,
    payload: VariantCreate,
    role: UserRole = Depends(get_current_role),
    service: CatalogueService = Depends(get_catalogue_service),
):
    if role != "owner":
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Owner privileges required.")
    variant = await service.create_variant(product_id, payload)
    return SuccessResponse(data=variant)


@router.patch("/admin/variants/{variant_id}", response_model=SuccessResponse[AdminVariantResponse])
async def update_variant(
    variant_id: str,
    payload: VariantUpdate,
    role: UserRole = Depends(get_current_role),
    service: CatalogueService = Depends(get_catalogue_service),
):
    if role != "owner":
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Owner privileges required.")
    variant = await service.update_variant(variant_id, payload)
    return SuccessResponse(data=variant)
