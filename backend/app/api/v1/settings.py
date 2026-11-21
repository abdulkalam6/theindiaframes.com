"""
Public & Owner Business Settings API Router.
- GET /api/v1/settings/public (Public storefront details)
- GET /api/v1/admin/settings (Owner editable view)
- PATCH /api/v1/admin/settings (Owner update with audit log)
"""

from datetime import datetime, timezone
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, Request, status
from pymongo.asynchronous.database import AsyncDatabase

from app.api.v1.admin import require_owner
from app.core.responses import SuccessResponse
from app.database.session import get_db
from app.repositories.audit import AuditRepository
from app.schemas.auth import UserResponse
from app.schemas.settings import BusinessSettingsResponse, BusinessSettingsUpdateRequest

router = APIRouter(tags=["Business Settings"])

SETTINGS_DOC_ID = "business_settings"


async def load_business_settings(db: AsyncDatabase) -> BusinessSettingsResponse:
    doc = await db.settings.find_one({"_id": SETTINGS_DOC_ID})
    if not doc:
        return BusinessSettingsResponse()
    clean = {k: v for k, v in doc.items() if k != "_id"}
    return BusinessSettingsResponse(**clean)


@router.get("/settings/public", response_model=SuccessResponse[BusinessSettingsResponse])
async def get_public_settings(db: Optional[AsyncDatabase] = Depends(get_db)):
    if db is None:
        return SuccessResponse(data=BusinessSettingsResponse())
    data = await load_business_settings(db)
    return SuccessResponse(data=data)


@router.get("/admin/settings", response_model=SuccessResponse[BusinessSettingsResponse])
async def get_admin_settings(
    owner: UserResponse = Depends(require_owner),
    db: Optional[AsyncDatabase] = Depends(get_db),
):
    if db is None:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Database service not available.",
        )
    data = await load_business_settings(db)
    return SuccessResponse(data=data)


@router.patch("/admin/settings", response_model=SuccessResponse[BusinessSettingsResponse])
async def update_admin_settings(
    payload: BusinessSettingsUpdateRequest,
    request: Request,
    owner: UserResponse = Depends(require_owner),
    db: Optional[AsyncDatabase] = Depends(get_db),
):
    if db is None:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Database service not available.",
        )
    before = (await load_business_settings(db)).model_dump(mode="json")
    updates = {k: v for k, v in payload.model_dump().items() if v is not None}
    now = datetime.now(timezone.utc)
    updates["updated_at"] = now

    await db.settings.update_one(
        {"_id": SETTINGS_DOC_ID},
        {"$set": updates},
        upsert=True,
    )
    updated = await load_business_settings(db)

    audit = AuditRepository(db)
    await audit.log(
        actor_user_id=owner.id,
        action="settings.updated",
        entity_type="settings",
        entity_id=SETTINGS_DOC_ID,
        before=before,
        after=updated.model_dump(mode="json"),
        request_id=getattr(request.state, "request_id", None),
    )
    return SuccessResponse(data=updated)
