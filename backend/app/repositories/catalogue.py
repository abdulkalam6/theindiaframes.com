"""
Catalogue Repository handling Categories, Products, and Variants.
Performs PyMongo Async queries with safe ObjectId serialization.
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


class CatalogueRepository:
    def __init__(self, db: AsyncDatabase):
        self.db = db

    # --- CATEGORIES ---
    async def create_category(self, data: Dict[str, Any]) -> Dict[str, Any]:
        now = datetime.now(timezone.utc)
        doc = {**data, "created_at": now, "updated_at": now}
        if doc.get("parent_id"):
            doc["parent_id"] = ObjectId(doc["parent_id"])
        res = await self.db.categories.insert_one(doc)
        doc["_id"] = res.inserted_id
        return clean_doc(doc)

    async def get_category_by_id(self, category_id: str) -> Optional[Dict[str, Any]]:
        if not ObjectId.is_valid(category_id):
            return None
        doc = await self.db.categories.find_one({"_id": ObjectId(category_id)})
        return clean_doc(doc)

    async def get_category_by_slug(self, slug: str) -> Optional[Dict[str, Any]]:
        doc = await self.db.categories.find_one({"slug": slug})
        return clean_doc(doc)

    async def list_categories(self, active_only: bool = True) -> List[Dict[str, Any]]:
        query = {"is_active": True} if active_only else {}
        cursor = self.db.categories.find(query).sort("sort_order", 1)
        items = []
        async for doc in cursor:
            items.append(clean_doc(doc))
        return items

    async def update_category(self, category_id: str, data: Dict[str, Any]) -> Optional[Dict[str, Any]]:
        if not ObjectId.is_valid(category_id):
            return None
        update_data = {k: v for k, v in data.items() if v is not None}
        if "parent_id" in update_data and update_data["parent_id"]:
            update_data["parent_id"] = ObjectId(update_data["parent_id"])
        update_data["updated_at"] = datetime.now(timezone.utc)
        await self.db.categories.update_one(
            {"_id": ObjectId(category_id)}, {"$set": update_data}
        )
        return await self.get_category_by_id(category_id)

    # --- PRODUCTS ---
    async def create_product(self, data: Dict[str, Any]) -> Dict[str, Any]:
        now = datetime.now(timezone.utc)
        doc = {**data, "created_at": now, "updated_at": now}
        if doc.get("category_id"):
            doc["category_id"] = ObjectId(doc["category_id"])
        if doc.get("subcategory_id"):
            doc["subcategory_id"] = ObjectId(doc["subcategory_id"])
        res = await self.db.products.insert_one(doc)
        doc["_id"] = res.inserted_id
        return clean_doc(doc)

    async def get_product_by_id(self, product_id: str) -> Optional[Dict[str, Any]]:
        if not ObjectId.is_valid(product_id):
            return None
        doc = await self.db.products.find_one({"_id": ObjectId(product_id)})
        return clean_doc(doc)

    async def get_product_by_slug(self, slug: str) -> Optional[Dict[str, Any]]:
        doc = await self.db.products.find_one({"slug": slug})
        return clean_doc(doc)

    async def get_product_by_sku(self, sku: str) -> Optional[Dict[str, Any]]:
        doc = await self.db.products.find_one({"base_sku": sku})
        return clean_doc(doc)

    async def list_products(
        self,
        category_id: Optional[str] = None,
        active_only: bool = True,
        featured_only: bool = False,
        limit: int = 50,
        skip: int = 0,
    ) -> List[Dict[str, Any]]:
        query: Dict[str, Any] = {}
        if active_only:
            query["is_active"] = True
        if featured_only:
            query["is_featured"] = True
        if category_id and ObjectId.is_valid(category_id):
            query["category_id"] = ObjectId(category_id)

        cursor = self.db.products.find(query).skip(skip).limit(limit).sort("created_at", -1)
        items = []
        async for doc in cursor:
            items.append(clean_doc(doc))
        return items

    async def update_product(self, product_id: str, data: Dict[str, Any]) -> Optional[Dict[str, Any]]:
        if not ObjectId.is_valid(product_id):
            return None
        update_data = {k: v for k, v in data.items() if v is not None}
        if "category_id" in update_data and update_data["category_id"]:
            update_data["category_id"] = ObjectId(update_data["category_id"])
        if "subcategory_id" in update_data and update_data["subcategory_id"]:
            update_data["subcategory_id"] = ObjectId(update_data["subcategory_id"])
        update_data["updated_at"] = datetime.now(timezone.utc)
        await self.db.products.update_one(
            {"_id": ObjectId(product_id)}, {"$set": update_data}
        )
        return await self.get_product_by_id(product_id)

    # --- VARIANTS ---
    async def create_variant(self, product_id: str, data: Dict[str, Any]) -> Dict[str, Any]:
        now = datetime.now(timezone.utc)
        doc = {
            **data,
            "product_id": ObjectId(product_id),
            "created_at": now,
            "updated_at": now,
        }
        res = await self.db.product_variants.insert_one(doc)
        doc["_id"] = res.inserted_id
        return clean_doc(doc)

    async def get_variant_by_id(self, variant_id: str) -> Optional[Dict[str, Any]]:
        if not ObjectId.is_valid(variant_id):
            return None
        doc = await self.db.product_variants.find_one({"_id": ObjectId(variant_id)})
        return clean_doc(doc)

    async def get_variant_by_sku(self, sku: str) -> Optional[Dict[str, Any]]:
        doc = await self.db.product_variants.find_one({"sku": sku})
        return clean_doc(doc)

    async def list_variants_by_product(
        self, product_id: str, active_only: bool = True
    ) -> List[Dict[str, Any]]:
        if not ObjectId.is_valid(product_id):
            return []
        query: Dict[str, Any] = {"product_id": ObjectId(product_id)}
        if active_only:
            query["is_active"] = True
        cursor = self.db.product_variants.find(query)
        items = []
        async for doc in cursor:
            items.append(clean_doc(doc))
        return items

    async def update_variant(self, variant_id: str, data: Dict[str, Any]) -> Optional[Dict[str, Any]]:
        if not ObjectId.is_valid(variant_id):
            return None
        update_data = {k: v for k, v in data.items() if v is not None}
        update_data["updated_at"] = datetime.now(timezone.utc)
        await self.db.product_variants.update_one(
            {"_id": ObjectId(variant_id)}, {"$set": update_data}
        )
        return await self.get_variant_by_id(variant_id)
