"""
Security utilities: Password hashing, verification, and session token generation.
Supports standard secure salted hashing with bcrypt/scrypt fallback.
"""

import hashlib
import hmac
import secrets


def hash_password(password: str) -> str:
    """Generate secure salted scrypt password hash."""
    salt = secrets.token_bytes(16)
    key = hashlib.scrypt(
        password.encode("utf-8"),
        salt=salt,
        n=16384,
        r=8,
        p=1,
        maxmem=0x2000000,
    )
    return f"scrypt${salt.hex()}${key.hex()}"


def verify_password(plain_password: str, hashed_password: str) -> bool:
    """Verify plain password against stored salted hash."""
    try:
        parts = hashed_password.split("$")
        if len(parts) == 3 and parts[0] == "scrypt":
            salt = bytes.fromhex(parts[1])
            expected_key = bytes.fromhex(parts[2])
            key = hashlib.scrypt(
                plain_password.encode("utf-8"),
                salt=salt,
                n=16384,
                r=8,
                p=1,
                maxmem=0x2000000,
            )
            return hmac.compare_digest(key, expected_key)
        return False
    except Exception:
        return False


def generate_session_token() -> str:
    """Generate cryptographically secure 32-byte session token."""
    return secrets.token_urlsafe(32)
