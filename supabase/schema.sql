-- Newsroom Lab Phase 0 schema
-- Run this in the Supabase SQL editor before deploying.

create extension if not exists pgcrypto;

create table if not exists journalists (
  id text primary key,
  name text not null,
  website text not null,
  sections text[] not null default '{}',
  role text not null,
  tone text not null,
  personality text not null,
  rules text[] not null default '{}',
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);

create table if not exists articles (
  id uuid primary key default gen_random_uuid(),
  journalist_id text references journalists(id) on delete restrict,
  website text not null,
  section text not null,
  topic text not null,
  title text,
  slug text,
  summary text,
  body text,
  status text not null default 'idea' check (status in ('idea','researching','drafted','image_pending','image_review','fact_checking','bias_review','awaiting_admin_review','revision_requested','approved_sandbox','rejected')),
  risk_level text not null default 'medium' check (risk_level in ('low','medium','high')),
  fact_check_status text not null default 'needs_review' check (fact_check_status in ('passed','needs_review','failed')),
  bias_check_status text not null default 'needs_review' check (bias_check_status in ('passed','needs_review','failed')),
  image_status text not null default 'pending' check (image_status in ('pending','approved','needs_regeneration')),
  telegram_message_id text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists article_artifacts (
  id uuid primary key default gen_random_uuid(),
  article_id uuid references articles(id) on delete cascade,
  artifact_type text not null,
  title text not null,
  content jsonb not null,
  created_at timestamptz not null default now()
);

create table if not exists sources (
  id uuid primary key default gen_random_uuid(),
  article_id uuid references articles(id) on delete cascade,
  title text not null,
  url text not null,
  publisher text,
  reliability_score numeric,
  notes text,
  created_at timestamptz not null default now()
);

create table if not exists image_jobs (
  id uuid primary key default gen_random_uuid(),
  article_id uuid references articles(id) on delete cascade,
  prompt text not null,
  style_type text not null,
  generation_status text not null default 'pending',
  review_status text not null default 'pending',
  quality_score numeric,
  image_url text,
  provider text,
  storage_path text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists image_reviews (
  id uuid primary key default gen_random_uuid(),
  image_job_id uuid references image_jobs(id) on delete cascade,
  relevance_score numeric,
  realism_score numeric,
  anatomy_score numeric,
  composition_score numeric,
  artifact_flags jsonb not null default '[]'::jsonb,
  notes text,
  approved boolean not null default false,
  created_at timestamptz not null default now()
);

create table if not exists journalist_memory (
  id uuid primary key default gen_random_uuid(),
  journalist_id text references journalists(id) on delete cascade,
  memory_type text not null check (memory_type in ('style_lesson','source_lesson','editorial_preference','image_preference','headline_preference','rejected_pattern','approved_pattern','topic_context')),
  memory_content text not null,
  source_article_id uuid references articles(id) on delete set null,
  confidence_score numeric not null default 0.5,
  status text not null default 'candidate' check (status in ('candidate','approved','rejected')),
  created_at timestamptz not null default now(),
  last_used_at timestamptz
);

create table if not exists telegram_approvals (
  id uuid primary key default gen_random_uuid(),
  article_id uuid references articles(id) on delete cascade,
  approval_status text not null,
  telegram_message_id text,
  admin_feedback text,
  created_at timestamptz not null default now(),
  approved_at timestamptz,
  rejected_at timestamptz
);

create table if not exists admin_feedback (
  id uuid primary key default gen_random_uuid(),
  article_id uuid references articles(id) on delete cascade,
  feedback_type text not null,
  feedback text,
  created_at timestamptz not null default now()
);

create table if not exists agent_logs (
  id uuid primary key default gen_random_uuid(),
  article_id uuid references articles(id) on delete cascade,
  agent_name text not null,
  action text not null,
  output jsonb,
  created_at timestamptz not null default now()
);

create table if not exists approved_sources (
  id uuid primary key default gen_random_uuid(),
  journalist_id text references journalists(id) on delete cascade,
  source_name text not null,
  source_url text not null,
  category text,
  reliability_score numeric not null default 0.7,
  created_at timestamptz not null default now()
);

-- Seed Anika Patel
insert into journalists (id, name, website, sections, role, tone, personality, rules)
values (
  'anika-patel',
  'Anika Patel',
  'www.whatsoninmzansi.co.za',
  array['Food & Weekend Markets','Family & Kids Days Out'],
  'Lifestyle & Community Editor',
  'Friendly, inclusive, highly enthusiastic, sensory-driven, helpful, and warm.',
  'The Social Foodie. Anika focuses on community, food, family, neighborhood markets, pop-up food stalls, outdoor spaces, and stress-free weekend plans across South Africa.',
  array[
    'Do not invent events, dates, prices, venues, quotes, or statistics.',
    'Label unverified facts clearly.',
    'Avoid clickbait and exaggerated claims.',
    'Every article is sandbox-only in Phase 0.',
    'Personality shapes tone but never overrides sourcing.'
  ]
)
on conflict (id) do update set
  name = excluded.name,
  website = excluded.website,
  sections = excluded.sections,
  role = excluded.role,
  tone = excluded.tone,
  personality = excluded.personality,
  rules = excluded.rules,
  is_active = true;

-- Storage bucket. Supabase may require this to be created from the Storage UI if insert is blocked.
insert into storage.buckets (id, name, public)
values ('newsroom-images', 'newsroom-images', true)
on conflict (id) do nothing;

-- RLS
alter table journalists enable row level security;
alter table articles enable row level security;
alter table article_artifacts enable row level security;
alter table sources enable row level security;
alter table image_jobs enable row level security;
alter table image_reviews enable row level security;
alter table journalist_memory enable row level security;
alter table telegram_approvals enable row level security;
alter table admin_feedback enable row level security;
alter table agent_logs enable row level security;
alter table approved_sources enable row level security;

-- Authenticated dashboard users can read/write dashboard data.
-- Server functions use service role for controlled operations.
do $$
declare
  tbl text;
begin
  foreach tbl in array array['journalists','articles','article_artifacts','sources','image_jobs','image_reviews','journalist_memory','telegram_approvals','admin_feedback','agent_logs','approved_sources'] loop
    execute format('drop policy if exists "authenticated_read_%s" on %I', tbl, tbl);
    execute format('create policy "authenticated_read_%s" on %I for select to authenticated using (true)', tbl, tbl);
  end loop;
end $$;

-- Public bucket read policy for generated images.
drop policy if exists "public_read_newsroom_images" on storage.objects;
create policy "public_read_newsroom_images"
on storage.objects for select
using (bucket_id = 'newsroom-images');

-- Service role handles writes to storage. If you want authenticated image reads only, make the bucket private and remove public read.

create or replace function set_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end; $$;

drop trigger if exists set_articles_updated_at on articles;
create trigger set_articles_updated_at before update on articles for each row execute function set_updated_at();

drop trigger if exists set_image_jobs_updated_at on image_jobs;
create trigger set_image_jobs_updated_at before update on image_jobs for each row execute function set_updated_at();

-- Phase 2A: Automated Newsroom Scheduler tables
create table if not exists journalist_schedules (
  id uuid primary key default gen_random_uuid(),
  journalist_id text references journalists(id) on delete cascade,
  enabled boolean not null default false,
  frequency text not null default 'weekly' check (frequency in ('daily','weekly','manual')),
  days_of_week int[] not null default '{}',
  preferred_hour_utc int not null default 7 check (preferred_hour_utc >= 0 and preferred_hour_utc <= 23),
  timezone text not null default 'Africa/Johannesburg',
  weekly_quota int not null default 3,
  max_pending_reviews int not null default 2,
  auto_advance boolean not null default true,
  stop_status text not null default 'awaiting_admin_review',
  next_run_at timestamptz,
  last_run_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(journalist_id)
);

create table if not exists agent_jobs (
  id uuid primary key default gen_random_uuid(),
  job_type text not null check (job_type in ('create_article','run_pipeline_step','send_review_notification')),
  journalist_id text references journalists(id) on delete cascade,
  article_id uuid references articles(id) on delete cascade,
  status text not null default 'pending' check (status in ('pending','running','completed','failed','skipped')),
  priority int not null default 5,
  attempts int not null default 0,
  max_attempts int not null default 3,
  scheduled_for timestamptz not null default now(),
  locked_at timestamptz,
  completed_at timestamptz,
  error text,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists agent_runs (
  id uuid primary key default gen_random_uuid(),
  run_type text not null default 'scheduler',
  started_at timestamptz not null default now(),
  finished_at timestamptz,
  status text not null default 'running' check (status in ('running','completed','failed')),
  jobs_created int not null default 0,
  jobs_processed int not null default 0,
  notes text,
  error text,
  metadata jsonb not null default '{}'::jsonb
);

alter table journalist_schedules enable row level security;
alter table agent_jobs enable row level security;
alter table agent_runs enable row level security;

do $$
declare
  tbl text;
begin
  foreach tbl in array array['journalist_schedules','agent_jobs','agent_runs'] loop
    execute format('drop policy if exists "authenticated_read_%s" on %I', tbl, tbl);
    execute format('create policy "authenticated_read_%s" on %I for select to authenticated using (true)', tbl, tbl);
  end loop;
end $$;

drop trigger if exists set_journalist_schedules_updated_at on journalist_schedules;
create trigger set_journalist_schedules_updated_at before update on journalist_schedules for each row execute function set_updated_at();

drop trigger if exists set_agent_jobs_updated_at on agent_jobs;
create trigger set_agent_jobs_updated_at before update on agent_jobs for each row execute function set_updated_at();

insert into journalist_schedules (journalist_id, enabled, frequency, days_of_week, preferred_hour_utc, timezone, weekly_quota, max_pending_reviews, auto_advance, stop_status)
values (
  'anika-patel',
  true,
  'weekly',
  array[1, 3, 5],
  7,
  'Africa/Johannesburg',
  3,
  2,
  true,
  'awaiting_admin_review'
)
on conflict (journalist_id) do nothing;
