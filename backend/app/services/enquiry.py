"""
Enquiry Service Layer.
Enforces:
1. Validating item availability, tier pricing & MOQs before creating enquiry.
2. Generating unique sequential human-readable enquiry IDs (TIF-YYYY-XXXXX).
3. Storing immutable item/pricing/customer snapshots.
4. Idempotency protection against rapid repeated clicks.
5. Generating WhatsApp click-to-chat URL with pre-filled message (customer manually taps send).
"""

import urllib.parse
from datetime import datetime, timezone

from fastapi import HTTPException, status
from pymongo.asynchronous.database import AsyncDatabase

from app.repositories.catalogue import CatalogueRepository
from app.repositories.enquiry import EnquiryRepository
from app.repositories.users import UserRepository
from app.schemas.cart import CartLineItemRequest
from app.schemas.enquiry import EnquiryCreateRequest, EnquiryResponse
from app.services.cart import CartService

DEFAULT_BUSINESS_WHATSAPP = "919443312345"  # Cumbum owner WhatsApp placeholder


class EnquiryService:
    def __init__(self, db: AsyncDatabase):
        self.db = db
        self.enquiry_repo = EnquiryRepository(db)
        self.user_repo = UserRepository(db)
        self.cat_repo = CatalogueRepository(db)
        self.cart_service = CartService(db)

    async def create_enquiry(
        self, user_id: str, payload: EnquiryCreateRequest
    ) -> EnquiryResponse:
        # 1. Check Idempotency Key
        if payload.idempotency_key:
            existing = await self.enquiry_repo.get_by_idempotency_key(payload.idempotency_key)
            if existing:
                whatsapp_url = self._build_whatsapp_url(existing)
                return EnquiryResponse(**existing, whatsapp_url=whatsapp_url)

        # 2. Fetch authenticated customer record
        user = await self.user_repo.get_by_id(user_id)
        if not user:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="User account not found.",
            )

        # 3. Perform authoritative server-side cart validation
        cart_requests = [
            CartLineItemRequest(
                product_id=it["product_id"],
                variant_id=it["variant_id"],
                quantity=it["quantity"],
            )
            for it in payload.items
        ]
        cart_result = await self.cart_service.validate_cart(cart_requests, user_id=user_id)

        if not cart_result.can_submit:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Cannot submit enquiry: {'; '.join(cart_result.validation_issues)}",
            )

        # 4. Generate sequential human-readable enquiry ID
        human_id = await self.enquiry_repo.get_next_enquiry_id()
        now = datetime.now(timezone.utc)

        # 5. Build immutable snapshots
        customer_snapshot = {
            "name": user["name"],
            "email": user["email"],
            "phone": user.get("phone"),
            "account_type_at_submission": user.get("account_type", "retail"),
        }

        item_snapshots = []
        for idx, line in enumerate(cart_result.items):
            variant_doc = await self.cat_repo.get_variant_by_id(line.variant_id)
            raw_item = payload.items[idx] if idx < len(payload.items) else {}
            custom_photo_snapshot = None
            custom_asset_id = raw_item.get("custom_photo_asset_id")
            if custom_asset_id:
                photo_doc = await self.db.custom_photos.find_one(
                    {"asset_id": str(custom_asset_id)}
                )
                if photo_doc:
                    custom_photo_snapshot = {
                        "asset_id": photo_doc["asset_id"],
                        "original_filename": photo_doc["original_filename"],
                        "mime_type": photo_doc["mime_type"],
                        "size_bytes": photo_doc["size_bytes"],
                        "edit_settings": photo_doc.get("edit_settings", {}),
                    }

            item_snapshots.append(
                {
                    "product_id": line.product_id,
                    "variant_id": line.variant_id,
                    "sku": line.sku,
                    "product_name": line.product_name,
                    "variant_label": line.variant_label,
                    "variant_attributes": variant_doc.get("attributes", {}) if variant_doc else {},
                    "image_snapshot_url": line.image_url,
                    "custom_photo": custom_photo_snapshot,
                    "quantity": line.quantity,
                    "unit_price_paise": line.unit_price_paise,
                    "line_total_paise": line.line_total_paise,
                }
            )

        enquiry_doc = {
            "enquiry_id": human_id,
            "customer_id": user_id,
            "customer_snapshot": customer_snapshot,
            "pricing_tier": cart_result.pricing_tier,
            "items": item_snapshots,
            "currency": "INR",
            "subtotal_paise": cart_result.subtotal_paise,
            "estimated_total_paise": cart_result.subtotal_paise,
            "quoted_total_paise": None,
            "payment_summary": {
                "received_total_paise": 0,
                "outstanding_paise": cart_result.subtotal_paise,
                "payment_status": "unpaid",
            },
            "enquiry_status": "pending",
            "status_history": [
                {
                    "status": "pending",
                    "changed_by": user_id,
                    "changed_at": now,
                    "note": "Initial submission via storefront cart.",
                }
            ],
            "customer_note": payload.customer_note,
            "idempotency_key": payload.idempotency_key,
        }

        # 6. Save in MongoDB first (strict rule #9)
        created = await self.enquiry_repo.create_enquiry(enquiry_doc)

        # 7. Generate WhatsApp click-to-chat URL for user manual send
        whatsapp_url = self._build_whatsapp_url(created)
        return EnquiryResponse(**created, whatsapp_url=whatsapp_url)

    async def get_enquiry_by_id(self, enquiry_id: str, user_id: str, is_owner: bool = False) -> EnquiryResponse:
        doc = await self.enquiry_repo.get_by_id(enquiry_id)
        if not doc:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Enquiry not found.")
        if not is_owner and doc["customer_id"] != user_id:
            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Access denied.")
        whatsapp_url = self._build_whatsapp_url(doc)
        return EnquiryResponse(**doc, whatsapp_url=whatsapp_url)

    async def list_customer_enquiries(self, user_id: str) -> list[EnquiryResponse]:
        docs = await self.enquiry_repo.list_by_customer(user_id)
        return [EnquiryResponse(**d, whatsapp_url=self._build_whatsapp_url(d)) for d in docs]

    def _build_whatsapp_url(self, doc: dict) -> str:
        """Constructs click-to-chat URL with pre-filled message text."""
        items_summary = "\n".join(
            [
                f"• {it['product_name']} ({it['variant_label']}) x {it['quantity']}"
                + (" [Custom Photo Attached]" if it.get("custom_photo") else "")
                for it in doc["items"]
            ]
        )
        total_inr = doc["estimated_total_paise"] / 100

        msg = (
            f"Hello The India Frames, I have submitted an order enquiry on your website.\n\n"
            f"Enquiry ID: *{doc['enquiry_id']}*\n"
            f"Customer: {doc['customer_snapshot']['name']}\n"
            f"Tier: {doc['pricing_tier'].capitalize()}\n\n"
            f"Items:\n{items_summary}\n\n"
            f"Estimated Total: ₹{total_inr:,.2f}\n\n"
            f"Please review availability and confirm my order. Thank you!"
        )

        encoded_msg = urllib.parse.quote(msg)
        return f"https://wa.me/{DEFAULT_BUSINESS_WHATSAPP}?text={encoded_msg}"
