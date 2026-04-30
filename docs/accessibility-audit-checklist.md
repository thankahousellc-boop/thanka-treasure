# Accessibility Audit Checklist (WCAG 2.1 AA)

This checklist is the baseline for Phase 7.6 manual validation.

## Scope

- Storefront pages in `app/(shop)`
- Cart and checkout interactions
- Authentication screens
- Admin core surfaces used daily

## Automated Pre-Checks

Run these before manual auditing:

```bash
pnpm lint
pnpm db:parity
```

Use browser accessibility tooling (Lighthouse + axe DevTools) on:

- `/`
- `/products`
- `/products/[slug]`
- `/cart`
- `/checkout`
- `/blogs`
- `/contact`

## Manual Keyboard Checks

- Tab order is logical and consistent across header, content, and footer.
- Skip link moves focus to `#main-content`.
- Interactive controls are operable without a pointer.
- No keyboard traps in dialogs, drawers, or embedded checkout UI.
- Focus is visible at `:focus-visible` states for links, buttons, and inputs.

## Screen Reader Checks

- Every form control has a programmatic label.
- Status and error messages announce with appropriate live regions.
- Navigation landmarks are present and named meaningfully.
- Icon-only buttons include accurate accessible names.
- Heading hierarchy is consistent and page-level `h1` is unique.

## Visual Checks

- Text contrast meets or exceeds 4.5:1 for normal text.
- Non-text UI contrast meets or exceeds 3:1 for boundaries/focus indicators.
- Content remains usable at 200% zoom and narrow mobile widths.
- Layout supports reduced motion preferences where motion is present.

## Open Findings Log

Use this template for each finding:

- ID:
- Page/Route:
- WCAG Criterion:
- Severity:
- Repro Steps:
- Expected:
- Actual:
- Fix Reference:
- Status:

### Findings Processed (Batch 1)

- ID: A11Y-001
- Page/Route: `/products`, `/blogs`, `/collections/[slug]`
- WCAG Criterion: 2.1.1 Keyboard, 4.1.2 Name/Role/Value
- Severity: Medium
- Repro Steps: Navigate to first or last page in listing pagination and tab to disabled "Previous" or "Next" controls.
- Expected: Disabled controls are non-interactive and announced as disabled.
- Actual: Disabled states used anchor tags with `href`, so controls remained link-like and potentially keyboard activatable.
- Fix Reference: `app/(shop)/products/page.tsx`, `app/(shop)/blogs/page.tsx`, `app/(shop)/collections/[slug]/page.tsx`
- Status: Fixed

- ID: A11Y-002
- Page/Route: `/`, `/newsletter`, `/products/[slug]`, `/contact`
- WCAG Criterion: 4.1.1 Parsing, 4.1.2 Name/Role/Value
- Severity: Medium
- Repro Steps: Render repeated interactive components and inspect form/control IDs and aria-describedby references.
- Expected: IDs are unique per component instance.
- Actual: Reused static IDs in newsletter/add-to-cart/contact components could create collisions in repeated renders.
- Fix Reference: `components/shop/newsletter-form.tsx`, `components/shop/add-to-cart-button.tsx`, `components/shop/contact-form.tsx`
- Status: Fixed

- ID: A11Y-003
- Page/Route: Product cards in listing surfaces
- WCAG Criterion: 1.1.1 Non-text Content
- Severity: Low
- Repro Steps: Inspect product card markup with screen reader/image semantics.
- Expected: Decorative hover-only imagery is hidden from assistive technologies.
- Actual: Secondary hover image exposed redundant alt text.
- Fix Reference: `components/shop/product-card.tsx`
- Status: Fixed

- ID: A11Y-004
- Page/Route: `/checkout`, `/auth/login`, `/auth/signup`, `/auth/reset-password`
- WCAG Criterion: 3.3.1 Error Identification, 4.1.3 Status Messages
- Severity: Medium
- Repro Steps: Trigger checkout/auth errors and observe SR announcements.
- Expected: Error/status feedback is announced via live regions.
- Actual: Feedback text lacked explicit live-region semantics in key auth/checkout surfaces.
- Fix Reference: `components/shop/checkout-embedded.tsx`, `app/auth/login/page.tsx`, `app/auth/signup/page.tsx`, `app/auth/reset-password/page.tsx`
- Status: Fixed

### Findings Processed (Batch 2)

- ID: A11Y-005
- Page/Route: Product cards (`/`, `/products`, `/collections/[slug]`)
- WCAG Criterion: 2.1.1 Keyboard, 2.4.7 Focus Visible
- Severity: Low
- Repro Steps: Keyboard-tab through product cards and compare visual behavior to pointer hover state.
- Expected: Keyboard focus should provide equivalent interactive visual affordance.
- Actual: Secondary image reveal behavior was hover-only.
- Fix Reference: `components/shop/product-card.tsx`
- Status: Fixed

- ID: A11Y-006
- Page/Route: Blog cards (`/blogs`, `/blogs/[slug]` related articles, homepage journal section)
- WCAG Criterion: 2.4.4 Link Purpose (In Context), 2.1.1 Keyboard
- Severity: Low
- Repro Steps: Navigate blog cards by keyboard and inspect interactive affordances and linked heading semantics.
- Expected: Card affordances should react on keyboard focus, and article title should be directly linkable.
- Actual: Image visual feedback was hover-only and heading text was not directly linked.
- Fix Reference: `components/shop/blog-card.tsx`
- Status: Fixed

- ID: A11Y-007
- Page/Route: `/newsletter`, `/contact`
- WCAG Criterion: 3.3.1 Error Identification, 3.3.2 Labels or Instructions
- Severity: Medium
- Repro Steps: Submit invalid form values and re-edit after error/success states.
- Expected: Native field-level validation should remain available and stale async status messages should clear while editing.
- Actual: Forms disabled native validation and retained stale status text across edits.
- Fix Reference: `components/shop/newsletter-form.tsx`, `components/shop/contact-form.tsx`
- Status: Fixed

- ID: A11Y-008
- Page/Route: `/checkout`
- WCAG Criterion: 1.3.1 Info and Relationships, 3.3.2 Labels or Instructions
- Severity: Low
- Repro Steps: Inspect discount code field semantics and helper instructions with assistive technologies.
- Expected: Explicit input-label association and guidance text programmatically connected to the input.
- Actual: Input relied on wrapper semantics without explicit described helper guidance.
- Fix Reference: `components/shop/checkout-embedded.tsx`
- Status: Fixed

### Findings Processed (Batch 3)

- ID: A11Y-009
- Page/Route: `/account/orders`
- WCAG Criterion: 1.3.1 Info and Relationships
- Severity: Medium
- Repro Steps: Review order history table semantics with screen reader table navigation commands.
- Expected: Data table has caption, column headers with scope, and row headers for order identifiers.
- Actual: Table lacked caption and explicit header scope semantics.
- Fix Reference: `app/(shop)/account/orders/page.tsx`
- Status: Fixed

- ID: A11Y-010
- Page/Route: Admin shell (`/admin/*`)
- WCAG Criterion: 1.3.1 Info and Relationships, 2.4.6 Headings and Labels
- Severity: Low
- Repro Steps: Navigate admin sidebar and topbar with screen reader heading/landmark shortcuts.
- Expected: Sidebar navigation is explicitly labeled and topbar avoids duplicate page-level heading semantics.
- Actual: Sidebar nav lacked explicit label; topbar used a page-level heading pattern across all routes.
- Fix Reference: `components/admin/sidebar.tsx`, `components/admin/topbar.tsx`
- Status: Fixed

### Findings Processed (Batch 4)

- ID: A11Y-011
- Page/Route: `/admin/orders`, `/admin/products`, `/admin/discounts`, `/admin/messages`
- WCAG Criterion: 1.3.1 Info and Relationships
- Severity: Medium
- Repro Steps: Navigate admin list tables with screen reader table commands and inspect header associations.
- Expected: Tables provide captions, explicit column-header scope, and row headers for primary row identifiers.
- Actual: Several admin tables used visual headers only, without explicit scope/caption semantics.
- Fix Reference: `app/(admin)/admin/orders/page.tsx`, `app/(admin)/admin/products/page.tsx`, `app/(admin)/admin/discounts/page.tsx`, `app/(admin)/admin/messages/page.tsx`
- Status: Fixed

- ID: A11Y-012
- Page/Route: `/admin/messages`
- WCAG Criterion: 1.3.1 Info and Relationships, 3.3.2 Labels or Instructions
- Severity: Medium
- Repro Steps: Inspect per-submission workflow controls with form-label accessibility checks.
- Expected: Row-level status and notes fields have explicit programmatic labels.
- Actual: Status select and notes textarea relied on surrounding context/placeholder only.
- Fix Reference: `app/(admin)/admin/messages/page.tsx`
- Status: Fixed

### Findings Processed (Batch 5)

- ID: A11Y-013
- Page/Route: `/admin/blog`, `/admin/pages`, `/admin/subscribers`
- WCAG Criterion: 1.3.1 Info and Relationships
- Severity: Medium
- Repro Steps: Navigate admin listing tables with screen reader table commands and inspect table headers.
- Expected: Tables provide explicit caption and column/row header semantics for reliable cell associations.
- Actual: Remaining core admin list tables still used implicit header semantics only.
- Fix Reference: `app/(admin)/admin/blog/page.tsx`, `app/(admin)/admin/pages/page.tsx`, `app/(admin)/admin/subscribers/page.tsx`
- Status: Fixed

### Findings Processed (Batch 6)

- ID: A11Y-014
- Page/Route: `/admin/products/inventory`, `/admin/orders/[id]`, `/admin/analytics`
- WCAG Criterion: 1.3.1 Info and Relationships
- Severity: Medium
- Repro Steps: Navigate inventory/detail/analytics tables with screen reader table commands and verify header associations.
- Expected: Tables include explicit caption and scoped column/row headers across both list and detail analytics surfaces.
- Actual: Several remaining admin tables still relied on implicit associations or lacked row-header semantics.
- Fix Reference: `app/(admin)/admin/products/inventory/page.tsx`, `app/(admin)/admin/orders/[id]/page.tsx`, `app/(admin)/admin/analytics/page.tsx`
- Status: Fixed

### Findings Processed (Batch 7)

- ID: A11Y-015
- Page/Route: `/admin/customers`
- WCAG Criterion: 1.3.1 Info and Relationships
- Severity: Medium
- Repro Steps: Navigate customer table with screen reader table commands and inspect cell-header associations.
- Expected: Table includes caption and scoped column/row headers for reliable navigation.
- Actual: Customer table still relied on implicit header semantics.
- Fix Reference: `app/(admin)/admin/customers/page.tsx`
- Status: Fixed

### Findings Processed (Batch 8)

- ID: A11Y-016
- Page/Route: `/cart`
- WCAG Criterion: 4.1.3 Status Messages
- Severity: Medium
- Repro Steps: Change quantity, remove an item, and clear cart with a screen reader active.
- Expected: Cart state changes are announced via a polite live region without requiring focus changes.
- Actual: Cart totals and item state changed visually, but dynamic updates were not explicitly announced.
- Fix Reference: `components/shop/cart-view.tsx`
- Status: Fixed

### Findings Processed (Batch 9)

- ID: A11Y-017
- Page/Route: `/products/[slug]`
- WCAG Criterion: 4.1.3 Status Messages
- Severity: Low
- Repro Steps: Activate "Add to cart" repeatedly with a screen reader while remaining on the same product page.
- Expected: Each add action is announced reliably via live region status messaging.
- Actual: Repeated actions could reuse the same live-region text and intermittently skip announcements.
- Fix Reference: `components/shop/add-to-cart-button.tsx`
- Status: Fixed

### Findings Processed (Batch 10)

- ID: A11Y-018
- Page/Route: `/cart`
- WCAG Criterion: 4.1.3 Status Messages
- Severity: Low
- Repro Steps: Trigger repeated quantity/remove/clear actions with a screen reader and compare announcement consistency.
- Expected: Repeated cart actions should re-announce status messages consistently.
- Actual: Repeated interactions could reuse unchanged live-region text and occasionally suppress follow-up announcements.
- Fix Reference: `components/shop/cart-view.tsx`
- Status: Fixed

### Findings Processed (Batch 11)

- ID: A11Y-019
- Page/Route: Storefront header/footer currency selector (`/`, `/products`, `/blogs`, `/search`, `/cart`, `/checkout`)
- WCAG Criterion: 4.1.3 Status Messages
- Severity: Low
- Repro Steps: Change display currency with a screen reader and observe whether update progress/completion is announced.
- Expected: Currency changes are announced as status updates when conversion refresh begins and completes.
- Actual: Currency switched visually after refresh, but no explicit status messaging confirmed update lifecycle.
- Fix Reference: `components/shop/currency-selector.tsx`
- Status: Fixed

### Findings Processed (Batch 12)

- ID: A11Y-020
- Page/Route: `/contact`, `/newsletter`, `/checkout`
- WCAG Criterion: 2.4.7 Focus Visible
- Severity: Medium
- Repro Steps: Keyboard-tab through contact/newsletter/checkout discount form fields and inspect focus indicator visibility.
- Expected: Input and textarea controls retain a clearly visible focus indicator at `:focus-visible`.
- Actual: `outline-none` utility classes suppressed the global focus-visible outline, reducing keyboard focus visibility.
- Fix Reference: `components/shop/contact-form.tsx`, `components/shop/newsletter-form.tsx`, `components/shop/checkout-embedded.tsx`
- Status: Fixed

### Findings Processed (Batch 13)

- ID: A11Y-021
- Page/Route: `/admin/products/new`, `/admin/products/[id]`, `/admin/blog/new`, `/admin/blog/[id]`
- WCAG Criterion: 2.4.7 Focus Visible
- Severity: Medium
- Repro Steps: Keyboard-tab into rich-text editor content areas and inspect whether focus is visually apparent.
- Expected: Rich-text editor surfaces provide a clear visible focus indicator when keyboard focus enters the editable region.
- Actual: Editor content areas used `focus:outline-none`, suppressing default/global focus outline and reducing focus visibility.
- Fix Reference: `app/(admin)/admin/products/product-description-editor.tsx`, `app/(admin)/admin/blog/blog-content-editor.tsx`
- Status: Fixed

### Findings Processed (Batch 14)

- ID: A11Y-022
- Page/Route: `/auth/login`, `/auth/signup`, `/auth/reset-password`
- WCAG Criterion: 3.3.1 Error Identification, 2.4.3 Focus Order
- Severity: Medium
- Repro Steps: Submit invalid auth form values and observe where keyboard focus lands after server-redirected error states.
- Expected: Error feedback is immediately discoverable for keyboard and assistive technology users when the page re-renders with an error.
- Actual: Error text was announced via alert semantics, but no explicit focus targeting was provided for the rendered error message.
- Fix Reference: `app/auth/login/page.tsx`, `app/auth/signup/page.tsx`, `app/auth/reset-password/page.tsx`
- Status: Fixed

## Current Status

- Baseline checklist created.
- Prior hardening already in place for skip link, landmarks, focus styles, mixed-currency checkout semantics, and checkout status live regions.
- First remediation batch completed for pagination keyboard semantics, live-region announcements, and repeated ID collisions.
- Second remediation batch completed for keyboard focus parity on cards, heading link clarity in blog cards, native form validation behavior, and checkout field semantics.
- Third remediation batch completed for account order table semantics and admin shell landmark/heading clarity.
- Fourth remediation batch completed for admin data-table semantics (caption/scope/row headers) and explicit labels on contact-submission workflow controls.
- Fifth remediation batch completed for remaining core admin listing table semantics (blog, static pages, and subscribers).
- Sixth remediation batch completed for inventory/detail/analytics table semantics across admin workflows.
- Seventh remediation batch completed for customer table semantics to align with the rest of admin surfaces.
- Eighth remediation batch completed for cart update status announcements (quantity/remove/clear actions).
- Ninth remediation batch completed for repeated add-to-cart announcement reliability.
- Tenth remediation batch completed for repeated cart status announcement reliability.
- Eleventh remediation batch completed for currency selector update status announcements.
- Twelfth remediation batch completed for storefront form focus-visible indicator restoration.
- Thirteenth remediation batch completed for admin rich-text editor focus-visible indicator restoration.
- Fourteenth remediation batch completed for auth error message focus targeting.
- Full manual route-by-route audit is in progress.
