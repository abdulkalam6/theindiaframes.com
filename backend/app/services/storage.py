"""
Pluggable Media & Private File Storage Service for The India Frames.
Supports:
- STORAGE_PROVIDER="local" (Local dev disk or Railway Persistent Volume)
- STORAGE_PROVIDER="r2"    (Cloudflare R2 S3-compatible: 10 GB free/mo, $0 egress)

Strict separation:
- Public owner product/category images -> `public/` dir or `R2_PUBLIC_BUCKET`
- Private client photos & wholesale GSTIN proofs -> `private/` dir or `R2_PRIVATE_BUCKET`
"""

import asyncio
import mimetypes
from pathlib import Path
from typing import Any, Optional, Tuple

from app.core.config import settings

BACKEND_ROOT = Path(__file__).resolve().parents[2]


def _normalize_key(key: str) -> str:
    cleaned = key.replace("\\", "/").lstrip("/")
    parts = [p for p in cleaned.split("/") if p and p not in (".", "..")]
    if not parts:
        raise ValueError("Invalid storage key.")
    return "/".join(parts)


class StorageService:
    def __init__(self) -> None:
        self._s3_client: Any = None

    @property
    def provider(self) -> str:
        return (settings.STORAGE_PROVIDER or "local").strip().lower()

    @property
    def local_root(self) -> Path:
        root = Path(settings.LOCAL_UPLOAD_ROOT)
        if not root.is_absolute():
            root = BACKEND_ROOT / root
        return root

    def _get_r2_client(self) -> Any:
        if self._s3_client is not None:
            return self._s3_client

        import boto3
        from botocore.config import Config

        endpoint = settings.R2_ENDPOINT_URL
        if not endpoint and settings.R2_ACCOUNT_ID:
            endpoint = f"https://{settings.R2_ACCOUNT_ID}.r2.cloudflarestorage.com"
        if not endpoint:
            raise RuntimeError(
                "Cloudflare R2 requires R2_ENDPOINT_URL or R2_ACCOUNT_ID."
            )

        self._s3_client = boto3.client(
            "s3",
            endpoint_url=endpoint,
            aws_access_key_id=settings.R2_ACCESS_KEY_ID,
            aws_secret_access_key=settings.R2_SECRET_ACCESS_KEY,
            region_name="auto",
            config=Config(signature_version="s3v4"),
        )
        return self._s3_client

    async def save_public(self, key: str, data: bytes, content_type: str) -> str:
        """Store a public owner-uploaded product/category image and return its public URL."""
        safe_key = _normalize_key(key)
        if self.provider == "r2":
            if not settings.R2_PUBLIC_BUCKET or not settings.R2_PUBLIC_BASE_URL:
                raise RuntimeError(
                    "R2_PUBLIC_BUCKET and R2_PUBLIC_BASE_URL must be configured for R2 storage."
                )
            client = self._get_r2_client()
            await asyncio.to_thread(
                client.put_object,
                Bucket=settings.R2_PUBLIC_BUCKET,
                Key=safe_key,
                Body=data,
                ContentType=content_type,
                CacheControl="public, max-age=31536000, immutable",
            )
            return f"{settings.R2_PUBLIC_BASE_URL.rstrip('/')}/{safe_key}"

        target = self.local_root / "public" / safe_key
        target.parent.mkdir(parents=True, exist_ok=True)
        await asyncio.to_thread(target.write_bytes, data)
        base = settings.PUBLIC_API_BASE_URL.rstrip("/")
        return f"{base}{settings.API_V1_PREFIX}/media/{safe_key}"

    async def delete_public(self, key: str) -> None:
        safe_key = _normalize_key(key)
        if self.provider == "r2":
            if not settings.R2_PUBLIC_BUCKET:
                return
            client = self._get_r2_client()
            await asyncio.to_thread(
                client.delete_object,
                Bucket=settings.R2_PUBLIC_BUCKET,
                Key=safe_key,
            )
            return

        target = (self.local_root / "public" / safe_key).resolve()
        public_root = (self.local_root / "public").resolve()
        if str(target).startswith(str(public_root)) and target.is_file():
            await asyncio.to_thread(target.unlink)

    async def read_public(self, key: str) -> Optional[Tuple[bytes, str]]:
        """Read a local public media file safely (never accesses private/)."""
        safe_key = _normalize_key(key)
        public_root = (self.local_root / "public").resolve()
        target = (public_root / safe_key).resolve()
        if not str(target).startswith(str(public_root)) or not target.is_file():
            return None
        data = await asyncio.to_thread(target.read_bytes)
        mime, _ = mimetypes.guess_type(str(target))
        return data, mime or "application/octet-stream"

    async def save_private(self, key: str, data: bytes, content_type: str) -> str:
        """Store a strictly private client photo or wholesale proof document."""
        safe_key = _normalize_key(key)
        if self.provider == "r2":
            if not settings.R2_PRIVATE_BUCKET:
                raise RuntimeError(
                    "R2_PRIVATE_BUCKET must be configured for R2 private storage."
                )
            client = self._get_r2_client()
            await asyncio.to_thread(
                client.put_object,
                Bucket=settings.R2_PRIVATE_BUCKET,
                Key=safe_key,
                Body=data,
                ContentType=content_type,
                CacheControl="private, no-store",
            )
            return safe_key

        target = self.local_root / "private" / safe_key
        target.parent.mkdir(parents=True, exist_ok=True)
        await asyncio.to_thread(target.write_bytes, data)
        return safe_key

    async def read_private(self, key: str) -> Optional[bytes]:
        """Read a strictly private file (owner/customer auth checked by caller)."""
        safe_key = _normalize_key(key)
        if self.provider == "r2":
            if not settings.R2_PRIVATE_BUCKET:
                return None
            client = self._get_r2_client()
            try:
                resp = await asyncio.to_thread(
                    client.get_object,
                    Bucket=settings.R2_PRIVATE_BUCKET,
                    Key=safe_key,
                )
                return await asyncio.to_thread(resp["Body"].read)
            except Exception:
                return None

        private_root = (self.local_root / "private").resolve()
        target = (private_root / safe_key).resolve()
        if str(target).startswith(str(private_root)) and target.is_file():
            return await asyncio.to_thread(target.read_bytes)

        # Backward-compatible fallback for files saved before `private/` prefix
        legacy = (self.local_root / safe_key).resolve()
        root_resolved = self.local_root.resolve()
        if str(legacy).startswith(str(root_resolved)) and legacy.is_file():
            return await asyncio.to_thread(legacy.read_bytes)
        return None


storage_service = StorageService()
