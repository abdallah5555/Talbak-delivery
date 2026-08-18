# Free-First Infrastructure Plan

## Required for MVP

| Layer | Choice | Reason |
|---|---|---|
| Frontend | React + Vite + TypeScript | Mature, fast, deployable as PWA |
| Styling | Tailwind CSS | Fast responsive UI without paid dependency |
| Backend | Supabase | Auth, PostgreSQL, Storage, Realtime, Edge Functions |
| Maps UI | Leaflet | Open source and provider-agnostic |
| Map data | OpenStreetMap for MVP | No Google Maps API requirement; comply with tile/data policies |
| Web hosting | Free-first provider selected per current commercial terms | Do not assume a free tier is suitable for commercial production forever |
| Mobile packaging | PWA first; Capacitor later | Same web code can become Android/iOS packages |
| Testing | Vitest + TypeScript checks + static smoke tests | Fast feedback in CI |

## Cost rules

- No paid API is a hard dependency for the MVP.
- No payment gateway is required for the first release.
- AI is optional and cannot be required to place, accept or deliver an order.
- Map provider is abstracted so a future paid/high-volume tile provider can be swapped without changing business logic.
- Email/SMS/WhatsApp/Telegram integrations are isolated behind server-side adapters.

## Secret rules

Never store these in client code, localStorage or public database rows:

- bot tokens
- service-role keys
- provider API secrets
- signing secrets
- database passwords

Secrets belong in the server/Edge Function secret store. Public client configuration is limited to values explicitly intended to be public, such as the Supabase project URL and anon/publishable key.

## Scale-up triggers

We only pay for infrastructure when a measurable limit is reached or a required commercial feature cannot be provided safely by the free stack. Each upgrade must name the limit, expected traffic, cost and rollback/provider alternative.
