---
name: stripe-ui-mode-naming
description: This project's Stripe SDK renames ui_mode values vs standard Stripe docs
metadata:
  type: reference
---

The installed `stripe@22` (API `2026-03-25.dahlia`) and `@stripe/react-stripe-js@6` use **non-standard `ui_mode` string values** in `stripe.checkout.sessions.create`. The TypeScript union is `'elements' | 'embedded_page' | 'form' | 'hosted_page'` — NOT the `'hosted' | 'embedded' | 'custom'` from public Stripe docs.

Mapping (JSDoc says left, type wants right):
- `embedded` → `'embedded_page'` (Embedded Checkout iframe)
- `custom`   → `'elements'` (Custom Checkout: `useCheckout()` + granular Elements)
- `hosted`   → `'hosted_page'` (redirect to stripe.com)

Custom Checkout (`ui_mode: 'elements'`) client API lives in the subpath `@stripe/react-stripe-js/checkout`: `CheckoutElementsProvider`, `useCheckout`, `PaymentElement`, `ShippingAddressElement`, `ExpressCheckoutElement`, `CurrencySelectorElement`. The `ShippingAddressElement` here only accepts `{contacts, display}` — country restriction comes from the session's `shipping_address_collection.allowed_countries`, not element options.

Checkout (`app/(shop)/checkout`) was migrated embedded → custom multi-step using this. Backend (webhook on `checkout.session.completed`, `orderRepository.createFromCheckoutSession`, automatic_tax, shipping_options, discounts) is unchanged — only `ui_mode` flipped.
