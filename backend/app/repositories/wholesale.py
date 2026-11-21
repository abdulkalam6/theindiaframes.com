"""
Wholesale Application Repository for MongoDB.
"""

from datetime import datetime, timezone
from typing import Any, Dict, List, Optional

from bson import ObjectId
from pymongo.asynchronous.database import AsyncDatabase


def clean_doc(doc: Optional[Dict[str, Any]]) -> Optional[Dict[str, Any]]:
    if not doc:
        return None
    d = dict(doc)
    if "_id" in d:
        d["id"] = str(d.pop("_id"))
    for k, v in d.items():
        if isinstance(v, ObjectId):
            d[k] = str(v)
    return d


class WholesaleRepository:
    def __init__(self, db: AsyncDatabase):
        self.db = db

    async def get_by_id(self, application_id: str) -> Optional[Dict[str, Any]]:
        if not ObjectId.is_valid(application_id):
            return None
        doc = await self.db.wholesale_applications.find_one({"_id": ObjectId(application_id)})
        return clean_doc(doc)

    async def get_latest_by_user_id(self, user_id: str) -> Optional[Dict[str, Any]]:
        if not ObjectId.is_valid(user_id):
            return None
        doc = await self.db.wholesale_applications.find_one(
            {"user_id": ObjectId(user_id)},
            sort=[("created_at", -1)],
        )
        return clean_doc(doc)

    async def list_applications(
        self, status: Optional[str] = None, limit: int = 50, skip: int = 0
    ) -> List[Dict[str, Any]]:
        query = {"status": status} if status else {}
        cursor = (
            self.db.wholesale_applications.find(query)
            .sort("created_at", -1)
            .skip(skip)
            .limit(limit)
        )
        items = []
        async for doc in cursor:
            items.append(clean_doc(doc))
        return items

    async def create_application(self, data: Dict[str, Any]) -> Dict[str, Any]:
        now = datetime.now(timezone.utc)
        doc = {
            **data,
            "user_id": ObjectId(data["user_id"]),
            "status": "pending",
            "created_at": now,
            "updated_at": now,
        }
        res = await self.db.wholesale_applications.insert_one(doc)
        doc["_id"] = res.inserted_id

        # Update user's wholesale_status to pending in tandem
        await self.db.users.update_one(
            {"_id": ObjectId(data["user_id"])},
            {"$set": {"wholesale_status": "pending", "updated_at": now}},
        )

        return clean_doc(doc)

    async def update_application_status(
        self,
        application_id: str,
        user_id: str,
        decision: str,
        reviewed_by: str,
        internal_note: Optional[str] = None,
    ) -> Optional[Dict[str, Any]]:
        if not ObjectId.is_valid(application_id):
            return None
        now = datetime.now(timezone.utc)

        # 1. Update application record
        await self.db.wholesale_applications.update_one(
            {"_id": ObjectId(application_id)},
            {
                "$set": {
                    "status": decision,
                    "owner_internal_note": internal_note,
                    "reviewed_by": reviewed_by,
                    "reviewed_at": now,
                    "updated_at": now,
                }
            },
        )

        # 2. Update user record: if approved, set account_type to wholesale & status to approved
        user_update: Dict[str, Any] = {
            "wholesale_status": decision,
            "updated_at": now,
        }
        if decision == "approved":
            user_update["account_type"] = "wholesale"
        elif decision == "rejected":
            user_update["account_type"] = "retail"

        await self.db.users.update_one(
            {"_id": ObjectId(user_id)},
            {"$set": user_update},
        )

        return await self.get_by_id(application_id)
