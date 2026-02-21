-- ============================================================
-- ORDINANCES SCHEMA MIGRATION
-- Purpose: Migrate 58MB of ordinance data from JSON to Supabase
-- Tables: ordinances, ordinance_parts, ordinance_sections, ordinance_annotations
-- ============================================================

-- ── TABLE 1: ordinances ──
create table public.ordinances (
  id serial primary key,
  cap_number text not null unique,  -- "57", "282", "112"
  title_en text not null,
  title_zh text not null,
  short_citation text,              -- "Cap. 57"
  enacted_year integer,
  last_amended text,
  elegislation_url text,
  hklii_url text,
  created_at timestamptz default now() not null,
  updated_at timestamptz default now() not null
);

-- ── TABLE 2: ordinance_parts ──
create table public.ordinance_parts ( 
  id serial primary key,
  ordinance_id integer references public.ordinances(id) on delete cascade not null,
  part_identifier text not null,    -- "Part I", "Part IIA"
  title_en text not null,
  title_zh text not null,
  sort_order integer not null,
  created_at timestamptz default now() not null,
  updated_at timestamptz default now() not null,

  unique (ordinance_id, part_identifier)
);

-- ── TABLE 3: ordinance_sections ──
create table public.ordinance_sections (
  id serial primary key,
  part_id integer references public.ordinance_parts(id) on delete cascade not null,
  ordinance_id integer references public.ordinances(id) on delete cascade not null,
  section_number text not null,     -- "2", "9", "31B" (normalized)
  section_identifier text not null, -- "Section 2" (display)
  title_en text not null,
  title_zh text not null,
  subpath text not null,            -- "s2", "s9" (URL)
  text_en text not null,            -- 10-50KB HTML
  text_zh text not null,
  sort_order integer not null,
  created_at timestamptz default now() not null,
  updated_at timestamptz default now() not null,

  unique (ordinance_id, section_number)
);

-- ── TABLE 4: ordinance_annotations ──
create table public.ordinance_annotations (
  id serial primary key,
  section_id integer references public.ordinance_sections(id) on delete cascade not null,
  ordinance_id integer references public.ordinances(id) on delete cascade not null,
  citation text not null,           -- "[2000] HKCFI 378"
  case_name text not null,
  court text not null,
  year integer not null,
  annotation text not null,
  language text not null check (language in ('EN', 'TC')),
  sort_order integer not null default 0,
  created_at timestamptz default now() not null,
  updated_at timestamptz default now() not null,

  unique (section_id, citation)
);

-- ── INDEXES (Critical for <100ms queries) ──

create index idx_ordinances_cap_number on public.ordinances(cap_number);
create index idx_ordinance_parts_ordinance_id on public.ordinance_parts(ordinance_id, sort_order);
create index idx_ordinance_sections_ordinance_id on public.ordinance_sections(ordinance_id);
create index idx_ordinance_sections_part_id on public.ordinance_sections(part_id, sort_order);

-- Composite index for getOrdinanceSection tool (HOT PATH)
create index idx_ordinance_sections_lookup on public.ordinance_sections(ordinance_id, section_number);

create index idx_ordinance_annotations_section_id on public.ordinance_annotations(section_id, sort_order);
create index idx_ordinance_annotations_ordinance_id on public.ordinance_annotations(ordinance_id);

-- ── RLS (Public read, service role write) ──

alter table public.ordinances enable row level security;
alter table public.ordinance_parts enable row level security;
alter table public.ordinance_sections enable row level security;
alter table public.ordinance_annotations enable row level security;

create policy "Ordinances are publicly readable"
  on public.ordinances for select using (true);

create policy "Ordinance parts are publicly readable"
  on public.ordinance_parts for select using (true);

create policy "Ordinance sections are publicly readable"
  on public.ordinance_sections for select using (true);

create policy "Ordinance annotations are publicly readable"
  on public.ordinance_annotations for select using (true);

-- Admin write (service role only)
create policy "Service role can manage ordinances"
  on public.ordinances for all
  using (auth.jwt() ->> 'role' = 'service_role');

create policy "Service role can manage parts"
  on public.ordinance_parts for all
  using (auth.jwt() ->> 'role' = 'service_role');

create policy "Service role can manage sections"
  on public.ordinance_sections for all
  using (auth.jwt() ->> 'role' = 'service_role');

create policy "Service role can manage annotations"
  on public.ordinance_annotations for all
  using (auth.jwt() ->> 'role' = 'service_role');

-- ── TRIGGERS ──

create trigger ordinances_updated_at
  before update on public.ordinances
  for each row execute function public.update_updated_at();

create trigger ordinance_parts_updated_at
  before update on public.ordinance_parts
  for each row execute function public.update_updated_at();

create trigger ordinance_sections_updated_at
  before update on public.ordinance_sections
  for each row execute function public.update_updated_at();

create trigger ordinance_annotations_updated_at
  before update on public.ordinance_annotations
  for each row execute function public.update_updated_at();

-- ── HELPER FUNCTION (Optimized for getOrdinanceSection tool) ──

create or replace function public.get_ordinance_section_text(
  p_cap_number text,
  p_section_number text
)
returns table (
  section_identifier text,
  title_en text,
  title_zh text,
  text_en text,
  text_zh text
)
language plpgsql
security definer
as $$
begin
  return query
  select
    s.section_identifier,
    s.title_en,
    s.title_zh,
    s.text_en,
    s.text_zh
  from public.ordinance_sections s
  join public.ordinances o on o.id = s.ordinance_id
  where o.cap_number = p_cap_number
    and s.section_number = p_section_number
  limit 1;
end;
$$;
