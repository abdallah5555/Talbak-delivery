# Role & Permission Matrix

## Identity model

One person has one Supabase Auth identity. Business roles are separate records/claims and are never inferred from a frontend route.

Supported roles:

- `customer`
- `driver`
- `merchant_owner`
- `merchant_staff`
- `admin`
- `support_admin` (restricted operational administration)

A user may have more than one role. The UI may offer role switching only after the server confirms that role is active.

## Permission rules

| Capability | Customer | Driver | Merchant | Admin |
|---|---:|---:|---:|---:|
| Read public active stores/catalog | Yes | Limited | Own only | Yes |
| Manage own profile | Yes | Yes | Yes | Yes |
| Place order | Yes | No | No | Controlled support action only |
| Read own orders | Yes | Assigned/accepted only | Own-store only | Yes |
| Accept delivery | No | Yes | No | No |
| Change delivery state | No | Assigned order only | Preparation states only | Controlled override, audited |
| Manage own catalog | No | No | Yes | Yes |
| Manage store availability | No | No | Yes | Yes |
| Approve merchants/drivers | No | No | No | Yes |
| Manage users/roles | No | No | No | Yes |
| Read audit logs | No | No | No | Yes |
| Change platform settings | No | No | No | Admin only |

## RLS design

- Public catalog reads expose only active, non-sensitive fields.
- Customer policies are scoped by `auth.uid()` and ownership.
- Driver policies are scoped to the driver's own profile plus explicitly assigned/eligible orders.
- Merchant policies are scoped through merchant membership and store ownership.
- Admin policies use a server-verifiable role relation; never trust a client-provided role string.
- Sensitive operations that affect money, roles, order assignment or platform configuration use database functions/Edge Functions and are audited.

## Role switching

The client loads active roles after authentication. Switching role changes the client application context, not the user's identity. The server continues to authorize every request from the authenticated identity and active role membership.

A user with multiple roles can move between Customer, Driver and Merchant applications without creating duplicate accounts.
