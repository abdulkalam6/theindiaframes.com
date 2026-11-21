"""
MongoDB Database Indexes and Collections Initialization.
Enforces uniqueness, relations, and query optimizations from docs/DATABASE_SCHEMA.md.
"""

import logging

from pymongo import ASCENDING, DESCENDING, IndexModel
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

    # 6. enquiries
    await db.enquiries.create_indexes([
        IndexModel([("enquiry_id", ASCENDING)], unique=True),
        IndexModel([("customer_id", ASCENDING), ("created_at", DESCENDING)]),
        IndexModel([("enquiry_status", ASCENDING), ("created_at", DESCENDING)]),
        IndexModel(
            [("idempotency_key", ASCENDING)],
            unique=True,
            partialFilterExpression={"idempotency_key": {"$type": "string"}},
        ),
    ])

    # 7. offline_sales
    await db.offline_sales.create_indexes([
        IndexModel([("sale_id", ASCENDING)], unique=True),
        IndexModel([("created_at", DESCENDING)]),
        IndexModel([("payment_summary.payment_status", ASCENDING)]),
    ])

    # 8. payments (immutable ledger for both online enquiries and offline sales)
    await db.payments.create_indexes([
        IndexModel([("payment_id", ASCENDING)], unique=True),
        IndexModel(
            [("source_type", ASCENDING), ("source_id", ASCENDING), ("created_at", DESCENDING)]
        ),
        IndexModel([("paid_at", DESCENDING)]),
        IndexModel(
            [("idempotency_key", ASCENDING)],
            unique=True,
            partialFilterExpression={"idempotency_key": {"$type": "string"}},
        ),
    ])

    # 9. audit_logs
    await db.audit_logs.create_indexes([
        IndexModel(
            [("entity_type", ASCENDING), ("entity_id", ASCENDING), ("created_at", DESCENDING)]
        ),
        IndexModel([("created_at", DESCENDING)]),
    ])

    logger.info("Database indexes successfully verified and ensured.")
