-- Cap Conversations & Messages tables
-- Separate from main chat conversations - for ordinance-specific discussions

-- Cap Conversations table
create table public.cap_conversations (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references auth.users(id) on delete cascade not null,
  cap text not null, -- e.g., "57", "282"
  section text, -- e.g., "31B", "9" (nullable - conversations can start without a section)
  title text not null default 'New conversation',
  created_at timestamptz default now() not null,
  updated_at timestamptz default now() not null
);

-- Cap Messages table
create table public.cap_messages (
  id uuid default gen_random_uuid() primary key,
  conversation_id uuid references public.cap_conversations(id) on delete cascade not null,
  role text not null check (role in ('user', 'assistant')),
  content text not null default '',
  thinking_steps jsonb,
  iterations integer,
  created_at timestamptz default now() not null
);

-- Indexes
create index idx_cap_conversations_user_id on public.cap_conversations(user_id);
create index idx_cap_conversations_cap on public.cap_conversations(cap);
create index idx_cap_conversations_updated_at on public.cap_conversations(updated_at desc);
create index idx_cap_messages_conversation_id on public.cap_messages(conversation_id);
create index idx_cap_messages_created_at on public.cap_messages(created_at);

-- Enable RLS
alter table public.cap_conversations enable row level security;
alter table public.cap_messages enable row level security;

-- RLS policies for cap_conversations
create policy "Users can view own cap conversations"
  on public.cap_conversations for select
  using (auth.uid() = user_id);

create policy "Users can create own cap conversations"
  on public.cap_conversations for insert
  with check (auth.uid() = user_id);

create policy "Users can update own cap conversations"
  on public.cap_conversations for update
  using (auth.uid() = user_id);

create policy "Users can delete own cap conversations"
  on public.cap_conversations for delete
  using (auth.uid() = user_id);

-- RLS policies for cap_messages (via conversation ownership)
create policy "Users can view messages in own cap conversations"
  on public.cap_messages for select
  using (
    conversation_id in (
      select id from public.cap_conversations where user_id = auth.uid()
    )
  );

create policy "Users can insert messages in own cap conversations"
  on public.cap_messages for insert
  with check (
    conversation_id in (
      select id from public.cap_conversations where user_id = auth.uid()
    )
  );

-- Auto-update updated_at on cap_conversations
create trigger cap_conversations_updated_at
  before update on public.cap_conversations
  for each row execute function public.update_updated_at();
