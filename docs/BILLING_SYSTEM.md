# Billing System — The India Frames

## 1. Purpose

The billing area is an owner-only business tool. It records money received against:

1. Online enquiries submitted through the website.
2. Offline sales manually entered by the owner.

Version one does not connect to a payment gateway or bank. The owner manually records the receipt after receiving payment through cash, UPI, bank transfer, card or another accepted method.

## 2. Route and authentication

- Billing home: `/billing`.
- Billing login: `/billing/login`.
- Use the same owner account and backend authentication as `/admin`.
- The billing login page is separate for navigation/experience, not a separate credential store.
- Only the owner can call `/billing/*` APIs.
- A retail/wholesale customer must be denied even if they bypass the frontend UI.

## 3. Record sources

### Online enquiry

Stored in `enquiries`. It must remain the only online enquiry record. Billing reads and updates payment ledger entries associated with that enquiry; it must not duplicate the enquiry into a separate invoice/order collection just to show it in billing.

### Offline sale

Stored in `offline_sales`. Created manually by the owner from billing, with optional customer linkage or walk-in customer information.

### Unified billing view

The billing records page combines the two source collections into one paginated view and labels each record clearly:

- `Online enquiry`
- `Offline sale`

The source type must be available in filters and in every record detail.

## 4. Amount model

Money is stored as integer paise in INR.

For online enquiries:

- `estimated_total_paise` is computed from the server-side price snapshot at submission.
- `quoted_total_paise` is optional and set/updated by the owner after discussing the order.
- Billing payable amount = `quoted_total_paise` when set; otherwise `estimated_total_paise` as a provisional payable basis.

For offline sales:

- `payable_total_paise` is set when the owner records the sale.
- Owner may enter agreed unit prices/discounts; the backend validates and audits deviations from catalogue prices.

GST/tax behaviour is not decided. Tax amounts remain unset/disabled until owner confirms whether prices include GST, GST is added, which rates apply and what document formats are needed.

## 5. Payment states

Payment state is independent from enquiry/sale lifecycle state.

| Condition | State |
|---|---|
| Net received = 0 | `unpaid` |
| Net received > 0 and less than payable | `partially_paid` |
| Net received equals payable | `paid` |

If a record is cancelled/rejected after receiving payment, do not automatically erase or mark payments as zero. Any return/adjustment must be a separately recorded ledger action.

## 6. Payment entries

Each receipt entry must store:

- Payment ID.
- Source type (`enquiry` or `offline_sale`).
- Source record ID.
- Entry type (`receipt` or `reversal`).
- Amount in paise.
- Currency (`INR`).
- Method (`cash`, `upi`, `bank_transfer`, `card`, `other`).
- Actual payment date/time.
- Optional transaction/reference number.
- Optional note.
- Owner who recorded it.
- Creation timestamp.
- Idempotency key.

Multiple receipts are allowed per source record.

The original entry must not be edited/deleted to correct a mistake. Record a reversal with a reason and link it to the original entry, then record the correct receipt if required.

## 7. Payment transaction rules

When recording a receipt:

1. Verify owner session.
2. Load source record and its current payable amount.
3. Calculate current net received from summary/ledger.
4. Calculate outstanding amount.
5. Validate amount is positive and does not exceed outstanding unless an explicit future advance/overpayment policy is approved.
6. Validate method and date.
7. Use an idempotency key to prevent duplicate receipts on retries.
8. In one MongoDB transaction, insert the payment ledger event and update the source record's denormalized payment summary.
9. Write an audit log.
10. Return updated payment summary and full payment history.

When a reversal is recorded, use the same transaction pattern, validate that the reversal does not exceed the unreversed original receipt, update the source summary and audit it.

At intervals, reconcile summary values by recomputing the net ledger total and report any mismatch.

## 8. Owner billing dashboard

Show clear, date-filtered totals:

- Total payable/recorded amount.
- Total received (net of reversals).
- Outstanding balance.
- Number of online enquiry records.
- Number of offline sales.
- Unpaid count.
- Partially paid count.
- Paid count.

Do not label total payable as revenue received. A selected date range should explain whether it filters record creation date or payment receipt date. Prefer separate filters/metrics for those two concepts.

## 9. Billing record list

Columns recommended:

- Record ID.
- Source type.
- Customer/walk-in name.
- Record date.
- Enquiry/sale status where relevant.
- Payable amount.
- Received amount.
- Outstanding amount.
- Payment status.
- Last payment date.
- Action.

Filters:

- Source type.
- Date range (record created date and/or payment date).
- Payment status.
- Search by record ID, customer name, phone or reference.

## 10. Online enquiry detail in billing

Show:

- Enquiry ID and customer contact snapshot.
- Submitted line items and quantities.
- Original estimate.
- Owner's final quoted amount if set.
- Payable amount currently used for payment calculations.
- Payment history.
- Total received.
- Outstanding amount.
- Add payment action.
- Enquiry status as read-only or a link to the admin enquiry workflow.

If the quote amount is changed after receipts have been recorded, show a confirmation with the before/after payable amount, resulting balance and audit reason. In version one, block a payable-amount reduction below net receipts; handle any refund/credit/overpayment only through an explicitly designed future workflow.

## 11. Offline sale entry

Fields:

- Customer type: existing customer or walk-in.
- Customer name, phone and optional email.
- Multiple product/variant lines.
- Quantity per line.
- Unit price per line.
- Discount/adjustment where owner chooses.
- Notes.
- Payment entry (optional at creation or entered immediately afterward).

After save, assign a unique sale ID and retain a snapshot of each line. The owner can later add payment entries.

No numeric stock decrement is required because version one tracks availability status only, not stock quantities. Optionally warn when a selected variant is marked unavailable; the owner may need to record a legacy/manual sale, but any override must be explicit and audited.

## 12. Admin/billing synchronization

There is one database source of truth:

- `enquiries` stores online enquiry and its current payment summary.
- `offline_sales` stores offline sale and its current payment summary.
- `payments` stores the ledger entries.

Billing writes payment entries and updates the source summary. Admin reads the updated summary. Do not use separate billing copies, asynchronous manual synchronization or local-only payment flags.

## 13. Payment and sales reports

Version one can include simple filters and summary totals. Do not describe this module as a full accounting system. It does not calculate statutory tax, reconcile bank statements, create a general ledger, track expenses or file GST returns.

## 14. Billing acceptance tests

- Owner can log in at `/billing/login` with same credentials as `/admin`.
- Customer cannot access billing API routes.
- Billing list includes online enquiries and offline sales with clear source tags.
- One online enquiry appears only once as an enquiry record.
- Owner can create an offline sale with several products.
- Owner can record two or more partial payments against one record.
- Outstanding = payable − net received.
- A fully paid record has a corresponding receipt ledger entry for the full amount.
- Payment retry with same idempotency key does not duplicate a receipt.
- Reversal does not delete the original payment.
- Admin reflects a payment entered through billing without a separate sync process.
- Rejected/cancelled enquiries retain billing history.
- Tax is not calculated until business rules are approved.
