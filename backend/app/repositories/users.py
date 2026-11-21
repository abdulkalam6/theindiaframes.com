"""
User & Session Repository for MongoDB.
"""

from datetime import datetime, timezone
from typing import Any, Dict, Optional

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


class UserRepository:
    def __init__(self, db: AsyncDatabase):
        self.db = db

    async def get_by_id(self, user_id: str) -> Optional[Dict[str, Any]]:
        if not ObjectId.is_valid(user_id):
            return None
        doc = await self.db.users.find_one({"_id": ObjectId(user_id)})
        return clean_doc(doc)

    async def get_by_email(self, email: str) -> Optional[Dict[str, Any]]:
        doc = await self.db.users.find_one({"email_normalized": email.lower().strip()})
        return clean_doc(doc)

    async def get_by_google_sub(self, google_sub: str) -> Optional[Dict[str, Any]]:
        doc = await self.db.users.find_one({"google_sub": google_sub})
        return clean_doc(doc)

    async def create_user(self, user_data: Dict[str, Any]) -> Dict[str, Any]:
        now = datetime.now(timezone.utc)
        doc = {
            **user_data,
            "email_normalized": user_data["email"].lower().strip(),
            "created_at": now,
            "updated_at": now,
            "last_login_at": now,
        }
        res = await self.db.users.insert_one(doc)
        doc["_id"] = res.inserted_id
        return clean_doc(doc)

    async def update_last_login(self, user_id: str) -> None:
        if ObjectId.is_valid(user_id):
            await self.db.users.update_one(
                {"_id": ObjectId(user_id)},
                {"$set": {"last_login_at": datetime.now(timezone.utc)}},
            )

    # --- SESSIONS ---
    async def create_session(self, user_id: str, token: str) -> None:
        now = datetime.now(timezone.utc)
        await self.db.sessions.insert_one({
            "token": token,
            "user_id": ObjectId(user_id),
            "created_at": now,
        })

    async def get_session(self, token: str) -> Optional[Dict[str, Any]]:
        doc = await self.db.sessions.find_one({"token": token})
        return clean_doc(doc)

    async def delete_session(self, token: str) -> None:
        await self.db.sessions.delete_one({"token": token})
