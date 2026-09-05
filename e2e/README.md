# Talbak Delivery E2E

This suite uses Playwright to exercise the real deployed UI with short-lived Supabase Auth accounts.

## Required CI secrets

- `E2E_SUPABASE_URL`: the Supabase project URL.
- `E2E_SUPABASE_SERVICE_ROLE_KEY`: a server-only Supabase service-role/secret key.

The key is consumed only by `e2e/global-setup.ts` and is never injected into Vite or browser code. Supabase admin user creation/deletion requires a trusted server-side key.

## Running locally

```bash
npm install
npx playwright install --with-deps chromium
E2E_SUPABASE_URL="..." E2E_SUPABASE_SERVICE_ROLE_KEY="..." npm run e2e
```

To test a deployed build:

```bash
E2E_BASE_URL="https://your-preview-or-deployment.example" E2E_SUPABASE_URL="..." E2E_SUPABASE_SERVICE_ROLE_KEY="..." npm run e2e
```

## What is covered

- Customer, merchant, driver and admin authentication.
- Role-isolated workspaces and URL tampering checks.
- Multi-role switching for merchant/driver accounts.
- Customer → merchant → driver order lifecycle.
- Driver online/geolocation behavior.
- Merchant inventory/store workspace presence.
- Admin operational workspace presence.
- Automatic cleanup of test users, stores, menu items, inventory, addresses, orders, notifications, applications and related records.

The full-role GitHub Action runs on selected pushes to main and manual dispatch.
It creates real rows and users. Use a dedicated staging Supabase project: fixture
notifications and ready orders can otherwise be visible to operational users.
The lifecycle test mocks automatic assignment to exercise manual acceptance; it
does not certify automatic dispatch.

## Safe isolated checks

`npm run check` typechecks application AND Playwright code, runs service-worker
unit tests, and builds. `npm run test:isolated` runs desktop/mobile browser tests
without database credentials or global setup. Build first using non-production
placeholder Supabase URL/key as configured in `.github/workflows/isolated-tests.yml`.

The isolated browser suite verifies explicit empty-catalog states, network abort,
HTTP 403/500, retry recovery, manifest fields, and offline shell boot. Service-worker
unit tests cover cache ownership, private endpoint exclusion, authorization headers,
missing assets, failed HTTP responses, and cache quota failures.

`order-integrity.spec.ts` adds server pricing, invalid quantity, and cross-account
order read/cancellation checks. These are real database tests, not mocks.

Still required before release sign-off: a verified full role run on staging,
two-driver races/capacity, automatic dispatch, session revocation, broad RLS matrix,
checkout failure/idempotency, and deterministic cancellation/review fixtures.
