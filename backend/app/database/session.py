"""
PyMongo Async database client abstraction and lifecycle management.
Follows MongoDB's PyMongo Async specification (AsyncMongoClient).
"""

import logging
from typing import Optional

from pymongo import AsyncMongoClient
from pymongo.asynchronous.database import AsyncDatabase

from app.core.config import settings

logger = logging.getLogger("the_india_frames.database")


class DatabaseManager:
    client: Optional[AsyncMongoClient] = None
    db: Optional[AsyncDatabase] = None

    async def connect(self) -> None:
        if not settings.MONGODB_URI:
            logger.warning(
                "MONGODB_URI is not configured. Backend starting in local/no-database mode."
            )
            self.client = None
            self.db = None
            return

        try:
            logger.info("Connecting to MongoDB via PyMongo AsyncMongoClient...")
            self.client = AsyncMongoClient(
                settings.MONGODB_URI,
                serverSelectionTimeoutMS=5000,
            )
            # Trigger server selection check
            await self.client.admin.command("ping")
            self.db = self.client[settings.MONGODB_DB_NAME]
            logger.info("Successfully connected to MongoDB (%s)", settings.MONGODB_DB_NAME)
        except Exception as exc:
            logger.error("Failed to connect to MongoDB: %s", exc)
            self.client = None
            self.db = None
            if settings.ENVIRONMENT == "production":
                # Do not hide database failure in production
                raise exc

    async def disconnect(self) -> None:
        if self.client:
            logger.info("Closing MongoDB AsyncMongoClient connection...")
            await self.client.close()
            self.client = None
            self.db = None

    async def ping(self) -> bool:
        if self.client is None:
            return False
        try:
            await self.client.admin.command("ping")
            return True
        except Exception:
            return False


db_manager = DatabaseManager()


def get_db() -> Optional[AsyncDatabase]:
    return db_manager.db
