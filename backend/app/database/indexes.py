"""
MongoDB Database Indexes and Collections Initialization.
Enforces uniqueness, relations, and query optimizations from docs/DATABASE_SCHEMA.md.
"""

import logging

from pymongo import ASCENDING, IndexModel
from pymongo.asynchronous.database import AsyncDatabase

logger = logging.getLogger("the_india_frames.database.indexes")


async def create_indexes(db: AsyncDatabase) -> None:
    logger.info("Ensuring database indexes...")

    # 1. users
    await db.users.create_indexes([
        IndexModel([("email", ASCENDING)], unique=True),
        IndexModel([("account_type", ASCENDING)]),
        IndexModel([("wholesale_status", ASCENDING)]),
        IndexModel([("google_sub", ASCENDING)], sparse=True),
    ])

    # 2. wholesale_applications
    await db.wholesale_applications.create_indexes([
        IndexModel([("user_id", ASCENDING)]),
        IndexModel([("gstin", ASCENDING)]),
        IndexModel([("status", ASCENDING)]),
        IndexModel([("created_at", ASCENDING)]),
    ])

    # 3. categories
    await db.categories.create_indexes([
        IndexModel([("slug", ASCENDING)], unique=True),
        IndexModel([("parent_id", ASCENDING)]),
        IndexModel([("is_active", ASCENDING), ("sort_order", ASCENDING)]),
    ])

    # 4. products
    await db.products.create_indexes([
        IndexModel([("slug", ASCENDING)], unique=True),
        IndexModel([("base_sku", ASCENDING)], unique=True),
        IndexModel([("category_id", ASCENDING), ("is_active", ASCENDING)]),
        IndexModel([("is_featured", ASCENDING), ("is_active", ASCENDING)]),
        IndexModel([("tags", ASCENDING)]),
    ])

    # 5. product_variants
    await db.product_variants.create_indexes([
        IndexModel([("sku", ASCENDING)], unique=True),
        IndexModel([("product_id", ASCENDING), ("is_active", ASCENDING)]),
        IndexModel([("availability", ASCENDING)]),
    ])

    logger.info("Database indexes successfully verified and ensured.")
