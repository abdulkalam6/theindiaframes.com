"""
Wholesale Application Service Layer.
Handles mandatory GSTIN validation, secure private document storage,
customer submissions, owner review/approval, and authenticated proof access.
"""

import uuid
from datetime import datetime, timezone
from pathlib import Path
from typing import Optional

from fastapi import HTTPException, UploadFile, status
from pymongo.asynchronous.database import AsyncDatabase

from app.repositories.wholesale import WholesaleRepository
from app.schemas.wholesale import (
    AdminWholesaleApplicationResponse,
    CustomerWholesaleApplicationResponse,
    WholesaleApplicationCreate,
    WholesaleReviewRequest,
)

UPLOAD_DIR = Path("backend/uploads/proofs")
ALLOWED_MIME_TYPES = {
    "application/pdf",
    "image/jpeg",
    "image/png",
    "image/webp",
}
MAX_FILE_SIZE = 10 * 1024 * 1024  # 10 MB


class WholesaleService:
    def __init__(self, db: AsyncDatabase):
        self.repo = WholesaleRepository(db)

    async def submit_application(
        self,
        user_id: str,
        payload: WholesaleApplicationCreate,
        proof_file: UploadFile,
    ) -> CustomerWholesaleApplicationResponse:
        # 1. Verify user doesn't already have an approved or pending application
        existing = await self.repo.get_latest_by_user_id(user_id)
        if existing and existing.get("status") == "approved":
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail="Your account is already an approved wholesale customer.",
            )
        if existing and existing.get("status") == "pending":
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail="You already have a pending wholesale application under owner review.",
            )

        # 2. Validate Proof File
        if proof_file.content_type not in ALLOWED_MIME_TYPES:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Only PDF, PNG, JPEG or WebP proof documents are accepted.",
            )

        content = await proof_file.read()
        if len(content) > MAX_FILE_SIZE:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Proof document size must not exceed 10 MB.",
            )

        # 3. Store private document securely (never accessible via public URL)
        UPLOAD_DIR.mkdir(parents=True, exist_ok=True)
        file_ext = Path(proof_file.filename or "proof.pdf").suffix or ".pdf"
        asset_id = f"proof_{uuid.uuid4().hex}{file_ext}"
        target_path = UPLOAD_DIR / asset_id

        with open(target_path, "wb") as f:
            f.write(content)

        now = datetime.now(timezone.utc)
        data = payload.model_dump()
        data["user_id"] = user_id
        data["gstin"] = payload.gstin.upper().strip()
        data["proof_document"] = {
            "provider": "private_local_storage",
            "asset_id": asset_id,
            "original_filename": proof_file.filename or "proof.pdf",
            "mime_type": proof_file.content_type,
            "uploaded_at": now,
        }

        created = await self.repo.create_application(data)
        return CustomerWholesaleApplicationResponse(**created)

    async def get_user_application(self, user_id: str) -> Optional[CustomerWholesaleApplicationResponse]:
        doc = await self.repo.get_latest_by_user_id(user_id)
        if not doc:
            return None
        return CustomerWholesaleApplicationResponse(**doc)

    async def list_admin_applications(
        self, status_filter: str | None = None
    ) -> list[AdminWholesaleApplicationResponse]:
        docs = await self.repo.list_applications(status=status_filter)
        return [AdminWholesaleApplicationResponse(**d) for d in docs]

    async def review_application(
        self,
        application_id: str,
        reviewer_id: str,
        payload: WholesaleReviewRequest,
    ) -> AdminWholesaleApplicationResponse:
        app_doc = await self.repo.get_by_id(application_id)
        if not app_doc:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Application not found.")

        updated = await self.repo.update_application_status(
            application_id=application_id,
            user_id=app_doc["user_id"],
            decision=payload.decision,
            reviewed_by=reviewer_id,
            internal_note=payload.internal_note,
        )
        return AdminWholesaleApplicationResponse(**updated)

    async def get_proof_file_path(self, application_id: str) -> tuple[Path, str, str]:
        """Owner-only file access. Returns (path, original_filename, mime_type)."""
        app_doc = await self.repo.get_by_id(application_id)
        if not app_doc:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Application not found.")

        proof = app_doc.get("proof_document", {})
        asset_id = proof.get("asset_id")
        file_path = UPLOAD_DIR / asset_id

        if not file_path.exists():
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND, detail="Proof file not found on server."
            )

        return file_path, proof.get("original_filename", "proof.pdf"), proof.get("mime_type", "application/pdf")
