-- NexPay Supabase schema
-- Derived from app data models (profiles, KYC, transactions, notifications, contacts, help articles)
-- Run in: Supabase Dashboard → SQL Editor → New query → Run

create extension if not exists "pgcrypto";

-- Profiles (mirrors Firebase UserProfile)
create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  username text not null,
  email text not null unique,
  phone text,
  wallet_address text,
  tier text not null default 'Free' check (tier in ('Free', 'Pro', 'Business')),
  kyc_verified boolean not null default false,
  kyc_status text not null default 'not_submitted'
    check (kyc_status in ('not_submitted', 'pending', 'approved', 'rejected')),
  kyc_details jsonb default '{}'::jsonb,
  referral_code text unique,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- KYC submission archive
create table if not exists public.kyc_submissions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  id_type text,
  id_front_url text,
  id_back_url text,
  selfie_url text,
  personal jsonb default '{}'::jsonb,
  address jsonb default '{}'::jsonb,
  status text not null default 'pending'
    check (status in ('pending', 'approved', 'rejected')),
  reviewer_notes text,
  created_at timestamptz not null default now(),
  reviewed_at timestamptz
);

-- On/off-chain transfer logs
create table if not exists public.transactions (
  id uuid primary key default gen_random_uuid(),
  signature text unique,
  sender_id uuid references public.profiles(id) on delete set null,
  sender_address text not null,
  recipient_address text not null,
  amount numeric(18,6) not null,
  currency text not null default 'USDC',
  fee numeric(18,6) not null default 0,
  memo text,
  status text not null default 'completed'
    check (status in ('pending', 'completed', 'failed')),
  country text,
  created_at timestamptz not null default now()
);

-- In-app notifications
create table if not exists public.notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  type text not null default 'info',
  title text not null,
  body text,
  read boolean not null default false,
  created_at timestamptz not null default now()
);

-- Saved recipients
create table if not exists public.contacts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  name text not null,
  country text,
  account text,
  note text,
  created_at timestamptz not null default now()
);

-- Analytics / compliance events
create table if not exists public.events (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references public.profiles(id) on delete set null,
  event_name text not null,
  payload jsonb default '{}'::jsonb,
  created_at timestamptz not null default now()
);

-- Help Center / content articles (prototype CMS)
create table if not exists public.articles (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  title text not null,
  category text not null,
  summary text,
  body text not null,
  published boolean not null default true,
  sort_order int not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- updated_at trigger
create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists profiles_set_updated_at on public.profiles;
create trigger profiles_set_updated_at
  before update on public.profiles
  for each row execute function public.set_updated_at();

drop trigger if exists articles_set_updated_at on public.articles;
create trigger articles_set_updated_at
  before update on public.articles
  for each row execute function public.set_updated_at();

-- Auto-create profile on signup
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, username, email, phone, wallet_address, referral_code)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'username', split_part(new.email, '@', 1)),
    new.email,
    new.raw_user_meta_data->>'phone',
    new.raw_user_meta_data->>'wallet_address',
    'NEX-' || upper(substr(replace(new.id::text, '-', ''), 1, 6))
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- RLS
alter table public.profiles enable row level security;
alter table public.kyc_submissions enable row level security;
alter table public.transactions enable row level security;
alter table public.notifications enable row level security;
alter table public.contacts enable row level security;
alter table public.events enable row level security;
alter table public.articles enable row level security;

-- Profiles policies
drop policy if exists "profiles_select_own" on public.profiles;
create policy "profiles_select_own" on public.profiles for select using (auth.uid() = id);
drop policy if exists "profiles_update_own" on public.profiles;
create policy "profiles_update_own" on public.profiles for update using (auth.uid() = id);
drop policy if exists "profiles_insert_own" on public.profiles;
create policy "profiles_insert_own" on public.profiles for insert with check (auth.uid() = id);

-- KYC
drop policy if exists "kyc_own" on public.kyc_submissions;
create policy "kyc_own" on public.kyc_submissions for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- Transactions: sender can read/write own
drop policy if exists "tx_select_own" on public.transactions;
create policy "tx_select_own" on public.transactions
  for select using (auth.uid() = sender_id);
drop policy if exists "tx_insert_own" on public.transactions;
create policy "tx_insert_own" on public.transactions
  for insert with check (auth.uid() = sender_id or sender_id is null);

-- Notifications / contacts / events
drop policy if exists "notif_own" on public.notifications;
create policy "notif_own" on public.notifications for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
drop policy if exists "contacts_own" on public.contacts;
create policy "contacts_own" on public.contacts for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
drop policy if exists "events_insert" on public.events;
create policy "events_insert" on public.events for insert with check (true);
drop policy if exists "events_select_own" on public.events;
create policy "events_select_own" on public.events for select using (auth.uid() = user_id or user_id is null);

-- Articles: public read
drop policy if exists "articles_public_read" on public.articles;
create policy "articles_public_read" on public.articles for select using (published = true);

-- Seed Help Center articles (from app Help topics)
insert into public.articles (slug, title, category, summary, body, sort_order) values
  ('sending-money', 'Sending money', 'Transfers', 'How USDC remittances work on Solana',
   'Enter an amount in USDC, pick a destination currency, paste a Solana address, then confirm with your wallet. NexPay charges a flat 0.1% fee.', 1),
  ('kyc-verification', 'KYC verification', 'Compliance', 'Complete identity checks to unlock Pro limits',
   'Upload a government ID (passport, national ID, or driver license), take a selfie, and verify your address. Most reviews finish within minutes in demo mode.', 2),
  ('fees-and-limits', 'Fees & limits', 'Account', 'Understand Free vs Pro tiers',
   'Free tier: 0.1% fee with lower daily caps. Pro: lower fees, higher limits, virtual card access. Upgrade from Settings → Premium.', 3),
  ('wallet-and-solana', 'Wallet & Solana', 'Security', 'Connect Phantom or Solflare on Devnet',
   'NexPay uses Solana Devnet for hackathon demos. Freeze your wallet anytime from Security Center. Always verify recipient addresses.', 4),
  ('privacy-policy', 'Privacy Policy', 'Legal', 'How we handle identity and wallet data',
   'KYC documents are stored encrypted. On-chain transfers are public by design. You can request profile deletion of off-chain data from Settings.', 5),
  ('terms-of-service', 'Terms of Service', 'Legal', 'Rules for using NexPay',
   'Users must comply with AML and sanctions rules. Fees are 0.1% unless your tier specifies otherwise. Devnet builds are for demonstration only.', 6)
on conflict (slug) do update set
  title = excluded.title,
  category = excluded.category,
  summary = excluded.summary,
  body = excluded.body,
  sort_order = excluded.sort_order,
  updated_at = now();
