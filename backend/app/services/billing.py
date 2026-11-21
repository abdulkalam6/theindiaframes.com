"""
Owner Billing Service Layer.
Provides unified online enquiry + offline sale billing views, offline sale creation/updates
with audited manual pricing/discounts, immutable payment receipt/reversal recording with
idempotency & transactional summary updates, and ledger reconciliation.
"""

from datetime import datetime, timezone
from typing import Any, Dict, List, Optional, Tuple

from bson import ObjectId
from fastapi import HTTPException, status
from pymongo.asynchronous.database import AsyncDatabase

from app.database.session import run_in_transaction
from app.repositories.audit import AuditRepository
from app.repositories.billing import BillingRepository
from app.repositories.catalogue import CatalogueRepository
from app.repositories.users import UserRepository
from app.schemas.billing import (
    BillingRecordDetail,
    BillingRecordSummary,
    BillingSummaryResponse,
    OfflineSaleCreateRequest,
    OfflineSaleItemInput,
    OfflineSaleUpdateRequest,
    PaymentCreateRequest,
    PaymentEntryResponse,
    PaymentRecordResult,
    ReconciliationMismatch,
    ReconciliationReport,
)


def compute_payment_status(payable_paise: int, received_paise: int) -> str:
    if payable_paise <= 0:
        return "paid"
    if received_paise <= 0:
        return "unpaid"
    if received_paise >= payable_paise:
        return "paid"
    return "partial"


class BillingService:
    def __init__(self, db: AsyncDatabase):
        self.db = db
        self.repo = BillingRepository(db)
        self.cat_repo = CatalogueRepository(db)
        self.user_repo = UserRepository(db)
        self.audit_repo = AuditRepository(db)

    async def list_records(
        self,
        source_type: Optional[str] = None,
        payment_status: Optional[str] = None,
        q: Optional[str] = None,
        start_date: Optional[datetime] = None,
        end_date: Optional[datetime] = None,
        limit: int = 50,
        skip: int = 0,
    ) -> List[BillingRecordSummary]:
        rows = await self.repo.list_unified_records(
            source_type=source_type,
            payment_status=payment_status,
            q=q,
            start_date=start_date,
            end_date=end_date,
            limit=limit,
            skip=skip,
        )
        return [BillingRecordSummary(**r) for r in rows]

    async def get_summary(
        self,
        source_type: Optional[str] = None,
        start_date: Optional[datetime] = None,
        end_date: Optional[datetime] = None,
    ) -> BillingSummaryResponse:
        data = await self.repo.get_billing_summary(
            source_type=source_type,
            start_date=start_date,
            end_date=end_date,
        )
        return BillingSummaryResponse(**data)

    async def get_record_detail(
        self, source_type: str, source_id: str
    ) -> BillingRecordDetail:
        record = await self.repo.get_source_record(source_type, source_id)
        if not record:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Billing record not found.",
            )
        payments = await self.repo.list_payments_for_source(
            source_type=record["source_type"], source_id=record["source_id"]
        )
        return BillingRecordDetail(
            **record,
            payments=[PaymentEntryResponse(**p) for p in payments],
        )

    async def list_record_payments(
        self, source_type: str, source_id: str
    ) -> List[PaymentEntryResponse]:
        record = await self.repo.get_source_record(source_type, source_id)
        if not record:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Billing record not found.",
            )
        payments = await self.repo.list_payments_for_source(
            source_type=record["source_type"], source_id=record["source_id"]
        )
        return [PaymentEntryResponse(**p) for p in payments]

    async def list_payments(
        self,
        source_type: Optional[str] = None,
        method: Optional[str] = None,
        start_date: Optional[datetime] = None,
        end_date: Optional[datetime] = None,
        limit: int = 50,
        skip: int = 0,
    ) -> List[PaymentEntryResponse]:
        rows = await self.repo.list_payments(
            source_type=source_type,
            method=method,
            start_date=start_date,
            end_date=end_date,
            limit=limit,
            skip=skip,
        )
        return [PaymentEntryResponse(**p) for p in rows]

    # --- Phase 9: Offline Sales ---

    async def _resolve_offline_items(
        self, items_input: List[OfflineSaleItemInput]
    ) -> Tuple[List[Dict[str, Any]], int, List[Dict[str, Any]]]:
        resolved: List[Dict[str, Any]] = []
        price_deviations: List[Dict[str, Any]] = []
        subtotal_paise = 0

        for idx, item in enumerate(items_input):
            product_doc = None
            variant_doc = None

            if item.variant_id:
                variant_doc = await self.cat_repo.get_variant_by_id(item.variant_id)
                if not variant_doc:
                    raise HTTPException(
                        status_code=status.HTTP_400_BAD_REQUEST,
                        detail=f"Item #{idx + 1}: variant not found.",
                    )
                prod_id_lookup = item.product_id or variant_doc.get("product_id")
                if prod_id_lookup:
                    product_doc = await self.cat_repo.get_product_by_id(prod_id_lookup)
            elif item.product_id:
                product_doc = await self.cat_repo.get_product_by_id(item.product_id)
                if not product_doc:
                    raise HTTPException(
                        status_code=status.HTTP_400_BAD_REQUEST,
                        detail=f"Item #{idx + 1}: product not found.",
                    )

            product_name = (
                item.product_name
                or (product_doc.get("name") if product_doc else None)
            )
            if not product_name or not product_name.strip():
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail=f"Item #{idx + 1}: product_name is required for manual items.",
                )

            catalogue_price = (
                variant_doc.get("retail_price_paise") if variant_doc else None
            )
            unit_price = (
                item.unit_price_paise
                if item.unit_price_paise is not None
                else catalogue_price
            )
            if unit_price is None:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail=f"Item #{idx + 1}: unit_price_paise is required.",
                )

            if catalogue_price is not None and unit_price != catalogue_price:
                price_deviations.append(
                    {
                        "sku": variant_doc.get("sku") if variant_doc else item.sku,
                        "product_name": product_name.strip(),
                        "catalogue_retail_paise": catalogue_price,
                        "agreed_unit_price_paise": unit_price,
                    }
                )

            line_total = item.quantity * unit_price
            subtotal_paise += line_total

            prod_oid = None
            if product_doc:
                prod_oid = ObjectId(product_doc["id"])
            elif item.product_id and ObjectId.is_valid(item.product_id):
                prod_oid = ObjectId(item.product_id)

            var_oid = (
                ObjectId(variant_doc["id"])
                if variant_doc
                else (
                    ObjectId(item.variant_id)
                    if item.variant_id and ObjectId.is_valid(item.variant_id)
                    else None
                )
            )

            resolved.append(
                {
                    "product_id": prod_oid,
                    "variant_id": var_oid,
                    "sku": (
                        item.sku
                        or (variant_doc.get("sku") if variant_doc else None)
                        or (product_doc.get("base_sku") if product_doc else None)
                    ),
                    "product_name": product_name.strip(),
                    "variant_label": (
                        item.variant_label
                        or (variant_doc.get("label") if variant_doc else None)
                    ),
                    "quantity": item.quantity,
                    "unit_price_paise": unit_price,
                    "line_total_paise": line_total,
                }
            )

        return resolved, subtotal_paise, price_deviations

    async def create_offline_sale(
        self,
        owner_id: str,
        payload: OfflineSaleCreateRequest,
        request_id: Optional[str] = None,
    ) -> BillingRecordDetail:
        # Resolve existing or walk-in customer snapshot
        cust_in = payload.customer
        customer_snapshot: Dict[str, Any]
        if cust_in.customer_id:
            user = await self.user_repo.get_by_id(cust_in.customer_id)
            if not user:
                raise HTTPException(
                    status_code=status.HTTP_404_NOT_FOUND,
                    detail="Selected customer not found.",
                )
            customer_snapshot = {
                "customer_id": ObjectId(user["id"]),
                "name": (cust_in.name or user["name"]).strip(),
                "phone": cust_in.phone if cust_in.phone is not None else user.get("phone"),
                "email": cust_in.email if cust_in.email is not None else user.get("email"),
            }
        else:
            walk_in_name = (cust_in.name or "").strip() or "Walk-in customer"
            customer_snapshot = {
                "customer_id": None,
                "name": walk_in_name,
                "phone": cust_in.phone.strip() if cust_in.phone else None,
                "email": cust_in.email.strip() if cust_in.email else None,
            }

        resolved_items, subtotal_paise, price_deviations = (
            await self._resolve_offline_items(payload.items)
        )

        if payload.discount_paise > subtotal_paise:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Discount cannot exceed subtotal.",
            )

        payable_total_paise = subtotal_paise - payload.discount_paise
        now = datetime.now(timezone.utc)
        initial_pay_status = compute_payment_status(payable_total_paise, 0)

        async def _txn(session):
            sale_id = await self.repo.get_next_sale_id(session=session)
            doc = {
                "sale_id": sale_id,
                "customer": customer_snapshot,
                "items": resolved_items,
                "currency": "INR",
                "subtotal_paise": subtotal_paise,
                "discount_paise": payload.discount_paise,
                "tax_amount_paise": None,
                "payable_total_paise": payable_total_paise,
                "payment_summary": {
                    "received_total_paise": 0,
                    "outstanding_paise": payable_total_paise,
                    "payment_status": initial_pay_status,
                },
                "sale_status": "recorded",
                "notes": payload.notes,
                "created_by": ObjectId(owner_id)
                if ObjectId.is_valid(owner_id)
                else owner_id,
                "created_at": now,
                "updated_at": now,
            }
            created = await self.repo.create_offline_sale(doc, session=session)
            await self.audit_repo.log(
                actor_user_id=owner_id,
                action="offline_sale.created",
                entity_type="offline_sale",
                entity_id=created["source_id"],
                before={},
                after={
                    "sale_id": sale_id,
                    "subtotal_paise": subtotal_paise,
                    "discount_paise": payload.discount_paise,
                    "payable_total_paise": payable_total_paise,
                    "price_deviations": price_deviations,
                },
                request_id=request_id,
                session=session,
            )
            return created

        created_record = await run_in_transaction(self.db, _txn)
        return BillingRecordDetail(**created_record, payments=[])

    async def update_offline_sale(
        self,
        sale_id: str,
        owner_id: str,
        payload: OfflineSaleUpdateRequest,
        request_id: Optional[str] = None,
    ) -> BillingRecordDetail:
        existing = await self.repo.get_source_record("offline_sale", sale_id)
        if not existing:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Offline sale not found.",
            )

        sale_oid = ObjectId(existing["source_id"])
        net_received = await self.repo.compute_ledger_net_received(
            "offline_sale", existing["source_id"]
        )

        if payload.sale_status == "voided" and net_received > 0:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=(
                    "Cannot void an offline sale with net payments received. "
                    "Reverse all receipts first."
                ),
            )

        update_fields: Dict[str, Any] = {}
        price_deviations: List[Dict[str, Any]] = []
        new_subtotal = existing["subtotal_paise"]
        new_discount = (
            payload.discount_paise
            if payload.discount_paise is not None
            else existing["discount_paise"]
        )

        if payload.items is not None:
            resolved_items, new_subtotal, price_deviations = (
                await self._resolve_offline_items(payload.items)
            )
            update_fields["items"] = resolved_items
            update_fields["subtotal_paise"] = new_subtotal

        if new_discount > new_subtotal:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Discount cannot exceed subtotal.",
            )

        new_payable = new_subtotal - new_discount
        if new_payable < net_received:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=(
                    "Payable total cannot be reduced below net payments already received "
                    "(reverse excess receipts first)."
                ),
            )

        now = datetime.now(timezone.utc)
        new_outstanding = max(0, new_payable - net_received)
        new_pay_status = compute_payment_status(new_payable, net_received)

        update_fields["discount_paise"] = new_discount
        update_fields["payable_total_paise"] = new_payable
        update_fields["payment_summary.received_total_paise"] = net_received
        update_fields["payment_summary.outstanding_paise"] = new_outstanding
        update_fields["payment_summary.payment_status"] = new_pay_status
        update_fields["updated_at"] = now

        if payload.notes is not None:
            update_fields["notes"] = payload.notes
        if payload.sale_status is not None:
            update_fields["sale_status"] = payload.sale_status

        before_snapshot = {
            "subtotal_paise": existing["subtotal_paise"],
            "discount_paise": existing["discount_paise"],
            "payable_total_paise": existing["payable_total_paise"],
            "sale_status": existing["record_status"],
            "notes": existing["notes"],
        }

        async def _txn(session):
            updated = await self.repo.update_offline_sale(
                sale_oid, update_fields, session=session
            )
            await self.audit_repo.log(
                actor_user_id=owner_id,
                action="offline_sale.updated",
                entity_type="offline_sale",
                entity_id=existing["source_id"],
                before=before_snapshot,
                after={
                    "subtotal_paise": new_subtotal,
                    "discount_paise": new_discount,
                    "payable_total_paise": new_payable,
                    "sale_status": payload.sale_status or existing["record_status"],
                    "price_deviations": price_deviations,
                },
                request_id=request_id,
                session=session,
            )
            return updated

        updated_record = await run_in_transaction(self.db, _txn)
        payments = await self.repo.list_payments_for_source(
            "offline_sale", existing["source_id"]
        )
        return BillingRecordDetail(
            **updated_record,
            payments=[PaymentEntryResponse(**p) for p in payments],
        )

    # --- Phase 9: Payment Receipts & Reversals ---

    async def record_payment(
        self,
        source_type: str,
        source_id: str,
        owner_id: str,
        payload: PaymentCreateRequest,
        request_id: Optional[str] = None,
    ) -> PaymentRecordResult:
        # 1. Verify source record exists
        record = await self.repo.get_source_record(source_type, source_id)
        if not record:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Billing record not found.",
            )
        canonical_source_id = record["source_id"]

        # 2. Idempotency replay check BEFORE mutating anything
        if payload.idempotency_key:
            existing_pay = await self.repo.get_payment_by_idempotency_key(
                payload.idempotency_key
            )
            if existing_pay:
                if (
                    existing_pay["source_type"] != source_type
                    or existing_pay["source_id"] != canonical_source_id
                ):
                    raise HTTPException(
                        status_code=status.HTTP_409_CONFLICT,
                        detail="Idempotency key already used for a different billing record.",
                    )
                detail = await self.get_record_detail(source_type, canonical_source_id)
                return PaymentRecordResult(
                    payment=PaymentEntryResponse(**existing_pay),
                    billing_record=detail,
                    idempotent_replay=True,
                )

        if source_type == "offline_sale" and record["record_status"] == "voided":
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Cannot record payments on a voided offline sale.",
            )

        now = datetime.now(timezone.utc)
        paid_at = payload.paid_at or now

        async def _txn(session):
            # Re-fetch source inside transaction for strong consistency
            fresh = await self.repo.get_source_record(
                source_type, canonical_source_id, session=session
            )
            if not fresh:
                raise HTTPException(
                    status_code=status.HTTP_404_NOT_FOUND,
                    detail="Billing record not found.",
                )

            payable = fresh["payable_total_paise"]
            net_received = await self.repo.compute_ledger_net_received(
                source_type, canonical_source_id, session=session
            )

            reversed_oid: Optional[ObjectId] = None
            if payload.entry_type == "receipt":
                if payload.amount_paise is None or payload.amount_paise <= 0:
                    raise HTTPException(
                        status_code=status.HTTP_400_BAD_REQUEST,
                        detail="Positive amount_paise is required for payment receipts.",
                    )
                current_outstanding = max(0, payable - net_received)
                if payload.amount_paise > current_outstanding:
                    raise HTTPException(
                        status_code=status.HTTP_400_BAD_REQUEST,
                        detail=(
                            f"Payment amount ({payload.amount_paise} paise) exceeds "
                            f"outstanding balance ({current_outstanding} paise)."
                        ),
                    )
                amount_paise = payload.amount_paise
                new_net_received = net_received + amount_paise
                audit_action = "payment.receipt.created"
            else:
                # Reversal entry — original receipt stays untouched in immutable ledger
                if not payload.reversed_payment_id:
                    raise HTTPException(
                        status_code=status.HTTP_400_BAD_REQUEST,
                        detail="reversed_payment_id is required for a reversal.",
                    )
                orig = await self.repo.get_payment_by_id_or_human(
                    payload.reversed_payment_id, session=session
                )
                if not orig or orig["entry_type"] != "receipt":
                    raise HTTPException(
                        status_code=status.HTTP_404_NOT_FOUND,
                        detail="Original payment receipt not found.",
                    )
                if (
                    orig["source_type"] != source_type
                    or orig["source_id"] != canonical_source_id
                ):
                    raise HTTPException(
                        status_code=status.HTTP_400_BAD_REQUEST,
                        detail="Original payment receipt does not belong to this billing record.",
                    )
                already_reversed = await self.repo.compute_reversed_amount_for_receipt(
                    orig["id"], session=session
                )
                reversible_remaining = orig["amount_paise"] - already_reversed
                if reversible_remaining <= 0:
                    raise HTTPException(
                        status_code=status.HTTP_400_BAD_REQUEST,
                        detail="Original payment receipt has already been fully reversed.",
                    )
                amount_paise = (
                    payload.amount_paise
                    if payload.amount_paise is not None
                    else reversible_remaining
                )
                if amount_paise > reversible_remaining:
                    raise HTTPException(
                        status_code=status.HTTP_400_BAD_REQUEST,
                        detail=(
                            f"Reversal amount ({amount_paise} paise) exceeds remaining "
                            f"reversible amount ({reversible_remaining} paise)."
                        ),
                    )
                reversed_oid = ObjectId(orig["id"])
                new_net_received = max(0, net_received - amount_paise)
                audit_action = "payment.reversal.created"

            new_outstanding = max(0, payable - new_net_received)
            new_status = compute_payment_status(payable, new_net_received)
            payment_human_id = await self.repo.get_next_payment_id(session=session)

            payment_doc: Dict[str, Any] = {
                "payment_id": payment_human_id,
                "source_type": source_type,
                "source_id": ObjectId(canonical_source_id),
                "entry_type": payload.entry_type,
                "reversed_payment_id": reversed_oid,
                "amount_paise": amount_paise,
                "currency": "INR",
                "method": payload.method,
                "reference_number": payload.reference_number,
                "paid_at": paid_at,
                "notes": payload.notes,
                "created_by": ObjectId(owner_id)
                if ObjectId.is_valid(owner_id)
                else owner_id,
                "created_at": now,
            }
            if payload.idempotency_key:
                payment_doc["idempotency_key"] = payload.idempotency_key

            inserted_payment = await self.repo.insert_payment(
                payment_doc, session=session
            )
            await self.repo.update_source_payment_summary(
                source_type=source_type,
                source_id=canonical_source_id,
                received_total_paise=new_net_received,
                outstanding_paise=new_outstanding,
                payment_status=new_status,
                updated_at=now,
                session=session,
            )
            await self.audit_repo.log(
                actor_user_id=owner_id,
                action=audit_action,
                entity_type="payment",
                entity_id=inserted_payment["id"],
                before={
                    "received_total_paise": net_received,
                    "outstanding_paise": max(0, payable - net_received),
                    "payment_status": fresh["payment_status"],
                },
                after={
                    "payment_id": payment_human_id,
                    "source_type": source_type,
                    "source_id": canonical_source_id,
                    "entry_type": payload.entry_type,
                    "amount_paise": amount_paise,
                    "received_total_paise": new_net_received,
                    "outstanding_paise": new_outstanding,
                    "payment_status": new_status,
                },
                request_id=request_id,
                session=session,
            )
            return inserted_payment

        inserted = await run_in_transaction(self.db, _txn)
        detail = await self.get_record_detail(source_type, canonical_source_id)
        return PaymentRecordResult(
            payment=PaymentEntryResponse(**inserted),
            billing_record=detail,
            idempotent_replay=False,
        )

    # --- Phase 9: Reconciliation ---

    async def reconcile_payments(
        self,
        owner_id: str,
        repair: bool = False,
        request_id: Optional[str] = None,
    ) -> ReconciliationReport:
        all_records = await self.repo.list_unified_records(limit=10000, skip=0)
        mismatches: List[ReconciliationMismatch] = []
        repaired_count = 0
        now = datetime.now(timezone.utc)

        for rec in all_records:
            ledger_net = await self.repo.compute_ledger_net_received(
                rec["source_type"], rec["source_id"]
            )
            payable = rec["payable_total_paise"]
            expected_outstanding = max(0, payable - ledger_net)
            expected_status = compute_payment_status(payable, ledger_net)

            is_mismatch = (
                rec["received_total_paise"] != ledger_net
                or rec["outstanding_paise"] != expected_outstanding
                or rec["payment_status"] != expected_status
            )
            if is_mismatch:
                mismatches.append(
                    ReconciliationMismatch(
                        source_type=rec["source_type"],
                        source_id=rec["source_id"],
                        reference_id=rec["reference_id"],
                        payable_total_paise=payable,
                        stored_received_paise=rec["received_total_paise"],
                        ledger_net_received_paise=ledger_net,
                        stored_outstanding_paise=rec["outstanding_paise"],
                        expected_outstanding_paise=expected_outstanding,
                        stored_payment_status=rec["payment_status"],
                        expected_payment_status=expected_status,
                    )
                )
                if repair:
                    await self.repo.update_source_payment_summary(
                        source_type=rec["source_type"],
                        source_id=rec["source_id"],
                        received_total_paise=ledger_net,
                        outstanding_paise=expected_outstanding,
                        payment_status=expected_status,
                        updated_at=now,
                    )
                    await self.audit_repo.log(
                        actor_user_id=owner_id,
                        action="billing.reconciliation.repaired",
                        entity_type=rec["source_type"],
                        entity_id=rec["source_id"],
                        before={
                            "received_total_paise": rec["received_total_paise"],
                            "outstanding_paise": rec["outstanding_paise"],
                            "payment_status": rec["payment_status"],
                        },
                        after={
                            "received_total_paise": ledger_net,
                            "outstanding_paise": expected_outstanding,
                            "payment_status": expected_status,
                        },
                        request_id=request_id,
                    )
                    repaired_count += 1

        checked = len(all_records)
        mismatched = len(mismatches)
        return ReconciliationReport(
            checked_records=checked,
            consistent_records=checked - mismatched,
            mismatched_records=mismatched,
            repaired_records=repaired_count,
            mismatches=mismatches,
        )
