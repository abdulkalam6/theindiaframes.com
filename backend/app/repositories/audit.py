"""
Audit Log Repository for sensitive owner actions and business adjustments.
Follows docs/DATABASE_SCHEMA.md Section 12.
Never stores passwords, tokens, or private proof contents.
"""

from datetime import datetime, timezone
from typing import Any, Dict, List, Optional

from bson import ObjectId
from pymongo.asynchronous.client_session import AsyncClientSession
from pymongo.asynchronous.database import AsyncDatabase


class AuditRepository:
    def __init__(self, db: AsyncDatabase):
        self.db = db

    async def log(
        self,
        *,
        actor_user_id: str,
        action: str,
        entity_type: str,
        entity_id: str,
        before: Optional[Dict[str, Any]] = None,
        after: Optional[Dict[str, Any]] = None,
        request_id: Optional[str] = None,
        session: Optional[AsyncClientSession] = None,
    ) -> Dict[str, Any]:
        doc = {
            "actor_user_id": ObjectId(actor_user_id)
            if ObjectId.is_valid(actor_user_id)
            else actor_user_id,
            "action": action,
            "entity_type": entity_type,
            "entity_id": ObjectId(entity_id) if ObjectId.is_valid(entity_id) else entity_id,
            "before": before or {},
            "after": after or {},
            "request_id": request_id,
            "created_at": datetime.now(timezone.utc),
        }
        res = await self.db.audit_logs.insert_one(doc, session=session)
        doc["_id"] = res.inserted_id
        return doc

    async def list_by_entity(
        self, entity_type: str, entity_id: str, limit: int = 50
    ) -> List[Dict[str, Any]]:
        id_candidates: List[Any] = [entity_id]
        if ObjectId.is_valid(entity_id):
            id_candidates.append(ObjectId(entity_id))
        cursor = (
            self.db.audit_logs.find(
                {"entity_type": entity_type, "entity_id": {"$in": id_candidates}}
            )
            .sort("created_at", -1)
            .limit(limit)
        )
        items = []
        async for doc in cursor:
            items.append(
                {
                    "id": str(doc["_id"]),
                    "actor_user_id": str(doc["actor_user_id"]),
                    "action": doc["action"],
                    "entity_type": doc["entity_type"],
                    "entity_id": str(doc["entity_id"]),
                    "before": doc.get("before", {}),
                    "after": doc.get("after", {}),
                    "request_id": doc.get("request_id"),
                    "created_at": doc["created_at"],
                }
            )
        return items
