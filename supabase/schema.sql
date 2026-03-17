-- =====================================================
-- REFLECTIVE COGNITION ENGINE — Supabase Schema
-- Run this in your Supabase SQL Editor
-- =====================================================

-- Enable UUID extension
create extension if not exists "uuid-ossp";

-- =====================================================
-- BELIEFS TABLE
-- =====================================================
create table if not exists public.beliefs (
  id uuid default uuid_generate_v4() primary key,
  user_id uuid references auth.users(id) on delete cascade not null,
  content text not null,
  category text default 'general' check (category in (
    'philosophy', 'identity', 'habit', 'relationships',
    'career', 'worldview', 'ethics', 'emotion', 'general'
  )),
  confidence_score float default 0.7 check (confidence_score >= 0 and confidence_score <= 1),
  raw_input text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- =====================================================
-- BELIEF RELATIONS TABLE
-- =====================================================
create table if not exists public.belief_relations (
  id uuid default uuid_generate_v4() primary key,
  belief_id_1 uuid references public.beliefs(id) on delete cascade not null,
  belief_id_2 uuid references public.beliefs(id) on delete cascade not null,
  relation_type text check (relation_type in ('supports', 'contradicts', 'evolves_from')) not null,
  strength_score float default 0.5 check (strength_score >= 0 and strength_score <= 1),
  explanation text,
  created_at timestamptz default now(),
  constraint no_self_relation check (belief_id_1 != belief_id_2)
);

-- =====================================================
-- INSIGHTS TABLE
-- =====================================================
create table if not exists public.insights (
  id uuid default uuid_generate_v4() primary key,
  user_id uuid references auth.users(id) on delete cascade not null,
  type text check (type in ('contradiction', 'bias', 'pattern')) not null,
  description text not null,
  severity text default 'medium' check (severity in ('low', 'medium', 'high')),
  related_belief_ids uuid[] default '{}',
  is_read boolean default false,
  created_at timestamptz default now()
);

-- =====================================================
-- CONVERSATIONS TABLE
-- =====================================================
create table if not exists public.conversations (
  id uuid default uuid_generate_v4() primary key,
  user_id uuid references auth.users(id) on delete cascade not null,
  title text default 'Untitled Session',
  messages jsonb default '[]'::jsonb,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- =====================================================
-- ROW LEVEL SECURITY (RLS) POLICIES
-- =====================================================

-- Enable RLS on all tables
alter table public.beliefs enable row level security;
alter table public.belief_relations enable row level security;
alter table public.insights enable row level security;
alter table public.conversations enable row level security;

-- BELIEFS policies
create policy "Users can view own beliefs" on public.beliefs
  for select using (auth.uid() = user_id);

create policy "Users can insert own beliefs" on public.beliefs
  for insert with check (auth.uid() = user_id);

create policy "Users can update own beliefs" on public.beliefs
  for update using (auth.uid() = user_id);

create policy "Users can delete own beliefs" on public.beliefs
  for delete using (auth.uid() = user_id);

-- BELIEF_RELATIONS policies
create policy "Users can view own belief relations" on public.belief_relations
  for select using (
    exists (
      select 1 from public.beliefs b
      where b.id = belief_relations.belief_id_1
      and b.user_id = auth.uid()
    )
  );

create policy "Users can insert own belief relations" on public.belief_relations
  for insert with check (
    exists (
      select 1 from public.beliefs b
      where b.id = belief_relations.belief_id_1
      and b.user_id = auth.uid()
    )
  );

create policy "Users can delete own belief relations" on public.belief_relations
  for delete using (
    exists (
      select 1 from public.beliefs b
      where b.id = belief_relations.belief_id_1
      and b.user_id = auth.uid()
    )
  );

-- INSIGHTS policies
create policy "Users can view own insights" on public.insights
  for select using (auth.uid() = user_id);

create policy "Users can insert own insights" on public.insights
  for insert with check (auth.uid() = user_id);

create policy "Users can update own insights" on public.insights
  for update using (auth.uid() = user_id);

create policy "Users can delete own insights" on public.insights
  for delete using (auth.uid() = user_id);

-- CONVERSATIONS policies
create policy "Users can view own conversations" on public.conversations
  for select using (auth.uid() = user_id);

create policy "Users can insert own conversations" on public.conversations
  for insert with check (auth.uid() = user_id);

create policy "Users can update own conversations" on public.conversations
  for update using (auth.uid() = user_id);

create policy "Users can delete own conversations" on public.conversations
  for delete using (auth.uid() = user_id);

-- =====================================================
-- INDEXES FOR PERFORMANCE
-- =====================================================
create index if not exists beliefs_user_id_idx on public.beliefs(user_id);
create index if not exists beliefs_created_at_idx on public.beliefs(created_at desc);
create index if not exists beliefs_category_idx on public.beliefs(category);
create index if not exists belief_relations_belief_1_idx on public.belief_relations(belief_id_1);
create index if not exists belief_relations_belief_2_idx on public.belief_relations(belief_id_2);
create index if not exists insights_user_id_idx on public.insights(user_id);
create index if not exists insights_type_idx on public.insights(type);
create index if not exists conversations_user_id_idx on public.conversations(user_id);

-- =====================================================
-- UPDATED_AT TRIGGER
-- =====================================================
create or replace function public.update_updated_at_column()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

create trigger update_beliefs_updated_at
  before update on public.beliefs
  for each row execute function public.update_updated_at_column();

create trigger update_conversations_updated_at
  before update on public.conversations
  for each row execute function public.update_updated_at_column();
