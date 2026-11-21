"""
Billing Repository for Unified Records & Payments Ledger.
Reads online enquiries directly from `enquiries` (no duplication) and offline sales
from `offline_sales`, alongside immutable ledger entries in `payments`.
"""

import re
from datetime import datetime, timezone
from typing import Any, Dict, List, Optional

from bson import ObjectId
from pymongo.asynchronous.client_session import AsyncClientSession
from pymongo.asynchronous.database import AsyncDatabase


def _stringify_id(val: Any) -> Optional[str]:
    if val is None:
        return None
    if isinstance(val, ObjectId):
        return str(val)
    return str(val)


def _normalize_payment_status(raw: Optional[str]) -> str:
    if raw == "partially_paid":
        return "partial"
    if raw in ("unpaid", "partial", "paid"):
        return raw
    return "unpaid"


def normalize_enquiry_to_billing(doc: Dict[str, Any]) -> Dict[str, Any]:
    """Project an `enquiries` document into the unified billing structure."""
    quoted = doc.get("quoted_total_paise")
    estimated = doc.get("estimated_total_paise", 0)
    payable = quoted if quoted is not None else estimated

    pay_summary = doc.get("payment_summary") or {}
    received = pay_summary.get("received_total_paise", 0)
    outstanding = pay_summary.get("outstanding_paise", max(0, payable - received))
    payment_status = _normalize_payment_status(pay_summary.get("payment_status"))

    cust_snap = doc.get("customer_snapshot") or {}
    items = [
        {
            "product_id": _stringify_id(it.get("product_id")),
            "variant_id": _stringify_id(it.get("variant_id")),
            "sku": it.get("sku"),
            "product_name": it.get("product_name", ""),
            "variant_label": it.get("variant_label"),
            "quantity": it.get("quantity", 1),
            "unit_price_paise": it.get("unit_price_paise", 0),
            "line_total_paise": it.get("line_total_paise", 0),
        }
        for it in doc.get("items", [])
    ]

    return {
        "source_type": "enquiry",
        "source_label": "Online Enquiry",
        "source_id": str(doc["_id"]),
        "reference_id": doc["enquiry_id"],
        "customer": {
            "customer_id": _stringify_id(doc.get("customer_id")),
            "name": cust_snap.get("name", "Unknown Customer"),
            "email": cust_snap.get("email"),
            "phone": cust_snap.get("phone"),
        },
        "record_status": doc.get("enquiry_status", "pending"),
        "currency": doc.get("currency", "INR"),
        "subtotal_paise": doc.get("subtotal_paise", estimated),
        "discount_paise": doc.get("discount_paise", 0),
        "tax_amount_paise": doc.get("tax_amount_paise"),
        "estimated_total_paise": estimated,
        "quoted_total_paise": quoted,
        "payable_total_paise": payable,
        "received_total_paise": received,
        "outstanding_paise": outstanding,
        "payment_status": payment_status,
        "item_count": len(items),
        "items": items,
        "notes": doc.get("customer_note") or doc.get("owner_note"),
        "created_at": doc["created_at"],
        "updated_at": doc.get("updated_at", doc["created_at"]),
    }


def normalize_offline_sale_to_billing(doc: Dict[str, Any]) -> Dict[str, Any]:
    """Project an `offline_sales` document into the unified billing structure."""
    payable = doc.get("payable_total_paise", 0)
    pay_summary = doc.get("payment_summary") or {}
    received = pay_summary.get("received_total_paise", 0)
    outstanding = pay_summary.get("outstanding_paise", max(0, payable - received))
    payment_status = _normalize_payment_status(pay_summary.get("payment_status"))

    cust = doc.get("customer") or {}
    items = [
        {
            "product_id": _stringify_id(it.get("product_id")),
            "variant_id": _stringify_id(it.get("variant_id")),
            "sku": it.get("sku"),
            "product_name": it.get("product_name", ""),
            "variant_label": it.get("variant_label"),
            "quantity": it.get("quantity", 1),
            "unit_price_paise": it.get("unit_price_paise", 0),
            "line_total_paise": it.get("line_total_paise", 0),
        }
        for it in doc.get("items", [])
    ]

    return {
        "source_type": "offline_sale",
        "source_label": "Offline Sale",
        "source_id": str(doc["_id"]),
        "reference_id": doc["sale_id"],
        "customer": {
            "customer_id": _stringify_id(cust.get("customer_id")),
            "name": cust.get("name", "Walk-in customer"),
            "email": cust.get("email"),
            "phone": cust.get("phone"),
        },
        "record_status": doc.get("sale_status", "recorded"),
        "currency": doc.get("currency", "INR"),
        "subtotal_paise": doc.get("subtotal_paise", payable),
        "discount_paise": doc.get("discount_paise", 0),
        "tax_amount_paise": doc.get("tax_amount_paise"),
        "estimated_total_paise": None,
        "quoted_total_paise": None,
        "payable_total_paise": payable,
        "received_total_paise": received,
        "outstanding_paise": outstanding,
        "payment_status": payment_status,
        "item_count": len(items),
        "items": items,
        "notes": doc.get("notes"),
        "created_at": doc["created_at"],
        "updated_at": doc.get("updated_at", doc["created_at"]),
    }


def clean_payment_doc(doc: Dict[str, Any]) -> Dict[str, Any]:
    return {
        "id": str(doc["_id"]),
        "payment_id": doc["payment_id"],
        "source_type": doc["source_type"],
        "source_id": _stringify_id(doc["source_id"]) or "",
        "entry_type": doc["entry_type"],
        "reversed_payment_id": _stringify_id(doc.get("reversed_payment_id")),
        "amount_paise": doc["amount_paise"],
        "currency": doc.get("currency", "INR"),
        "method": doc["method"],
        "reference_number": doc.get("reference_number"),
        "paid_at": doc["paid_at"],
        "notes": doc.get("notes"),
        "created_by": _stringify_id(doc.get("created_by")) or "",
        "created_at": doc["created_at"],
    }


class BillingRepository:
    def __init__(self, db: AsyncDatabase):
        self.db = db

    async def get_next_payment_id(
        self, session: Optional[AsyncClientSession] = None
    ) -> str:
        """Generate sequential human-readable payment ID e.g. TIFPAY-2026-00001."""
        year = datetime.now(timezone.utc).year
        counter = await self.db.counters.find_one_and_update(
            {"_id": f"payment_{year}"},
            {"$inc": {"seq": 1}},
            upsert=True,
            return_document=True,
            session=session,
        )
        seq = counter["seq"]
        return f"TIFPAY-{year}-{seq:05d}"

    async def get_next_sale_id(
        self, session: Optional[AsyncClientSession] = None
    ) -> str:
        """Generate sequential human-readable offline sale ID e.g. TIFS-2026-00001."""
        year = datetime.now(timezone.utc).year
        counter = await self.db.counters.find_one_and_update(
            {"_id": f"offline_sale_{year}"},
            {"$inc": {"seq": 1}},
            upsert=True,
            return_document=True,
            session=session,
        )
        seq = counter["seq"]
        return f"TIFS-{year}-{seq:05d}"

    def _build_date_filter(
        self, start_date: Optional[datetime], end_date: Optional[datetime]
    ) -> Optional[Dict[str, Any]]:
        date_q: Dict[str, Any] = {}
        if start_date:
            date_q["$gte"] = start_date
        if end_date:
            date_q["$lte"] = end_date
        return date_q if date_q else None

    async def _fetch_matching_records(
        self,
        source_type: Optional[str] = None,
        payment_status: Optional[str] = None,
        q: Optional[str] = None,
        start_date: Optional[datetime] = None,
        end_date: Optional[datetime] = None,
    ) -> List[Dict[str, Any]]:
        date_q = self._build_date_filter(start_date, end_date)
        records: List[Dict[str, Any]] = []
        escaped_q = re.escape(q.strip()) if q and q.strip() else None

        # 1. Online Enquiries (read directly from `enquiries` — never duplicated)
        if source_type in (None, "enquiry"):
            enq_query: Dict[str, Any] = {}
            if date_q:
                enq_query["created_at"] = date_q
            if payment_status:
                enq_query["payment_summary.payment_status"] = payment_status
            if escaped_q:
                regex = {"$regex": escaped_q, "$options": "i"}
                enq_query["$or"] = [
                    {"enquiry_id": regex},
                    {"customer_snapshot.name": regex},
                    {"customer_snapshot.email": regex},
                    {"customer_snapshot.phone": regex},
                ]
            cursor = self.db.enquiries.find(enq_query).sort("created_at", -1)
            async for doc in cursor:
                records.append(normalize_enquiry_to_billing(doc))

        # 2. Offline Sales (read directly from `offline_sales`)
        if source_type in (None, "offline_sale"):
            sale_query: Dict[str, Any] = {}
            if date_q:
                sale_query["created_at"] = date_q
            if payment_status:
                sale_query["payment_summary.payment_status"] = payment_status
            if escaped_q:
                regex = {"$regex": escaped_q, "$options": "i"}
                sale_query["$or"] = [
                    {"sale_id": regex},
                    {"customer.name": regex},
                    {"customer.email": regex},
                    {"customer.phone": regex},
                ]
            cursor = self.db.offline_sales.find(sale_query).sort("created_at", -1)
            async for doc in cursor:
                records.append(normalize_offline_sale_to_billing(doc))

        records.sort(key=lambda r: r["created_at"], reverse=True)
        return records

    async def list_unified_records(
        self,
        source_type: Optional[str] = None,
        payment_status: Optional[str] = None,
        q: Optional[str] = None,
        start_date: Optional[datetime] = None,
        end_date: Optional[datetime] = None,
        limit: int = 50,
        skip: int = 0,
    ) -> List[Dict[str, Any]]:
        records = await self._fetch_matching_records(
            source_type=source_type,
            payment_status=payment_status,
            q=q,
            start_date=start_date,
            end_date=end_date,
        )
        return records[skip : skip + limit]

    async def get_billing_summary(
        self,
        source_type: Optional[str] = None,
        start_date: Optional[datetime] = None,
        end_date: Optional[datetime] = None,
    ) -> Dict[str, Any]:
        records = await self._fetch_matching_records(
            source_type=source_type,
            start_date=start_date,
            end_date=end_date,
        )
        summary = {
            "total_records": len(records),
            "online_enquiries_count": 0,
            "offline_sales_count": 0,
            "total_payable_paise": 0,
            "total_received_paise": 0,
            "total_outstanding_paise": 0,
            "unpaid_count": 0,
            "partial_count": 0,
            "paid_count": 0,
            "currency": "INR",
        }
        for r in records:
            if r["source_type"] == "enquiry":
                summary["online_enquiries_count"] += 1
            else:
                summary["offline_sales_count"] += 1

            summary["total_payable_paise"] += r["payable_total_paise"]
            summary["total_received_paise"] += r["received_total_paise"]
            summary["total_outstanding_paise"] += r["outstanding_paise"]

            ps = r["payment_status"]
            if ps == "paid":
                summary["paid_count"] += 1
            elif ps == "partial":
                summary["partial_count"] += 1
            else:
                summary["unpaid_count"] += 1

        return summary

    async def get_source_record(
        self,
        source_type: str,
        source_id: str,
        session: Optional[AsyncClientSession] = None,
    ) -> Optional[Dict[str, Any]]:
        if source_type == "enquiry":
            doc = None
            if ObjectId.is_valid(source_id):
                doc = await self.db.enquiries.find_one(
                    {"_id": ObjectId(source_id)}, session=session
                )
            if not doc:
                doc = await self.db.enquiries.find_one(
                    {"enquiry_id": source_id}, session=session
                )
            return normalize_enquiry_to_billing(doc) if doc else None

        if source_type == "offline_sale":
            doc = None
            if ObjectId.is_valid(source_id):
                doc = await self.db.offline_sales.find_one(
                    {"_id": ObjectId(source_id)}, session=session
                )
            if not doc:
                doc = await self.db.offline_sales.find_one(
                    {"sale_id": source_id}, session=session
                )
            return normalize_offline_sale_to_billing(doc) if doc else None

        return None

    async def create_offline_sale(
        self, doc: Dict[str, Any], session: Optional[AsyncClientSession] = None
    ) -> Dict[str, Any]:
        res = await self.db.offline_sales.insert_one(doc, session=session)
        doc["_id"] = res.inserted_id
        return normalize_offline_sale_to_billing(doc)

    async def update_offline_sale(
        self,
        sale_oid: ObjectId,
        update_fields: Dict[str, Any],
        session: Optional[AsyncClientSession] = None,
    ) -> Optional[Dict[str, Any]]:
        await self.db.offline_sales.update_one(
            {"_id": sale_oid}, {"$set": update_fields}, session=session
        )
        doc = await self.db.offline_sales.find_one({"_id": sale_oid}, session=session)
        return normalize_offline_sale_to_billing(doc) if doc else None

    async def get_payment_by_idempotency_key(
        self, key: str, session: Optional[AsyncClientSession] = None
    ) -> Optional[Dict[str, Any]]:
        doc = await self.db.payments.find_one({"idempotency_key": key}, session=session)
        return clean_payment_doc(doc) if doc else None

    async def get_payment_by_id_or_human(
        self, payment_ref: str, session: Optional[AsyncClientSession] = None
    ) -> Optional[Dict[str, Any]]:
        doc = None
        if ObjectId.is_valid(payment_ref):
            doc = await self.db.payments.find_one(
                {"_id": ObjectId(payment_ref)}, session=session
            )
        if not doc:
            doc = await self.db.payments.find_one(
                {"payment_id": payment_ref}, session=session
            )
        return clean_payment_doc(doc) if doc else None

    async def compute_ledger_net_received(
        self,
        source_type: str,
        source_id: str,
        session: Optional[AsyncClientSession] = None,
    ) -> int:
        source_match: List[Any] = [source_id]
        if ObjectId.is_valid(source_id):
            source_match.append(ObjectId(source_id))
        cursor = self.db.payments.find(
            {"source_type": source_type, "source_id": {"$in": source_match}},
            session=session,
        )
        net = 0
        async for doc in cursor:
            if doc.get("entry_type") == "reversal":
                net -= int(doc.get("amount_paise", 0))
            else:
                net += int(doc.get("amount_paise", 0))
        return max(0, net)

    async def compute_reversed_amount_for_receipt(
        self,
        original_payment_id: str,
        session: Optional[AsyncClientSession] = None,
    ) -> int:
        id_match: List[Any] = [original_payment_id]
        if ObjectId.is_valid(original_payment_id):
            id_match.append(ObjectId(original_payment_id))
        cursor = self.db.payments.find(
            {
                "entry_type": "reversal",
                "reversed_payment_id": {"$in": id_match},
            },
            session=session,
        )
        total = 0
        async for doc in cursor:
            total += int(doc.get("amount_paise", 0))
        return total

    async def insert_payment(
        self, doc: Dict[str, Any], session: Optional[AsyncClientSession] = None
    ) -> Dict[str, Any]:
        res = await self.db.payments.insert_one(doc, session=session)
        doc["_id"] = res.inserted_id
        return clean_payment_doc(doc)

    async def update_source_payment_summary(
        self,
        source_type: str,
        source_id: str,
        received_total_paise: int,
        outstanding_paise: int,
        payment_status: str,
        updated_at: datetime,
        session: Optional[AsyncClientSession] = None,
    ) -> None:
        collection = (
            self.db.enquiries if source_type == "enquiry" else self.db.offline_sales
        )
        await collection.update_one(
            {"_id": ObjectId(source_id)},
            {
                "$set": {
                    "payment_summary.received_total_paise": received_total_paise,
                    "payment_summary.outstanding_paise": outstanding_paise,
                    "payment_summary.payment_status": payment_status,
                    "updated_at": updated_at,
                }
            },
            session=session,
        )

    async def list_payments_for_source(
        self,
        source_type: str,
        source_id: str,
        session: Optional[AsyncClientSession] = None,
    ) -> List[Dict[str, Any]]:
        source_match: List[Any] = [source_id]
        if ObjectId.is_valid(source_id):
            source_match.append(ObjectId(source_id))

        cursor = self.db.payments.find(
            {"source_type": source_type, "source_id": {"$in": source_match}},
            session=session,
        ).sort("paid_at", -1)

        items: List[Dict[str, Any]] = []
        async for doc in cursor:
            items.append(clean_payment_doc(doc))
        return items

    async def list_payments(
        self,
        source_type: Optional[str] = None,
        method: Optional[str] = None,
        start_date: Optional[datetime] = None,
        end_date: Optional[datetime] = None,
        limit: int = 50,
        skip: int = 0,
    ) -> List[Dict[str, Any]]:
        query: Dict[str, Any] = {}
        if source_type:
            query["source_type"] = source_type
        if method:
            query["method"] = method
        date_q = self._build_date_filter(start_date, end_date)
        if date_q:
            query["paid_at"] = date_q

        cursor = (
            self.db.payments.find(query)
            .sort("paid_at", -1)
            .skip(skip)
            .limit(limit)
        )
        items: List[Dict[str, Any]] = []
        async for doc in cursor:
            items.append(clean_payment_doc(doc))
        return items
