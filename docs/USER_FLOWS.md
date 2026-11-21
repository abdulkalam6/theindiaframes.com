# User Flows — The India Frames

## 1. Visitor browsing and cart

1. Visitor opens the homepage or a category page.
2. Visitor browses and searches products.
3. Visitor opens a product detail page.
4. Visitor selects a variant and quantity.
5. Visitor adds the variant to cart.
6. Cart persists in local storage across navigation and refresh.
7. Visitor may continue adding products from other categories.
8. Visitor opens the cart to update quantities or remove lines.
9. Visitor chooses to proceed to enquiry checkout.
10. If not authenticated, redirect to login/register while preserving the cart.

## 2. Retail customer registration/login

1. Customer registers with name, email, phone and password, or chooses Google sign-in.
2. FastAPI validates input and creates/loads the local user.
3. For Google sign-in, backend verifies the Google ID token and uses its stable `sub` claim to locate/link the account.
4. Backend creates a secure session.
5. Customer returns to the original checkout route.
6. Cart remains intact.
7. Customer reviews the cart and submits the enquiry.

## 3. Wholesale application

1. Customer creates/signs into a customer account.
2. Customer opens the wholesale information/application page.
3. Customer enters mandatory GSTIN, business name/type, address and contact information.
4. Customer uploads at least one required business proof document.
5. Backend validates required fields and stores the document privately.
6. Application is created with `pending` status.
7. Customer sees a pending confirmation and remains on retail pricing.
8. Owner opens `/admin/wholesale-applications`.
9. Owner reviews GSTIN/business details and privately views proof document.
10. Owner approves or rejects and may add an internal note/reason.
11. User wholesale status and application state are updated atomically.
12. On a subsequent authenticated catalogue request, an approved customer receives wholesale price/MOQ fields; pending/rejected customers continue to receive retail prices.

## 4. Wholesale cart and enquiry

1. Approved wholesale customer signs in.
2. Catalogue/API returns wholesale pricing and MOQ for variants.
3. Customer adds multiple variants/categories to cart.
4. UI validates quantity against MOQ for immediate feedback.
5. On submission, backend validates approval status again, reloads current variant availability/price and enforces MOQ.
6. Backend saves a wholesale-priced snapshot and enquiry.
7. Customer sees confirmation and the WhatsApp click-to-chat action.

A customer's approval may be revoked after a price page is loaded. The backend must re-check current approval at enquiry submission; the previously displayed price cannot be trusted.

## 5. Enquiry submission and WhatsApp handoff

1. Customer reviews all cart lines and quantities.
2. Frontend sends only product/variant IDs, quantities, customer note and idempotency key.
3. Backend authenticates customer and reloads each item.
4. Backend confirms active/available variant and correct price tier.
5. Backend validates MOQ and quantity.
6. Backend computes line totals and total in paise.
7. Backend saves enquiry with immutable snapshots and unique enquiry ID.
8. Frontend receives successful response and shows confirmation.
9. Customer clicks the WhatsApp action.
10. WhatsApp opens with a pre-filled message containing the enquiry ID and product summary.
11. Customer manually taps Send.

If WhatsApp does not open or the customer does not send, the enquiry remains stored and visible in the customer's account and the owner's admin dashboard.

## 6. Owner processes online enquiry

1. Owner logs into `/admin`.
2. Dashboard shows latest online enquiries and their counts.
3. Owner opens an enquiry and reviews customer, item snapshots, pricing tier and total.
4. Owner contacts customer outside the system as needed.
5. Owner updates enquiry status and adds notes.
6. Owner may set/update `quoted_total_paise` after discussion.
7. Owner confirms or rejects/cancels the enquiry.
8. Payment details are managed from `/billing`; admin reads the shared payment summary.

## 7. Billing owner login

1. Owner opens `/billing`.
2. If no owner session exists, redirect to `/billing/login`.
3. Owner signs in with the same owner credentials used for `/admin`.
4. Backend verifies the account has the owner type/privilege.
5. Owner is redirected to billing dashboard.
6. A retail or wholesale customer must receive a forbidden response even if they manually call billing APIs.

## 8. Record payment against an online enquiry

1. Owner opens a billing record filtered to online enquiries.
2. Owner opens the enquiry billing detail.
3. Billing displays estimate, final quoted/payable amount, receipts and outstanding balance.
4. Owner selects Add Payment.
5. Owner enters amount, method, date/time, optional reference and note.
6. Backend validates the amount against the current outstanding balance and uses an idempotency key.
7. Backend writes an immutable payment receipt and updates the enquiry payment summary in a MongoDB transaction.
8. UI refreshes payment status and outstanding amount.
9. The same summary is reflected in admin without copying or syncing a second billing record.

Partial payments are supported. More than one payment entry may exist for the same enquiry.

## 9. Mark the balance fully paid

The owner can use a convenience action such as “Record remaining balance as paid.” This action must create a real payment ledger entry for the outstanding amount. It must collect/require payment method and payment date. It must not simply flip `payment_status` to `paid` without a receipt record.

## 10. Record an offline sale

1. Owner opens `/billing` and chooses New Offline Sale.
2. Owner optionally selects an existing customer or enters walk-in customer details.
3. Owner adds several products/variants and quantities.
4. Owner enters agreed unit prices/discounts if needed.
5. Backend validates fields and saves an `offline_sales` record with item/customer snapshots.
6. Owner records full, partial or zero payment.
7. Payment entries are recorded in the shared `payments` collection.
8. Offline sale appears in the unified billing list marked as offline.
9. It must not appear as an online enquiry in the customer-facing account or admin online-enquiry list.

## 11. Rejected/cancelled enquiries

- Rejected and cancelled enquiries remain searchable and visible to the owner.
- They are not physically deleted.
- Their payments remain visible.
- If money was received and must be returned/adjusted, record an auditable reversal/adjustment; do not erase the receipt.
- Enquiry status and payment status remain separate.

## 12. Key exception cases

- A product becomes unavailable after being added to cart: submission is rejected for that line, with a clear response so the customer can edit the cart.
- Price changes before submission: backend applies the current valid price and shows the customer the final server-calculated amount before they confirm, where practical.
- Wholesale approval is revoked: next API request and submission use retail rules or block the stale wholesale cart with a clear re-confirmation step; never preserve wholesale pricing based solely on local storage.
- Duplicate submit due to double click/network retry: idempotency prevents duplicate enquiries.
- Payment submit retry: idempotency prevents duplicate receipts.
- Quoted amount changes after payment: recompute outstanding, preserve ledger and log the change.
- WhatsApp unavailable: enquiry remains saved and customer can return to their account.
