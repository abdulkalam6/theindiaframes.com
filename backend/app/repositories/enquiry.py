"""
Enquiry Repository for MongoDB.
Handles enquiry sequencing (TIF-YYYY-XXXXX), idempotency, and immutable persistence.
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


class EnquiryRepository:
    def __init__(self, db: AsyncDatabase):
        self.db = db

    async def get_next_enquiry_id(self) -> str:
        """Generate human-readable sequential identifier e.g. TIF-2026-00001"""
        year = datetime.now(timezone.utc).year
        counter = await self.db.counters.find_one_and_update(
            {"_id": f"enquiry_{year}"},
            {"$inc": {"seq": 1}},
            upsert=True,
            return_document=True,
        )
        seq = counter["seq"]
        return f"TIF-{year}-{seq:05d}"

    async def get_by_idempotency_key(self, key: str) -> Optional[Dict[str, Any]]:
        doc = await self.db.enquiries.find_one({"idempotency_key": key})
        return clean_doc(doc)

    async def get_by_id(self, enquiry_id: str) -> Optional[Dict[str, Any]]:
        if not ObjectId.is_valid(enquiry_id):
            return None
        doc = await self.db.enquiries.find_one({"_id": ObjectId(enquiry_id)})
        return clean_doc(doc)

    async def get_by_human_id(self, human_enquiry_id: str) -> Optional[Dict[str, Any]]:
        doc = await self.db.enquiries.find_one({"enquiry_id": human_enquiry_id})
        return clean_doc(doc)

    async def list_by_customer(self, customer_id: str) -> List[Dict[str, Any]]:
        if not ObjectId.is_valid(customer_id):
            return []
        cursor = self.db.enquiries.find({"customer_id": ObjectId(customer_id)}).sort(
            "created_at", -1
        )
        items = []
        async for doc in cursor:
            items.append(clean_doc(doc))
        return items

    async def list_all(
        self, status: Optional[str] = None, limit: int = 50, skip: int = 0
    ) -> List[Dict[str, Any]]:
        query = {"enquiry_status": status} if status else {}
        cursor = self.db.enquiries.find(query).sort("created_at", -1).skip(skip).limit(limit)
        items = []
        async for doc in cursor:
            items.append(clean_doc(doc))
        return items

    async def create_enquiry(self, data: Dict[str, Any]) -> Dict[str, Any]:
        now = datetime.now(timezone.utc)
        doc = {
            **data,
            "customer_id": ObjectId(data["customer_id"]),
            "created_at": now,
            "updated_at": now,
        }
        res = await self.db.enquiries.insert_one(doc)
        doc["_id"] = res.inserted_id
        return clean_doc(doc)
