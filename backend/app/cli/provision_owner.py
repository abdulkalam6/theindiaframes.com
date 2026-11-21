"""
One-time CLI tool to securely provision the single business Owner account.
Follows docs/SECURITY.md & docs/DATABASE_SCHEMA.md rules.
Run:
    python -m app.cli.provision_owner --name "Owner Name" --email "owner@theindiaframes.com" --password "SuperSecret123"
"""

import argparse
import asyncio
from datetime import datetime, timezone

from pymongo import AsyncMongoClient

from app.core.config import settings
from app.core.security import hash_password


async def provision_owner(name: str, email: str, password: str, phone: str | None = None):
    client = AsyncMongoClient(settings.MONGODB_URI)
    db = client[settings.MONGODB_DB_NAME]

    email_clean = email.lower().strip()
    existing = await db.users.find_one({"email_normalized": email_clean})

    if existing:
        if existing.get("account_type") == "owner":
            print(f"Owner account with email '{email_clean}' already exists.")
            await client.close()
            return
        # Upgrade existing to owner
        await db.users.update_one(
            {"_id": existing["_id"]},
            {
                "$set": {
                    "account_type": "owner",
                    "password_hash": hash_password(password),
                    "updated_at": datetime.now(timezone.utc),
                }
            },
        )
        print(f"Successfully upgraded user '{email_clean}' to Owner account.")
    else:
        now = datetime.now(timezone.utc)
        doc = {
            "name": name,
            "email": email,
            "email_normalized": email_clean,
            "phone": phone,
            "account_type": "owner",
            "account_status": "active",
            "wholesale_status": "approved",
            "password_hash": hash_password(password),
            "google_sub": None,
            "created_at": now,
            "updated_at": now,
            "last_login_at": now,
        }
        await db.users.insert_one(doc)
        print(f"Successfully provisioned brand-new Owner account for '{email_clean}'.")

    await client.close()


def main():
    parser = argparse.ArgumentParser(description="Secure Owner Provisioning Tool")
    parser.add_argument("--name", required=True, help="Full name of the owner")
    parser.add_argument("--email", required=True, help="Owner email address")
    parser.add_argument("--password", required=True, help="Owner password (min 10 chars)")
    parser.add_argument("--phone", required=False, help="Owner phone number")
    args = parser.parse_args()

    if len(args.password) < 8:
        print("Error: Password must be at least 8 characters.")
        return

    asyncio.run(provision_owner(args.name, args.email, args.password, args.phone))


if __name__ == "__main__":
    main()
