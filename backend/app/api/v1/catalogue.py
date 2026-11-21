"""
Catalogue REST API Router for public and admin operations.
Handles Categories, Products, and Variants.
Phase 10 Security Hardening: Role projection and owner mutations derive strictly
from verified backend session cookies (`tif_session`) — never from client headers.
"""

from typing import List, Optional

from fastapi import APIRouter, Cookie, Depends, HTTPException, Query, status
from pymongo.asynchronous.database import AsyncDatabase

from app.api.v1.admin import require_owner
from app.api.v1.auth import get_auth_service
from app.core.responses import SuccessResponse
from app.database.session import get_db
from app.schemas.auth import UserResponse
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
from app.services.auth import AuthService
from app.services.catalogue import CatalogueService, UserRole

router = APIRouter(tags=["Catalogue"])


def get_catalogue_service(db: Optional[AsyncDatabase] = Depends(get_db)) -> CatalogueService:
    if db is None:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Database is not connected.",
        )
    return CatalogueService(db)


async def get_current_role(
    tif_session: Optional[str] = Cookie(None),
    auth_service: AuthService = Depends(get_auth_service),
) -> UserRole:
    """
    Authoritative session-derived price projection role.
    Never trusts client-supplied headers or query parameters.
    """
    if not tif_session:
        return "visitor"
    user = await auth_service.get_current_user_from_token(tif_session)
    if not user:
        return "visitor"
    if user.account_type == "owner":
        return "owner"
    if user.wholesale_status == "approved":
        return "wholesale_approved"
    return "retail"


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
    owner: UserResponse = Depends(require_owner),
    service: CatalogueService = Depends(get_catalogue_service),
):
    cat = await service.create_category(payload)
    return SuccessResponse(data=cat)


@router.patch("/admin/categories/{category_id}", response_model=SuccessResponse[CategoryResponse])
async def update_category(
    category_id: str,
    payload: CategoryUpdate,
    owner: UserResponse = Depends(require_owner),
    service: CatalogueService = Depends(get_catalogue_service),
):
    cat = await service.update_category(category_id, payload)
    return SuccessResponse(data=cat)


@router.post("/admin/products", response_model=SuccessResponse[AdminProductResponse])
async def create_product(
    payload: ProductCreate,
    owner: UserResponse = Depends(require_owner),
    service: CatalogueService = Depends(get_catalogue_service),
):
    prod = await service.create_product(payload)
    return SuccessResponse(data=prod)


@router.post(
    "/admin/products/{product_id}/variants",
    response_model=SuccessResponse[AdminVariantResponse],
)
async def create_variant(
    product_id: str,
    payload: VariantCreate,
    owner: UserResponse = Depends(require_owner),
    service: CatalogueService = Depends(get_catalogue_service),
):
    variant = await service.create_variant(product_id, payload)
    return SuccessResponse(data=variant)


@router.patch("/admin/variants/{variant_id}", response_model=SuccessResponse[AdminVariantResponse])
async def update_variant(
    variant_id: str,
    payload: VariantUpdate,
    owner: UserResponse = Depends(require_owner),
    service: CatalogueService = Depends(get_catalogue_service),
):
    variant = await service.update_variant(variant_id, payload)
    return SuccessResponse(data=variant)
