-- ============================================================================
--  Dental booking — database setup
--  Paste this whole file into Supabase → SQL Editor → New query → Run.
--  Safe to re-run: every statement is idempotent.
-- ============================================================================

-- ----------------------------------------------------------------------------
--  Table
-- ----------------------------------------------------------------------------
-- `slot` is the 24h "HH:MM" string the UI works with, not a Postgres `time`,
-- so what we store round-trips to the dropdown values exactly.
create table if not exists public.appointments (
  id          bigint generated always as identity primary key,
  name        text        not null,
  phone       text        not null,
  date        date        not null,
  slot        text        not null,
  created_at  timestamptz not null default now(),

  -- One live booking per phone number.
  constraint appointments_phone_key unique (phone),
  -- The double-booking rule, enforced by the database rather than the browser.
  constraint appointments_slot_key  unique (date, slot),

  constraint appointments_phone_check check (phone ~ '^[6-9][0-9]{9}$'),
  constraint appointments_slot_check  check (slot ~ '^([01][0-9]|2[0-3]):[0-5][0-9]$'),
  constraint appointments_name_check  check (char_length(btrim(name)) between 1 and 80)
);

create index if not exists appointments_date_idx on public.appointments (date);

-- ----------------------------------------------------------------------------
--  Row Level Security
-- ----------------------------------------------------------------------------
-- The browser key (anon) gets NO direct access to this table at all — not even
-- SELECT. Patient names and phone numbers are only reachable by a signed-in
-- staff account. Public booking goes through the security-definer functions
-- below, which expose dates and slots but never personal data.
alter table public.appointments enable row level security;

revoke all on public.appointments from anon;

drop policy if exists "staff read appointments"   on public.appointments;
drop policy if exists "staff delete appointments" on public.appointments;

create policy "staff read appointments"
  on public.appointments for select to authenticated using (true);

create policy "staff delete appointments"
  on public.appointments for delete to authenticated using (true);

-- Live updates for the signed-in admin table. Realtime still honours RLS, so
-- this broadcasts to staff sessions only.
do $$
begin
  alter publication supabase_realtime add table public.appointments;
exception
  when duplicate_object then null;  -- already published
  when undefined_object then null;  -- realtime not enabled on this project
end
$$;

-- ----------------------------------------------------------------------------
--  clinic_today() — "today" in the clinic's timezone, not the server's UTC
-- ----------------------------------------------------------------------------
create or replace function public.clinic_today()
returns date
language sql
stable
as $$
  select (now() at time zone 'Asia/Kolkata')::date;
$$;

-- ----------------------------------------------------------------------------
--  taken_slots() — which slots are gone, for greying out the picker
-- ----------------------------------------------------------------------------
create or replace function public.taken_slots()
returns table (date date, slot text)
language sql
security definer
set search_path = public
stable
as $$
  select a.date, a.slot
  from public.appointments a
  where a.date >= public.clinic_today();
$$;

-- ----------------------------------------------------------------------------
--  booking_for_phone() — "this number already has a booking" hint
-- ----------------------------------------------------------------------------
-- Returns date + slot only, and only to a caller who already knows the exact
-- 10-digit number. No name, no listing.
create or replace function public.booking_for_phone(p_phone text)
returns table (date date, slot text)
language sql
security definer
set search_path = public
stable
as $$
  select a.date, a.slot
  from public.appointments a
  where a.phone = p_phone
    and a.date >= public.clinic_today();
$$;

-- ----------------------------------------------------------------------------
--  book_appointment() — the only write path
-- ----------------------------------------------------------------------------
-- Re-validates everything the form checked (never trust the client) and does
-- the replace-then-insert in one transaction, so two people hitting the same
-- slot at the same moment can't both win.
create or replace function public.book_appointment(
  p_name  text,
  p_phone text,
  p_date  date,
  p_slot  text
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_replaced boolean;
begin
  if btrim(coalesce(p_name, '')) = '' then
    return jsonb_build_object('ok', false, 'reason', 'name');
  end if;

  if coalesce(p_phone, '') !~ '^[6-9][0-9]{9}$' then
    return jsonb_build_object('ok', false, 'reason', 'phone');
  end if;

  if p_date is null or p_date < public.clinic_today() then
    return jsonb_build_object('ok', false, 'reason', 'past');
  end if;

  -- Must land on a real 15-minute slot inside clinic hours (10:00–21:00).
  if coalesce(p_slot, '') !~ '^([01][0-9]|2[0-3]):[0-5][0-9]$'
     or p_slot < '10:00' or p_slot > '21:00'
     or right(p_slot, 2) not in ('00', '15', '30', '45') then
    return jsonb_build_object('ok', false, 'reason', 'slot');
  end if;

  if exists (
    select 1 from public.appointments a
    where a.date = p_date and a.slot = p_slot and a.phone <> p_phone
  ) then
    return jsonb_build_object('ok', false, 'reason', 'clash');
  end if;

  -- One booking per number: rebooking drops the earlier one.
  delete from public.appointments a where a.phone = p_phone;
  v_replaced := found;

  insert into public.appointments (name, phone, date, slot)
  values (left(btrim(p_name), 80), p_phone, p_date, p_slot);

  return jsonb_build_object('ok', true, 'replaced', v_replaced);
exception
  -- Someone else committed the same slot a millisecond earlier.
  when unique_violation then
    return jsonb_build_object('ok', false, 'reason', 'clash');
end;
$$;

-- ----------------------------------------------------------------------------
--  Function grants
-- ----------------------------------------------------------------------------
revoke all on function public.taken_slots()                            from public;
revoke all on function public.booking_for_phone(text)                  from public;
revoke all on function public.book_appointment(text, text, date, text) from public;

grant execute on function public.taken_slots()                            to anon, authenticated;
grant execute on function public.booking_for_phone(text)                  to anon, authenticated;
grant execute on function public.book_appointment(text, text, date, text) to anon, authenticated;
