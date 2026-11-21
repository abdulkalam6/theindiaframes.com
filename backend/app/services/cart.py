"""
Cart Pricing and Validation Service Layer.
Backend is the sole authority for:
- Price determination based on customer's wholesale status
- MOQ verification per variant
- Availability checks
- Integer paise arithmetic (no floats)
"""

from typing import List, Optional

from pymongo.asynchronous.database import AsyncDatabase

from app.repositories.catalogue import CatalogueRepository
from app.repositories.users import UserRepository
from app.schemas.cart import (
    CartLineItemRequest,
    CartLineItemResponse,
    CartValidateResponse,
)


class CartService:
    def __init__(self, db: AsyncDatabase):
        self.cat_repo = CatalogueRepository(db)
        self.user_repo = UserRepository(db)

    async def validate_cart(
        self,
        items: List[CartLineItemRequest],
        user_id: Optional[str] = None,
    ) -> CartValidateResponse:
        # 1. Determine customer pricing tier from server-side user record
        is_wholesale_approved = False
        if user_id:
            user = await self.user_repo.get_by_id(user_id)
            if user and (
                user.get("account_type") == "owner"
                or user.get("wholesale_status") == "approved"
            ):
                is_wholesale_approved = True

        pricing_tier = "wholesale" if is_wholesale_approved else "retail"

        validated_lines: List[CartLineItemResponse] = []
        subtotal_paise = 0
        total_quantity = 0
        validation_issues: List[str] = []
        can_submit = True

        # 2. Iterate each requested line item
        for req in items:
            variant = await self.cat_repo.get_variant_by_id(req.variant_id)
            product = (
                await self.cat_repo.get_product_by_id(req.product_id)
                if variant
                else None
            )

            if not variant or not product:
                can_submit = False
                validation_issues.append(
                    f"Item with product ID {req.product_id} or variant ID {req.variant_id} not found."
                )
                continue

            # Verify active status
            if not variant.get("is_active") or not product.get("is_active"):
                can_submit = False
                validation_issues.append(
                    f"'{product.get('name')}' ({variant.get('sku')}) is no longer active in the catalogue."
                )
                continue

            availability = variant.get("availability", "available")
            is_available = availability == "available"
            if not is_available:
                can_submit = False
                validation_issues.append(
                    f"'{product.get('name')}' ({variant.get('sku')}) is currently unavailable."
                )

            # Determine price and MOQ
            wholesale_moq = variant.get("wholesale_moq", 1)
            if is_wholesale_approved and variant.get("wholesale_price_paise") is not None:
                unit_price = variant["wholesale_price_paise"]
                moq_satisfied = req.quantity >= wholesale_moq
                if not moq_satisfied:
                    can_submit = False
                    sku = variant.get("sku")
                    validation_issues.append(
                        f"'{product.get('name')}' ({sku}) requires minimum order quantity of {wholesale_moq}."
                    )
            else:
                unit_price = variant.get("retail_price_paise", 0)
                moq_satisfied = True

            line_total = unit_price * req.quantity
            subtotal_paise += line_total
            total_quantity += req.quantity

            # Resolve image
            image_url = None
            if variant.get("gallery") and len(variant["gallery"]) > 0:
                image_url = variant["gallery"][0].get("url")
            elif product.get("gallery") and len(product["gallery"]) > 0:
                image_url = product["gallery"][0].get("url")

            line_valid = is_available and moq_satisfied
            validated_lines.append(
                CartLineItemResponse(
                    product_id=str(product["id"]),
                    variant_id=str(variant["id"]),
                    sku=variant.get("sku", ""),
                    product_name=product.get("name", ""),
                    variant_label=variant.get("label", ""),
                    image_url=image_url,
                    category_id=str(product.get("category_id", "")),
                    quantity=req.quantity,
                    unit_price_paise=unit_price,
                    line_total_paise=line_total,
                    wholesale_moq=wholesale_moq,
                    availability=availability,
                    moq_satisfied=moq_satisfied,
                    is_valid=line_valid,
                    issue=None if line_valid else "Availability or MOQ issue",
                )
            )

        if not validated_lines:
            can_submit = False
            validation_issues.append("Cart contains no valid items.")

        return CartValidateResponse(
            pricing_tier=pricing_tier,
            currency="INR",
            items=validated_lines,
            subtotal_paise=subtotal_paise,
            total_quantity=total_quantity,
            can_submit=can_submit,
            validation_issues=validation_issues,
        )
