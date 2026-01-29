-- Casebird: Conversations & Messages tables
-- Run this in the Supabase SQL Editor

-- Conversations table
create table public.conversations (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references auth.users(id) on delete cascade not null,
  title text not null default 'New conversation',
  mode text not null default 'normal',
  case_language text not null default 'any' check (case_language in ('any', 'EN', 'TC')),
  created_at timestamptz default now() not null,
  updated_at timestamptz default now() not null
);

-- Messages table
create table public.messages (
  id uuid default gen_random_uuid() primary key,
  conversation_id uuid references public.conversations(id) on delete cascade not null,
  role text not null check (role in ('user', 'assistant')),
  content text not null default '',
  thinking_steps jsonb,
  iterations integer,
  created_at timestamptz default now() not null
);

-- Indexes
create index idx_conversations_user_id on public.conversations(user_id);
create index idx_conversations_updated_at on public.conversations(updated_at desc);
create index idx_messages_conversation_id on public.messages(conversation_id);
create index idx_messages_created_at on public.messages(created_at);

-- Enable RLS
alter table public.conversations enable row level security;
alter table public.messages enable row level security;

-- RLS policies for conversations
create policy "Users can view own conversations"
  on public.conversations for select
  using (auth.uid() = user_id);

create policy "Users can create own conversations"
  on public.conversations for insert
  with check (auth.uid() = user_id);

create policy "Users can update own conversations"
  on public.conversations for update
  using (auth.uid() = user_id);

create policy "Users can delete own conversations"
  on public.conversations for delete
  using (auth.uid() = user_id);

-- RLS policies for messages (via conversation ownership)
create policy "Users can view messages in own conversations"
  on public.messages for select
  using (
    conversation_id in (
      select id from public.conversations where user_id = auth.uid()
    )
  );

create policy "Users can insert messages in own conversations"
  on public.messages for insert
  with check (
    conversation_id in (
      select id from public.conversations where user_id = auth.uid()
    )
  );

-- Auto-update updated_at on conversations
create or replace function public.update_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

create trigger conversations_updated_at
  before update on public.conversations
  for each row execute function public.update_updated_at();

-- User settings table
create table public.user_settings (
  user_id uuid references auth.users(id) on delete cascade primary key,
  output_language text not null default 'EN' check (output_language in ('EN', 'TC')),
  created_at timestamptz default now() not null,
  updated_at timestamptz default now() not null
);

alter table public.user_settings enable row level security;

create policy "Users can read own settings"
  on public.user_settings for select
  using (auth.uid() = user_id);

create policy "Users can insert own settings"
  on public.user_settings for insert
  with check (auth.uid() = user_id);

create policy "Users can update own settings"
  on public.user_settings for update
  using (auth.uid() = user_id);

create trigger user_settings_updated_at
  before update on public.user_settings
  for each row execute function public.update_updated_at();

-- Add case_language to conversations (run separately if table already exists)
-- alter table public.conversations add column case_language text not null default 'any' check (case_language in ('any', 'EN', 'TC'));

-- Subscriptions table (for Stripe billing)
create table public.subscriptions (
  user_id uuid references auth.users(id) on delete cascade primary key,
  stripe_customer_id text,
  stripe_subscription_id text,
  plan text not null default 'free' check (plan in ('free', 'pro', 'max')),
  status text not null default 'active' check (status in ('active', 'canceled', 'past_due', 'incomplete')),
  message_count integer not null default 0,
  message_limit integer not null default 10,
  current_period_end timestamptz,
  created_at timestamptz default now() not null,
  updated_at timestamptz default now() not null
);

alter table public.subscriptions enable row level security;

create policy "Users can read own subscription"
  on public.subscriptions for select
  using (auth.uid() = user_id);

-- Allow users to insert their own subscription (auto-create free tier)
create policy "Users can insert own subscription"
  on public.subscriptions for insert
  with check (auth.uid() = user_id);

-- NO UPDATE policy for subscriptions — users cannot directly modify their subscription.
-- Message count is incremented via the increment_message_count RPC (SECURITY DEFINER).
-- All other updates (plan, limits, status) go through the Stripe webhook using service role.

create trigger subscriptions_updated_at
  before update on public.subscriptions
  for each row execute function public.update_updated_at();

-- RPC: Atomically check message limit and increment count.
-- Returns { allowed, plan, count, limit }.
-- SECURITY DEFINER bypasses RLS so users don't need UPDATE access.
create or replace function public.increment_message_count(uid uuid)
returns jsonb
language plpgsql
security definer
as $$
declare
  sub record;
begin
  -- Auto-create free subscription if none exists
  insert into public.subscriptions (user_id, plan, status, message_count, message_limit)
  values (uid, 'free', 'active', 0, 10)
  on conflict (user_id) do nothing;

  -- Lock the row and check limit
  select plan, message_count, message_limit
  into sub
  from public.subscriptions
  where user_id = uid
  for update;

  if sub.message_count >= sub.message_limit then
    return jsonb_build_object('allowed', false, 'plan', sub.plan, 'count', sub.message_count, 'limit', sub.message_limit);
  end if;

  -- Increment
  update public.subscriptions
  set message_count = message_count + 1
  where user_id = uid;

  return jsonb_build_object('allowed', true, 'plan', sub.plan, 'count', sub.message_count + 1, 'limit', sub.message_limit);
end;
$$;
