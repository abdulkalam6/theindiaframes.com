"""
Custom Frame Photo Upload & Private Owner/Customer Download API.
- Customer photos are stored privately under `backend/uploads/custom_photos/` (never served publicly).
- Magic-byte verification ensures only real JPEG, PNG, or WebP images are stored.
- Owner downloads print-ready photos via `GET /api/v1/admin/enquiries/{enquiry_id}/photos/{asset_id}`.
"""

import json
import os
import re
import uuid
from datetime import datetime, timezone
from pathlib import Path
from typing import Any, Dict, Optional

from fastapi import (
    APIRouter,
    Cookie,
    Depends,
    File,
    Form,
    HTTPException,
    Query,
    UploadFile,
    status,
)
from fastapi.responses import FileResponse
from pymongo.asynchronous.database import AsyncDatabase

from app.api.v1.admin import require_owner
from app.api.v1.auth import get_auth_service, get_current_user
from app.core.responses import SuccessResponse
from app.database.session import get_db
from app.repositories.enquiry import EnquiryRepository
from app.schemas.auth import UserResponse
from app.schemas.enquiry import CustomPhotoUploadResponse
from app.services.auth import AuthService

router = APIRouter(tags=["Custom Frame Photos"])

MAX_PHOTO_BYTES = 15 * 1024 * 1024  # 15 MB max print-ready photo
ALLOWED_MIME_EXT = {
    "image/jpeg": "jpg",
    "image/png": "png",
    "image/webp": "webp",
}

UPLOAD_ROOT = Path(__file__).resolve().parents[3] / "uploads" / "custom_photos"


def _detect_image_mime(data: bytes) -> Optional[str]:
    """Inspect magic bytes to confirm actual image format."""
    if len(data) < 12:
        return None
    if data[:3] == b"\xff\xd8\xff":
        return "image/jpeg"
    if data[:8] == b"\x89PNG\r\n\x1a\n":
        return "image/png"
    if data[:4] == b"RIFF" and data[8:12] == b"WEBP":
        return "image/webp"
    return None


def _safe_filename(name: Optional[str], fallback_ext: str) -> str:
    base = os.path.basename(name or f"custom-photo.{fallback_ext}")
    cleaned = re.sub(r"[^A-Za-z0-9._-]+", "_", base).strip("._")
    return cleaned[:120] or f"custom-photo.{fallback_ext}"


@router.post(
    "/custom-photos/upload",
    response_model=SuccessResponse[CustomPhotoUploadResponse],
    status_code=status.HTTP_201_CREATED,
)
async def upload_custom_photo(
    photo: UploadFile = File(...),
    edit_settings: Optional[str] = Form(None),
    tif_session: Optional[str] = Cookie(None),
    db: Optional[AsyncDatabase] = Depends(get_db),
    auth_service: AuthService = Depends(get_auth_service),
):
    """
    Upload a customer-edited photo for framing before adding to cart.
    Stored privately on disk; linked immutably to the enquiry upon submission.
    """
    if db is None:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Database service not available.",
        )

    raw_bytes = await photo.read(MAX_PHOTO_BYTES + 1)
    if not raw_bytes:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Uploaded image file is empty.",
        )
    if len(raw_bytes) > MAX_PHOTO_BYTES:
        raise HTTPException(
            status_code=status.HTTP_413_REQUEST_ENTITY_TOO_LARGE,
            detail="Photo exceeds maximum size of 15 MB.",
        )

    detected_mime = _detect_image_mime(raw_bytes)
    if not detected_mime or detected_mime not in ALLOWED_MIME_EXT:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid image file. Only JPEG, PNG, and WebP photos are supported.",
        )

    parsed_settings: Dict[str, Any] = {}
    if edit_settings:
        try:
            loaded = json.loads(edit_settings)
            if isinstance(loaded, dict):
                parsed_settings = loaded
        except json.JSONDecodeError as exc:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="edit_settings must be valid JSON.",
            ) from exc

    uploaded_by_user_id: Optional[str] = None
    if tif_session:
        user = await auth_service.get_current_user_from_token(tif_session)
        if user:
            uploaded_by_user_id = user.id

    ext = ALLOWED_MIME_EXT[detected_mime]
    asset_id = uuid.uuid4().hex
    stored_filename = f"{asset_id}.{ext}"
    original_filename = _safe_filename(photo.filename, ext)

    UPLOAD_ROOT.mkdir(parents=True, exist_ok=True)
    file_path = UPLOAD_ROOT / stored_filename
    file_path.write_bytes(raw_bytes)

    now = datetime.now(timezone.utc)
    await db.custom_photos.insert_one(
        {
            "asset_id": asset_id,
            "stored_filename": stored_filename,
            "original_filename": original_filename,
            "mime_type": detected_mime,
            "size_bytes": len(raw_bytes),
            "edit_settings": parsed_settings,
            "uploaded_by_user_id": uploaded_by_user_id,
            "created_at": now,
        }
    )

    return SuccessResponse(
        data=CustomPhotoUploadResponse(
            asset_id=asset_id,
            original_filename=original_filename,
            mime_type=detected_mime,
            size_bytes=len(raw_bytes),
            edit_settings=parsed_settings,
        )
    )


async def _serve_enquiry_photo(
    db: AsyncDatabase,
    enquiry_id: str,
    asset_id: str,
    inline: bool,
    requester_user_id: str,
    is_owner: bool,
) -> FileResponse:
    enquiry_repo = EnquiryRepository(db)
    enquiry = await enquiry_repo.get_by_id(enquiry_id)
    if not enquiry:
        enquiry = await enquiry_repo.get_by_human_id(enquiry_id)
    if not enquiry:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Enquiry not found."
        )

    if not is_owner and enquiry.get("customer_id") != requester_user_id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN, detail="Access denied."
        )

    # Confirm the requested asset_id actually belongs to one of this enquiry's items
    matched_item = None
    for item in enquiry.get("items", []):
        cp = item.get("custom_photo")
        if cp and cp.get("asset_id") == asset_id:
            matched_item = item
            break

    if not matched_item:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Custom photo not attached to this enquiry.",
        )

    photo_doc = await db.custom_photos.find_one({"asset_id": asset_id})
    if not photo_doc:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Custom photo file metadata not found.",
        )

    stored_name = os.path.basename(photo_doc["stored_filename"])
    file_path = UPLOAD_ROOT / stored_name
    if not file_path.is_file():
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Stored photo file is missing.",
        )

    ext = ALLOWED_MIME_EXT.get(photo_doc["mime_type"], "jpg")
    download_name = _safe_filename(
        f"{enquiry['enquiry_id']}-{matched_item.get('sku', 'frame')}-{photo_doc['original_filename']}",
        ext,
    )
    disposition = "inline" if inline else "attachment"

    return FileResponse(
        path=str(file_path),
        media_type=photo_doc["mime_type"],
        headers={
            "Content-Disposition": f'{disposition}; filename="{download_name}"',
            "Cache-Control": "private, max-age=300",
        },
    )


@router.get("/admin/enquiries/{enquiry_id}/photos/{asset_id}")
async def owner_download_enquiry_photo(
    enquiry_id: str,
    asset_id: str,
    inline: bool = Query(False),
    owner: UserResponse = Depends(require_owner),
    db: Optional[AsyncDatabase] = Depends(get_db),
):
    """Owner-only preview/download of a customer's edited print-ready photo."""
    if db is None:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Database service not available.",
        )
    return await _serve_enquiry_photo(
        db=db,
        enquiry_id=enquiry_id,
        asset_id=asset_id,
        inline=inline,
        requester_user_id=owner.id,
        is_owner=True,
    )


@router.get("/enquiries/{enquiry_id}/photos/{asset_id}")
async def customer_download_enquiry_photo(
    enquiry_id: str,
    asset_id: str,
    inline: bool = Query(False),
    current_user: UserResponse = Depends(get_current_user),
    db: Optional[AsyncDatabase] = Depends(get_db),
):
    """Customer (enquiry owner) or Owner preview/download of attached photo."""
    if db is None:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Database service not available.",
        )
    return await _serve_enquiry_photo(
        db=db,
        enquiry_id=enquiry_id,
        asset_id=asset_id,
        inline=inline,
        requester_user_id=current_user.id,
        is_owner=current_user.account_type == "owner",
    )
