# UI/UX Guidelines — The India Frames

## 1. Brand direction

Brand: **The India Frames**  
Tagline: **Where Memories Become Art.**

Use the supplied IFC logo as the exact source of truth. It has a dark navy/black field, ornate gold decoration and Tamil lettering. Do not recreate the logo with text, redraw the Tamil wordmark, crop the ornament in a way that changes the identity, or replace it with a generic icon.

The website should feel premium, trustworthy, artistic and practical. It is also a wholesale supplier, so the design must balance a refined consumer storefront with a clear professional/business-supply experience.

## 2. Colour direction

Suggested starting tokens (adjust after inspecting the real logo asset in the browser):

| Token | Suggested value | Use |
|---|---|---|
| Deep navy | `#071421` | Brand/header/dark surfaces |
| Near black | `#080B10` | Dark backgrounds and footer |
| Antique gold | `#C69A48` | Brand accents, dividers, key actions |
| Light gold | `#E3C27B` | Hover/highlight accents, not long text |
| Warm white | `#FAF8F3` | Main catalogue background |
| Soft cream | `#F1ECE2` | Secondary surfaces |
| Charcoal | `#242424` | Body text on light backgrounds |
| Muted text | `#6C6A65` | Secondary copy |
| Success | Accessible green | Available/paid/approved states |
| Warning | Accessible amber | Pending/partial states |
| Danger | Accessible red | Rejected/unavailable/overdue states |

Gold is an accent, not the default text colour for every element. Prioritise contrast and readability. Use a refined gold gradient sparingly; avoid excessive glow, bevels or ornamental borders.

## 3. Typography

- Use a readable sans-serif for body text and interface controls.
- A restrained editorial serif may be used for large marketing headlines if it fits the brand.
- Use a font with Tamil glyph support for the logo-adjacent Tamil text or any future Tamil UI content.
- Avoid ultra-thin weights and tiny text.
- Ensure numeric prices, quantities and invoice/billing amounts are easy to scan.

Do not claim the website is bilingual until the owner confirms whether all content should be translated into Tamil.

## 4. Image direction

- Product photography should be crisp, well-lit and consistent.
- Show frames against neutral backgrounds and in contextual interior settings.
- Show lamination machines with a professional workshop/printing-centre context.
- Show framing materials clearly enough for business buyers to identify the item.
- Maintain a consistent image ratio within product cards.
- Use meaningful alt text.
- Use image CDN transformations and responsive sizes.
- Do not invent actual product photos, prices, certifications, warranties or technical specifications. Use clearly marked placeholders until owner-supplied catalogue content arrives.

## 5. Navigation and information architecture

Main navigation should make these areas discoverable:

- Photo Frames
- Frame Accessories
- Lamination Machines
- Lamination Accessories
- Custom Framing & Services
- Personalised Gifts
- Wholesale
- About / Contact

Include account and cart controls. On mobile, collapse navigation into a usable menu while keeping cart access prominent.

## 6. Homepage content sections

Recommended order:

1. Announcement/contact strip (only real configured information).
2. Header with exact IFC logo, navigation, account and cart.
3. Hero: brand statement, short value proposition, clear “Explore Products” and “Wholesale Enquiry” actions.
4. Category grid for the main product/service families.
5. Featured product cards using actual catalogue data.
6. Wholesale/business supply section explaining the verification-based wholesale account.
7. Custom framing, printing, lamination, glass works and gifting services.
8. Reasons to choose the business, limited to owner-confirmed claims.
9. Location/contact section with exact address and map only after details are supplied.
10. Footer with business contacts, navigation and social links only when configured.

## 7. Product listing page

- Category heading and useful intro text.
- Search, sort and filters that work on mobile.
- Product cards with image, name, variant/size summary, customer-appropriate price and availability.
- Add-to-cart control with quantity/variant selection where sensible.
- Show MOQ to approved wholesale customers.
- Do not display wholesale price to unauthorized users even briefly during loading/hydration.
- Include pagination or “load more” with crawl-friendly category/product links.

## 8. Product detail page

- Large image/gallery.
- Product title, SKU and description.
- Variant selector with variant-specific image and availability.
- Price based on current server-authenticated customer type.
- Wholesale MOQ for approved wholesale customers.
- Quantity selector.
- Add to Cart.
- Related products from the same category.
- Enquiry/contact CTA for services or unavailable products.
- Dynamic title, description, canonical URL and social metadata.

## 9. Cart and checkout

Cart page must show:

- Product thumbnail/name.
- Selected variant and key attributes.
- Quantity and MOQ validation.
- Unit price and line total for the currently authenticated tier (provisional before server validation).
- Remove item and continue shopping.
- Subtotal/estimated total with a note that final amount is validated at submission.

Checkout must:

- Require customer sign-in/register before final submission.
- Preserve cart contents through authentication.
- Show customer and item summary.
- Collect optional customer note.
- Require clear final confirmation before creating the enquiry.
- Never show a payment form or “Pay Now” action in version one.

## 10. Account and wholesale UI

- Clear retail/wholesale account status.
- Wholesale application form should explain mandatory GSTIN and business proof before submission.
- Document upload must restrict file size/type and show upload state/errors.
- Pending/rejected users must not see wholesale prices.
- Approved account badge/status is useful, but it must be based on the backend response.
- Customer enquiry history should show enquiry ID, date, status, amount and enquiry detail.

## 11. Admin experience

Admin should be data-dense but clean:

- Side navigation for Dashboard, Products, Categories, Wholesale Applications, Customers, Enquiries, Settings and Audit.
- Search and filters on tables.
- Clear status badges for enquiry and wholesale states.
- Variant editor for separate retail/wholesale price, MOQ, image and availability.
- Confirmation dialogs for sensitive status/price changes.
- Empty, loading, error and success states.
- Avoid showing fake statistics or demo records in production.

## 12. Billing experience

Billing should have its own distinct layout/navigation, while retaining brand consistency.

Key screens:

- Billing dashboard with total recorded payable, received and outstanding amounts (date filter clearly labelled).
- Unified records table with source label (`Online enquiry` / `Offline sale`).
- Search by enquiry/sale ID and customer.
- Payment status filters.
- Record detail with payable amount, received, outstanding and payment history.
- Add payment form supporting amount, method, date, reference and note.
- New offline sale flow with customer/walk-in fields and multiple line items.
- Clear confirmation before saving receipts/reversals.

Do not represent an unpaid enquiry amount as collected revenue. Label totals accurately (e.g. “Payable”, “Received”, “Outstanding”).

## 13. Responsive behaviour

- Mobile-first layout.
- Product grid: typically 2 columns on narrow screens where cards remain usable; collapse to 1 when necessary.
- Mobile cart and checkout controls should be thumb-friendly.
- Admin/billing tables should use responsive cards or deliberate horizontal scrolling, not clipped columns.
- Modal dialogs must fit within viewport and remain keyboard accessible.
- Avoid hover-only interactions.

## 14. Accessibility and interaction

- Semantic heading hierarchy and landmarks.
- Keyboard-accessible menus, dialogs, form controls and product selection.
- Visible focus indicators.
- Label every form input and provide clear validation messages.
- Ensure contrast on gold/black and dark/light combinations.
- Respect reduced-motion preference.
- Do not convey status by colour alone.
- Provide alt text for product and brand images.

## 15. Motion and visual polish

- Use small, purposeful transitions for menus, cart updates, tabs and modals.
- Avoid scroll hijacking, heavy parallax and excessive motion.
- Keep product interactions fast; animation must not delay add-to-cart or submit actions.
- Optimize client bundles and image loading.

## 16. Design acceptance checklist

- Supplied IFC logo is used without alteration.
- Brand identity consistently uses dark navy/black and gold accents.
- Public pages look premium but remain product-first and easy to shop.
- Retail and wholesale price visibility is correct for each account state.
- Cart works on mobile and desktop.
- Admin and billing are visually distinct but consistent.
- No placeholder or invented business contact/product data appears as real.
- All loading, error, empty and success states are designed.
