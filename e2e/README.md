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

The GitHub Action is intentionally **manual** because the default target is a deployed environment and the fixture creates real database rows before deleting them. Prefer a preview/staging deployment when possible.
