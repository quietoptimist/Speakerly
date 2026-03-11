-- Persona & Memory System Schema
-- Run this in your Supabase SQL Editor

-- 1. User Personas: stores profile (user-editable) and learned (AI-distilled) markdown
create table if not exists user_personas (
  user_id uuid primary key references auth.users(id) on delete cascade,
  profile_md text not null default '',
  learned_md text not null default '',
  updated_at timestamp with time zone default now()
);

alter table user_personas enable row level security;

create policy "Users can view their own persona"
  on user_personas for select
  using (auth.uid() = user_id);

create policy "Users can insert their own persona"
  on user_personas for insert
  with check (auth.uid() = user_id);

create policy "Users can update their own persona"
  on user_personas for update
  using (auth.uid() = user_id);

-- 2. Conversation Log: archives full conversation sessions for later distillation
create table if not exists conversation_log (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  messages jsonb not null default '[]',
  context_path text[] not null default '{}',
  created_at timestamp with time zone default now()
);

alter table conversation_log enable row level security;

create policy "Users can view their own conversation logs"
  on conversation_log for select
  using (auth.uid() = user_id);

create policy "Users can insert their own conversation logs"
  on conversation_log for insert
  with check (auth.uid() = user_id);

-- 3. Usage Events: tracks every phrase with context and role attribution
create table if not exists usage_events (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  role text not null default 'user',
  context_path text[] not null default '{}',
  selected_topics text[] not null default '{}',
  phrase_spoken text not null,
  phrase_type text not null default 'statement',
  created_at timestamp with time zone default now()
);

alter table usage_events enable row level security;

create policy "Users can view their own usage events"
  on usage_events for select
  using (auth.uid() = user_id);

create policy "Users can insert their own usage events"
  on usage_events for insert
  with check (auth.uid() = user_id);
