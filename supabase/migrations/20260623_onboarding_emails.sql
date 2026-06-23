-- Onboarding email tracking + unsubscribe suppression.
-- Run once in Supabase (SQL Editor). Idempotent.
--
-- Stores, per recipient, the Resend IDs of the scheduled drip emails (so we can
-- cancel them on unsubscribe) and the unsubscribe flag (so we never email a
-- suppressed address again). Service-role only — RLS on with no policies.

create table if not exists public.onboarding_emails (
  email           text primary key,
  name            text,
  scheduled_ids   text[] not null default '{}',
  unsubscribed    boolean not null default false,
  unsubscribed_at timestamptz,
  created_at      timestamptz not null default now()
);

alter table public.onboarding_emails enable row level security;
-- No policies => only the service role (which bypasses RLS) can read/write.
