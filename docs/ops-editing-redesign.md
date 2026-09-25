# Ops editing and native redesign

Implemented booking, customer profile, payment, maintenance block and document metadata edits. Booking edits lock the row, validate the merged range, check availability, update the category when reassigned and append an attributed same-status audit event. Cancelled/rejected bookings reject edits. Maintenance and booking writes serialize on the vehicle to prevent cross-table reservation races. Customer phone edits use the shared international normalizer; handover payments remain editable through their checklist.

The iOS app now has Today, Bookings, Fleet and Customers, an embedded Calendar mode and a shared floating booking button that hides on pushed details. Detail cards and the pinned action follow booking status. The editor re-quotes changed dates/vehicles, offers the previous price or a manual amount, and sends changed fields only. Customer contacts, profiles, payment editing and block/document edit/delete are included. Document edits retain the existing attachment.

`depositRequired` is an additive detail field: the editor changes the agreed deposit, while the money card continues displaying the collected deposit. API version is 2; the minimum app build is unchanged.

## Verification

- `npm test`: 197 tests pass, including edit contracts, error responses, omitted-field behavior, customer phone normalization and handover payment protection.
- `npm run lint`, `npx tsc --noEmit`, `npm run build`: pass.
- `scripts/test-admin-bookings.sh`: all migrations, including 0011, apply in disposable PostgreSQL; free/clashing/locked booking edits, audit events, partial ranges, zero deposit, note clearing, category reassignment and maintenance overlap pass. Separate sessions verify booking/booking and booking/maintenance races.
- `ios/verify.sh full`: all three targets compile and bundle verification passes, unsigned build 1.1 (25).
- `ios/test-models.sh`: compatibility, status priorities/actions, rental-day precision and overdue countdown pass.
- An isolated simulator copy uses synthetic data and a fake transport. Today, four tabs, ongoing detail, hidden floating action on pushed detail and the return checklist opening from the primary action were visually checked.
- Remaining manual checks: all seven detail statuses, date-price diff/save/refresh, customer/payment/block/document mutation walkthroughs, dark mode, XL Dynamic Type and iPad. The Mac locked during this walkthrough.
- No production customer or booking was changed. Live authenticated curl checks have not been run; route tests use a mocked authenticated admin, while transaction checks execute in PostgreSQL.

## Rollout

1. Apply `supabase/migrations/0011_booking_edits.sql` to the deployment database.
2. Deploy the web/API changes, then verify authenticated edit responses against disposable staging records.
3. Finish the remaining simulator checks and upload a new signed TestFlight build. Build 24 already uploaded previously does not include this redesign. This change has not been deployed or uploaded.

The database update is additive. Older builds continue using their existing routes. Never publish a new native build before its edit routes and migration are available.
