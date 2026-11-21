"""
PyMongo Async database client abstraction and lifecycle management.
Follows MongoDB's PyMongo Async specification (AsyncMongoClient).
"""

import logging
from typing import Any, Awaitable, Callable, Optional, TypeVar

from pymongo import AsyncMongoClient
from pymongo.asynchronous.client_session import AsyncClientSession
from pymongo.asynchronous.database import AsyncDatabase
from pymongo.errors import OperationFailure

from app.core.config import settings

logger = logging.getLogger("the_india_frames.database")
T = TypeVar("T")


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


async def run_in_transaction(
    db: AsyncDatabase,
    fn: Callable[[Optional[AsyncClientSession]], Awaitable[T]],
) -> T:
    """
    Execute an async operation inside a MongoDB transaction when supported (Atlas /
    replica set). Gracefully falls back to non-transactional execution ONLY when
    running against a local standalone MongoDB instance (error code 20 / 263).
    """
    client: Any = getattr(db, "client", None)
    if client is None:
        return await fn(None)

    async with client.start_session() as session:
        try:
            async with await session.start_transaction():
                return await fn(session)
        except OperationFailure as exc:
            if exc.code in (20, 263) or "replica set" in str(exc).lower():
                logger.debug(
                    "MongoDB standalone deployment detected; executing without multi-doc transaction."
                )
                return await fn(None)
            raise
