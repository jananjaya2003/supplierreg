-- Seed from Supplier_Registration_Status.xlsx (Sheet1). Run after schema.sql.
-- Uses "on conflict (no) do nothing" so re-running won't duplicate rows.

insert into public.supplier_registrations
  (no, institute, payments_closing_date, applications_closing_date, application_mode,
   method_of_payment, units, unit_price, other_charges, application_sent_date, remarks, status)
values
  (1, 'kandy', '2026-10-15', '2026-10-06', 'Hospital', 'People''s Bank', 1, 0, 0, '2026-10-28', null, 'Complete')
on conflict (no) do nothing;

-- Explicit "no" values don't advance the identity sequence; bump it so new rows start after the seed.
select setval(
  pg_get_serial_sequence('public.supplier_registrations', 'no'),
  greatest(m, 1),
  m > 0
)
from (select coalesce(max(no), 0) as m from public.supplier_registrations) s;
