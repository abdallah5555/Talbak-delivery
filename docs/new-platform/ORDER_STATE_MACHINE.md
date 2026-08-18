# Order State Machine

The order lifecycle is explicit, finite, auditable and server-controlled.

## States

`draft` → `pending_merchant` → `accepted` → `preparing` → `ready_for_pickup` → `driver_assigned` → `picked_up` → `on_the_way` → `delivered`

Terminal alternatives:

- `cancelled_by_customer`
- `rejected_by_merchant`
- `cancelled_by_admin`
- `failed_delivery`

## Allowed transitions

| From | To | Actor |
|---|---|---|
| draft | pending_merchant | Customer/server |
| pending_merchant | accepted | Merchant |
| pending_merchant | rejected_by_merchant | Merchant |
| accepted | preparing | Merchant |
| preparing | ready_for_pickup | Merchant |
| ready_for_pickup | driver_assigned | Server/dispatch |
| driver_assigned | picked_up | Driver |
| picked_up | on_the_way | Driver |
| on_the_way | delivered | Driver/server verification |
| pending_merchant | cancelled_by_customer | Customer, before acceptance |
| accepted/preparing/ready_for_pickup | cancelled_by_admin | Admin, audited |
| driver_assigned/picked_up/on_the_way | failed_delivery | Driver/admin, audited |

## Rules

1. The frontend cannot directly set arbitrary order status.
2. Every transition is checked against the current database state.
3. Transitions are atomic and append an order-event/audit record.
4. The authoritative total is calculated from database prices and validated quantities at order creation.
5. Merchant, driver and customer visibility is derived from ownership/assignment, not from a status string.
6. Realtime events are notifications of database changes, not authorization.
7. Admin overrides require an explicit reason and audit entry.
8. A driver cannot accept an order that has already been accepted by another driver; assignment must be atomic.
9. Delivered orders are immutable for customer/merchant/driver edits except for permitted post-delivery records such as ratings, complaints and refunds/adjustments handled by authorized server workflows.
