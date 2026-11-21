"""
Owner Product & Variant Image Upload + Local Public Media Delivery Router.
- POST /api/v1/admin/products/{product_id}/images (Owner-only public product/variant upload)
- DELETE /api/v1/admin/products/{product_id}/images/{asset_id} (Owner-only image removal)
- GET /api/v1/media/{file_path:path} (Public delivery of `public/` assets in local mode)
"""

import uuid
from datetime import datetime, timezone
from typing import Optional

from bson import ObjectId
from fastapi import APIRouter, Depends, File, Form, HTTPException, Request, UploadFile, status
from fastapi.responses import Response
from pymongo.asynchronous.database import AsyncDatabase

from app.api.v1.admin import require_owner
from app.core.responses import SuccessResponse
from app.database.session import get_db
from app.repositories.audit import AuditRepository
from app.schemas.auth import UserResponse
from app.schemas.catalogue import MediaAsset
from app.services.storage import storage_service

router = APIRouter(tags=["Product Media"])

MAX_PRODUCT_IMAGE_BYTES = 10 * 1024 * 1024  # 10 MB
ALLOWED_MIME_EXT = {
    "image/jpeg": "jpg",
    "image/png": "png",
    "image/webp": "webp",
}


def _detect_image_mime(data: bytes) -> Optional[str]:
    if len(data) < 12:
        return None
    if data[:3] == b"\xff\xd8\xff":
        return "image/jpeg"
    if data[:8] == b"\x89PNG\r\n\x1a\n":
        return "image/png"
    if data[:4] == b"RIFF" and data[8:12] == b"WEBP":
        return "image/webp"
    return None


@router.get("/media/{file_path:path}")
async def serve_public_media(file_path: str):
    """Serve owner-uploaded public product/category media when using local storage."""
    result = await storage_service.read_public(file_path)
    if result is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Media asset not found."
        )
    data, mime = result
    return Response(
        content=data,
        media_type=mime,
        headers={"Cache-Control": "public, max-age=31536000, immutable"},
    )


@router.post(
    "/admin/products/{product_id}/images",
    response_model=SuccessResponse[MediaAsset],
    status_code=status.HTTP_201_CREATED,
)
async def upload_product_image(
    product_id: str,
    request: Request,
    image: UploadFile = File(...),
    variant_id: Optional[str] = Form(None),
    alt: Optional[str] = Form(None),
    owner: UserResponse = Depends(require_owner),
    db: Optional[AsyncDatabase] = Depends(get_db),
):
    """Owner-only upload of a real product or variant image to public storage (Local or Cloudflare R2)."""
    if db is None:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Database service not available.",
        )
    if not ObjectId.is_valid(product_id):
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Product not found."
        )
    prod = await db.products.find_one({"_id": ObjectId(product_id)})
    if not prod:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Product not found."
        )

    raw_bytes = await image.read(MAX_PRODUCT_IMAGE_BYTES + 1)
    if not raw_bytes:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST, detail="Image file is empty."
        )
    if len(raw_bytes) > MAX_PRODUCT_IMAGE_BYTES:
        raise HTTPException(
            status_code=status.HTTP_413_REQUEST_ENTITY_TOO_LARGE,
            detail="Product image must not exceed 10 MB.",
        )

    detected_mime = _detect_image_mime(raw_bytes)
    if not detected_mime or detected_mime not in ALLOWED_MIME_EXT:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Only JPEG, PNG, and WebP images are supported.",
        )

    ext = ALLOWED_MIME_EXT[detected_mime]
    asset_id = f"prod_{uuid.uuid4().hex}"
    storage_key = f"products/{product_id}/{asset_id}.{ext}"
    public_url = await storage_service.save_public(storage_key, raw_bytes, detected_mime)

    now = datetime.now(timezone.utc)
    media_doc = {
        "asset_id": asset_id,
        "storage_key": storage_key,
        "url": public_url,
        "alt": (alt or prod.get("name", "Product photo")).strip(),
        "sort_order": 0,
    }

    if variant_id:
        if not ObjectId.is_valid(variant_id):
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND, detail="Variant not found."
            )
        var = await db.product_variants.find_one(
            {"_id": ObjectId(variant_id), "product_id": ObjectId(product_id)}
        )
        if not var:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND, detail="Variant not found."
            )
        # Prepend uploaded photo so it becomes the active primary variant image
        existing_gallery = [
            g for g in var.get("gallery", []) if not str(g.get("asset_id", "")).startswith("qa-")
        ]
        new_gallery = [media_doc, *existing_gallery]
        await db.product_variants.update_one(
            {"_id": ObjectId(variant_id)},
            {"$set": {"gallery": new_gallery, "updated_at": now}},
        )
    else:
        existing_gallery = [
            g for g in prod.get("gallery", []) if not str(g.get("asset_id", "")).startswith("qa-")
        ]
        new_gallery = [media_doc, *existing_gallery]
        await db.products.update_one(
            {"_id": ObjectId(product_id)},
            {"$set": {"gallery": new_gallery, "updated_at": now}},
        )
        # Also clear QA placeholder on variants that still only have QA svg so real photo shows immediately
        await db.product_variants.update_many(
            {
                "product_id": ObjectId(product_id),
                "gallery.asset_id": {"$regex": "^qa-"},
            },
            {"$set": {"gallery": [], "updated_at": now}},
        )

    audit = AuditRepository(db)
    await audit.log(
        actor_user_id=owner.id,
        action="catalogue.image.uploaded",
        entity_type="product",
        entity_id=product_id,
        after={
            "asset_id": asset_id,
            "variant_id": variant_id,
            "url": public_url,
            "provider": storage_service.provider,
        },
        request_id=getattr(request.state, "request_id", None),
    )

    return SuccessResponse(data=MediaAsset(**media_doc))


@router.delete(
    "/admin/products/{product_id}/images/{asset_id}",
    response_model=SuccessResponse[dict],
)
async def delete_product_image(
    product_id: str,
    asset_id: str,
    owner: UserResponse = Depends(require_owner),
    db: Optional[AsyncDatabase] = Depends(get_db),
):
    """Remove an image from a product or its variants."""
    if db is None:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Database service not available.",
        )
    if not ObjectId.is_valid(product_id):
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Product not found."
        )
    prod = await db.products.find_one({"_id": ObjectId(product_id)})
    if not prod:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Product not found."
        )

    for g in prod.get("gallery", []):
        if g.get("asset_id") == asset_id and g.get("storage_key"):
            await storage_service.delete_public(g["storage_key"])

    now = datetime.now(timezone.utc)
    await db.products.update_one(
        {"_id": ObjectId(product_id)},
        {"$pull": {"gallery": {"asset_id": asset_id}}, "$set": {"updated_at": now}},
    )
    await db.product_variants.update_many(
        {"product_id": ObjectId(product_id)},
        {"$pull": {"gallery": {"asset_id": asset_id}}, "$set": {"updated_at": now}},
    )
    return SuccessResponse(data={"deleted": asset_id})
