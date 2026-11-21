"""
Catalogue Service Layer.
Enforces business rules, price projections, and authorization tiers.
"""

from typing import Any, Dict, List, Literal, Optional

from fastapi import HTTPException, status
from pymongo.asynchronous.database import AsyncDatabase

from app.repositories.catalogue import CatalogueRepository
from app.schemas.catalogue import (
    AdminProductResponse,
    AdminVariantResponse,
    CategoryCreate,
    CategoryResponse,
    CategoryUpdate,
    ProductCreate,
    PublicProductResponse,
    PublicVariantResponse,
    VariantCreate,
    VariantUpdate,
    WholesaleProductResponse,
    WholesaleVariantResponse,
)

UserRole = Literal["visitor", "retail", "wholesale_approved", "owner"]


class CatalogueService:
    def __init__(self, db: AsyncDatabase):
        self.repo = CatalogueRepository(db)

    # --- CATEGORY ACTIONS ---
    async def create_category(self, payload: CategoryCreate) -> CategoryResponse:
        existing = await self.repo.get_category_by_slug(payload.slug)
        if existing:
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail=f"Category with slug '{payload.slug}' already exists.",
            )
        data = payload.model_dump()
        doc = await self.repo.create_category(data)
        return CategoryResponse(**doc)

    async def list_categories(self, active_only: bool = True) -> List[CategoryResponse]:
        docs = await self.repo.list_categories(active_only=active_only)
        return [CategoryResponse(**d) for d in docs]

    async def get_category_by_slug(self, slug: str) -> CategoryResponse:
        doc = await self.repo.get_category_by_slug(slug)
        if not doc:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Category not found.")
        return CategoryResponse(**doc)

    async def update_category(self, category_id: str, payload: CategoryUpdate) -> CategoryResponse:
        doc = await self.repo.update_category(category_id, payload.model_dump(exclude_unset=True))
        if not doc:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Category not found.")
        return CategoryResponse(**doc)

    # --- PRODUCT ACTIONS ---
    async def create_product(self, payload: ProductCreate) -> AdminProductResponse:
        existing_slug = await self.repo.get_product_by_slug(payload.slug)
        if existing_slug:
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail=f"Product with slug '{payload.slug}' already exists.",
            )
        existing_sku = await self.repo.get_product_by_sku(payload.base_sku)
        if existing_sku:
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail=f"Product with base SKU '{payload.base_sku}' already exists.",
            )

        cat = await self.repo.get_category_by_id(payload.category_id)
        if not cat:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Category ID '{payload.category_id}' does not exist.",
            )

        data = payload.model_dump()
        doc = await self.repo.create_product(data)
        return AdminProductResponse(**doc, variants=[])

    async def create_variant(self, product_id: str, payload: VariantCreate) -> AdminVariantResponse:
        product = await self.repo.get_product_by_id(product_id)
        if not product:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Parent product not found.",
            )
        existing_sku = await self.repo.get_variant_by_sku(payload.sku)
        if existing_sku:
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail=f"Variant SKU '{payload.sku}' already exists.",
            )

        data = payload.model_dump()
        doc = await self.repo.create_variant(product_id, data)
        return AdminVariantResponse(**doc)

    async def update_variant(self, variant_id: str, payload: VariantUpdate) -> AdminVariantResponse:
        doc = await self.repo.update_variant(variant_id, payload.model_dump(exclude_unset=True))
        if not doc:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Variant not found.")
        return AdminVariantResponse(**doc)

    # --- PRICE PROJECTION & RETRIEVAL ---
    async def get_product_by_slug(
        self, slug: str, role: UserRole = "visitor"
    ) -> Any:
        product = await self.repo.get_product_by_slug(slug)
        if not product or (not product.get("is_active") and role != "owner"):
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Product not found.")

        raw_variants = await self.repo.list_variants_by_product(
            product["id"], active_only=(role != "owner")
        )

        return self._project_product_by_role(product, raw_variants, role)

    async def list_products(
        self,
        category_id: Optional[str] = None,
        role: UserRole = "visitor",
        limit: int = 50,
        skip: int = 0,
    ) -> List[Any]:
        products = await self.repo.list_products(
            category_id=category_id,
            active_only=(role != "owner"),
            limit=limit,
            skip=skip,
        )

        projected = []
        for p in products:
            variants = await self.repo.list_variants_by_product(
                p["id"], active_only=(role != "owner")
            )
            projected.append(self._project_product_by_role(p, variants, role))
        return projected

    def _project_product_by_role(
        self, product: Dict[str, Any], raw_variants: List[Dict[str, Any]], role: UserRole
    ) -> Any:
        if role == "owner":
            admin_variants = [AdminVariantResponse(**v) for v in raw_variants]
            return AdminProductResponse(**product, variants=admin_variants)

        elif role == "wholesale_approved":
            # Return wholesale prices & MOQs only.
            wholesale_variants = []
            for v in raw_variants:
                if v.get("wholesale_price_paise") is not None:
                    wholesale_variants.append(
                        WholesaleVariantResponse(
                            id=v["id"],
                            product_id=v["product_id"],
                            sku=v["sku"],
                            label=v["label"],
                            attributes=v.get("attributes", {}),
                            wholesale_price_paise=v["wholesale_price_paise"],
                            wholesale_moq=v.get("wholesale_moq", 1),
                            gallery=v.get("gallery", []),
                            availability=v.get("availability", "available"),
                            is_active=v.get("is_active", True),
                        )
                    )
            return WholesaleProductResponse(**product, variants=wholesale_variants)

        else:
            # Visitor / Retail / Pending / Rejected: Return retail prices only
            # Wholesale fields are completely omitted from the response model
            retail_variants = [
                PublicVariantResponse(
                    id=v["id"],
                    product_id=v["product_id"],
                    sku=v["sku"],
                    label=v["label"],
                    attributes=v.get("attributes", {}),
                    retail_price_paise=v["retail_price_paise"],
                    gallery=v.get("gallery", []),
                    availability=v.get("availability", "available"),
                    is_active=v.get("is_active", True),
                )
                for v in raw_variants
            ]
            return PublicProductResponse(**product, variants=retail_variants)
