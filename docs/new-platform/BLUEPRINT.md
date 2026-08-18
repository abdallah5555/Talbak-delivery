# Talbak New Platform — Product & Technical Blueprint

Status: Phase 0 — Architecture baseline
Branch: `multi-app-rebuild`

## Goal

Build a new local-commerce and delivery platform from zero, using the existing Talbak application only as a reference. The production application on `main` is not modified by this rebuild.

## Product shape

Four independent clients share one backend:

- Customer App — browse, cart, checkout, orders, tracking, ratings, support.
- Driver App — onboarding, availability, offers, delivery workflow, earnings, support.
- Merchant App — store, catalog, orders, availability, offers, analytics; POS/inventory later.
- Admin Web — platform operations, approvals, users, stores, orders, finance controls, settings, audit.

Backend:

- Supabase Auth
- PostgreSQL
- Row Level Security (RLS)
- Storage
- Realtime
- Edge Functions

## Product principle

Food is the first vertical. The data model must support additional verticals later (grocery, pharmacy, bakery, retail and local parcel delivery) without redesigning orders or identities.

## Non-negotiables

1. No secrets in frontend code, localStorage, source control, or client-visible database columns.
2. Database is the source of truth.
3. Server/database calculates authoritative order totals.
4. RLS is mandatory for every exposed business table.
5. Role checks are server-enforced; UI hiding is not authorization.
6. Every privileged operation is auditable.
7. Payment integration is not required for MVP; cash/manual payment is supported first.
8. Maps use a provider abstraction; Leaflet is the UI layer and no Google Maps dependency is required.
9. Free-first infrastructure is required for MVP. Any future paid dependency must be optional, isolated, and replaceable.
10. Each app is independently deployable and testable.

## MVP acceptance path

A release is not considered MVP-complete until this path works end-to-end:

Customer signs up → browses an active merchant → adds items → server validates price/availability → places order → merchant receives and accepts → driver is assigned/accepts → driver picks up → driver delivers → customer sees final state → rating/support data is stored → admin can audit the complete lifecycle.

## Delivery phases

### Phase 0 — Foundation

Architecture, schema, identity, roles, RLS, storage, state machine, validation, error model, audit model, CI.

### Phase 1 — Food MVP

Customer + Merchant + Driver + Admin with the end-to-end order path.

### Phase 2 — Competitive layer

Offers, coupons, loyalty, referrals, reviews, support/chat boundaries, merchant analytics, driver incentives, dispatch improvements.

### Phase 3 — Local commerce

Grocery, bakery, pharmacy and retail verticals using the same order engine.

### Phase 4 — Merchant OS

POS, inventory, invoices, profit reporting, staff and branch management.

### Phase 5 — Logistics

Local parcel pickup/delivery and scheduled delivery.

### Phase 6 — Intelligence

Search/ranking assistance, dispatch optimization, demand forecasting, fraud signals and personalization. AI is optional and must never be a hard dependency for core operations.

## Architecture rule

Do not build all four UIs at once. Complete and test the shared foundation first, then implement one vertical workflow at a time. Every phase must leave the branch buildable.
