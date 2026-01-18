# Supabase RPC Reference

This note summarizes the Postgres RPC functions used by this repo and what each one does. These are created in your Supabase project and called by the GitHub Action under `.github/scripts`.

## Overview
- RPCs are Postgres functions exposed through Supabase.
- The job updater uses them to fetch rows and update Markdown tables.
- All functions below assume a `public.contracts` table with the columns defined below.

---

## Database Schema

### contracts table

```sql
create table public.contracts (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz default now(),

  -- Company info
  company_name text not null,
  company_url text,
  client_industry text, -- e.g., 'Finance', 'Healthcare', 'Tech', 'Government'

  -- Contract info
  job_title text not null,
  job_url text not null unique,
  job_locations text default 'Remote - USA',

  -- Rate info (hourly)
  hourly_rate_min numeric,
  hourly_rate_max numeric,

  -- Contract details
  contract_duration text, -- e.g., '3 months', '6 months', '12 months', 'Ongoing'
  start_date date, -- when the contract begins

  -- Requirements
  tech_stack text[], -- e.g., ['React', 'Node.js', 'AWS']
  experience_years_min int default 5, -- senior level (5+)
  clearance_required boolean default false,
  corp_to_corp boolean default false, -- C2C availability

  -- Metadata
  is_remote boolean default true,
  status text default 'active' check (status in ('active', 'inactive', 'filled')),
  priority text default 'normal' check (priority in ('urgent', 'high', 'normal'))
);

-- Index for common queries
create index idx_contracts_status on public.contracts(status);
create index idx_contracts_start_date on public.contracts(start_date);
create index idx_contracts_tech_stack on public.contracts using gin(tech_stack);
```

---

## RPC Functions

### get_contracts
Returns active contracts with calculated days until start and age.

```sql
create or replace function public.get_contracts(
  p_priority text default null,
  p_min_rate numeric default null,
  p_max_rate numeric default null
)
returns table (
  id uuid,
  company_name text,
  company_url text,
  client_industry text,
  job_title text,
  job_url text,
  job_locations text,
  hourly_rate_min numeric,
  hourly_rate_max numeric,
  contract_duration text,
  start_date date,
  tech_stack text[],
  experience_years_min int,
  clearance_required boolean,
  corp_to_corp boolean,
  is_remote boolean,
  priority text,
  age int,
  days_until_start int
) language sql stable as $$
  select
    c.id,
    c.company_name,
    c.company_url,
    c.client_industry,
    c.job_title,
    c.job_url,
    c.job_locations,
    c.hourly_rate_min,
    c.hourly_rate_max,
    c.contract_duration,
    c.start_date,
    c.tech_stack,
    c.experience_years_min,
    c.clearance_required,
    c.corp_to_corp,
    c.is_remote,
    c.priority,
    extract(day from now() - c.created_at)::int as age,
    case
      when c.start_date is null then null
      else extract(day from c.start_date - now()::date)::int
    end as days_until_start
  from public.contracts c
  where c.status = 'active'
    and (p_priority is null or c.priority = p_priority)
    and (p_min_rate is null or c.hourly_rate_min >= p_min_rate)
    and (p_max_rate is null or c.hourly_rate_max <= p_max_rate)
  order by
    case c.priority
      when 'urgent' then 1
      when 'high' then 2
      else 3
    end,
    c.start_date asc nulls last,
    c.created_at desc;
$$;
```

### get_contract_analytics
Returns analytics data for the dashboard.

```sql
create or replace function public.get_contract_analytics()
returns table (
  total_active int,
  avg_hourly_rate numeric,
  min_hourly_rate numeric,
  max_hourly_rate numeric,
  urgent_count int,
  starting_soon_count int,
  by_duration jsonb,
  top_skills jsonb,
  by_industry jsonb
) language sql stable as $$
  with
  base_stats as (
    select
      count(*)::int as total_active,
      round(avg((hourly_rate_min + hourly_rate_max) / 2), 0) as avg_hourly_rate,
      min(hourly_rate_min) as min_hourly_rate,
      max(hourly_rate_max) as max_hourly_rate,
      count(*) filter (where priority = 'urgent')::int as urgent_count,
      count(*) filter (where start_date <= current_date + interval '30 days' and start_date >= current_date)::int as starting_soon_count
    from public.contracts
    where status = 'active'
  ),
  duration_stats as (
    select jsonb_object_agg(
      coalesce(contract_duration, 'Not specified'),
      cnt
    ) as by_duration
    from (
      select contract_duration, count(*)::int as cnt
      from public.contracts
      where status = 'active'
      group by contract_duration
      order by cnt desc
    ) d
  ),
  skill_stats as (
    select jsonb_object_agg(skill, cnt) as top_skills
    from (
      select unnest(tech_stack) as skill, count(*)::int as cnt
      from public.contracts
      where status = 'active' and tech_stack is not null
      group by skill
      order by cnt desc
      limit 10
    ) s
  ),
  industry_stats as (
    select jsonb_object_agg(
      coalesce(client_industry, 'Not specified'),
      cnt
    ) as by_industry
    from (
      select client_industry, count(*)::int as cnt
      from public.contracts
      where status = 'active'
      group by client_industry
      order by cnt desc
    ) i
  )
  select
    b.total_active,
    b.avg_hourly_rate,
    b.min_hourly_rate,
    b.max_hourly_rate,
    b.urgent_count,
    b.starting_soon_count,
    d.by_duration,
    s.top_skills,
    i.by_industry
  from base_stats b, duration_stats d, skill_stats s, industry_stats i;
$$;
```

### add_contract
Inserts a new contract based on GitHub issue form input.

```sql
create or replace function public.add_contract(
  _job_title text,
  _job_url text,
  _company_name text,
  _company_url text,
  _client_industry text,
  _location text,
  _hourly_rate_min numeric,
  _hourly_rate_max numeric,
  _contract_duration text,
  _start_date date,
  _tech_stack text[],
  _experience_years_min int,
  _clearance_required boolean,
  _corp_to_corp boolean,
  _priority text
)
returns void language plpgsql as $$
begin
  insert into public.contracts (
    job_title,
    job_url,
    company_name,
    company_url,
    client_industry,
    job_locations,
    hourly_rate_min,
    hourly_rate_max,
    contract_duration,
    start_date,
    tech_stack,
    experience_years_min,
    clearance_required,
    corp_to_corp,
    is_remote,
    priority,
    status
  )
  values (
    _job_title,
    _job_url,
    _company_name,
    _company_url,
    _client_industry,
    coalesce(_location, 'Remote - USA'),
    _hourly_rate_min,
    _hourly_rate_max,
    _contract_duration,
    _start_date,
    _tech_stack,
    coalesce(_experience_years_min, 5),
    coalesce(_clearance_required, false),
    coalesce(_corp_to_corp, false),
    case when _location ilike '%remote%' or _location is null then true else false end,
    coalesce(_priority, 'normal'),
    'active'
  )
  on conflict (job_url) do nothing;
end;
$$;
```

### update_contract
Updates fields for an existing contract.

```sql
create or replace function public.update_contract(
  _job_url text,
  _new_job_title text default null,
  _new_company_name text default null,
  _new_company_url text default null,
  _new_client_industry text default null,
  _new_location text default null,
  _new_hourly_rate_min numeric default null,
  _new_hourly_rate_max numeric default null,
  _new_contract_duration text default null,
  _new_start_date date default null,
  _new_tech_stack text[] default null,
  _new_experience_years_min int default null,
  _new_clearance_required boolean default null,
  _new_corp_to_corp boolean default null,
  _new_priority text default null,
  _new_status text default null
)
returns void language plpgsql as $$
begin
  update public.contracts
  set
    job_title = coalesce(_new_job_title, job_title),
    company_name = coalesce(_new_company_name, company_name),
    company_url = coalesce(_new_company_url, company_url),
    client_industry = coalesce(_new_client_industry, client_industry),
    job_locations = coalesce(_new_location, job_locations),
    hourly_rate_min = coalesce(_new_hourly_rate_min, hourly_rate_min),
    hourly_rate_max = coalesce(_new_hourly_rate_max, hourly_rate_max),
    contract_duration = coalesce(_new_contract_duration, contract_duration),
    start_date = coalesce(_new_start_date, start_date),
    tech_stack = coalesce(_new_tech_stack, tech_stack),
    experience_years_min = coalesce(_new_experience_years_min, experience_years_min),
    clearance_required = coalesce(_new_clearance_required, clearance_required),
    corp_to_corp = coalesce(_new_corp_to_corp, corp_to_corp),
    priority = coalesce(_new_priority, priority),
    status = coalesce(_new_status, status),
    is_remote = case
      when _new_location is null then is_remote
      else (_new_location ilike '%remote%')
    end
  where job_url = _job_url;
end;
$$;
```

---

## Migration from Old Schema

If migrating from the old `jobs` table, run this after creating the new table:

```sql
-- Optional: Migrate any relevant existing data
-- This is only needed if you have mid-level remote data to preserve
insert into public.contracts (
  company_name,
  company_url,
  job_title,
  job_url,
  job_locations,
  hourly_rate_min,
  hourly_rate_max,
  experience_years_min,
  is_remote,
  status
)
select
  company_name,
  company_url,
  job_title,
  job_url,
  job_locations,
  salary / 2080 as hourly_rate_min, -- rough conversion from annual
  salary / 2080 as hourly_rate_max,
  min_experience_years,
  is_remote,
  status
from public.jobs
where job_type = 'mid_level' and is_remote = true and is_usa = true;

-- Then drop the old table when ready
-- drop table public.jobs;
```

---

## Where these are used in the repo
- `.github/scripts/src/queries.ts` calls `get_contracts` and `get_contract_analytics` via Supabase RPC.
- `.github/scripts/src/mutations.ts` calls `add_contract` and `update_contract` via Supabase RPC.
- `.github/scripts/src/get-jobs.ts` uses those results to rebuild Markdown tables and analytics.

## Run Locally
From the repo root:

```bash
cd .github/scripts
npm install
SUPABASE_URL=your_url SUPABASE_KEY=your_service_role_key APPLY_IMG_URL=https://i.imgur.com/JpkfjIq.png npm run get-jobs
```

This regenerates the Markdown tables in the root files using your Supabase data.

## Seed Data Example
Use this to insert sample contracts for testing.

```sql
insert into public.contracts (
  company_name,
  company_url,
  client_industry,
  job_title,
  job_url,
  job_locations,
  hourly_rate_min,
  hourly_rate_max,
  contract_duration,
  start_date,
  tech_stack,
  experience_years_min,
  clearance_required,
  corp_to_corp,
  priority,
  status
) values
(
  'TechConsult Inc',
  'https://techconsult.example.com',
  'Finance',
  'Senior React Developer',
  'https://techconsult.example.com/contracts/123',
  'Remote - USA',
  85,
  105,
  '6 months',
  current_date + interval '14 days',
  array['React', 'TypeScript', 'Node.js', 'PostgreSQL'],
  5,
  false,
  true,
  'high',
  'active'
),
(
  'DataDriven LLC',
  'https://datadriven.example.com',
  'Healthcare',
  'Staff Backend Engineer',
  'https://datadriven.example.com/contracts/456',
  'Remote - USA',
  95,
  120,
  '12 months',
  current_date + interval '30 days',
  array['Python', 'AWS', 'Kubernetes', 'Terraform'],
  7,
  false,
  true,
  'normal',
  'active'
),
(
  'GovTech Partners',
  'https://govtech.example.com',
  'Government',
  'Senior Full Stack Developer',
  'https://govtech.example.com/contracts/789',
  'Remote - USA',
  90,
  110,
  '12 months',
  current_date + interval '7 days',
  array['Java', 'Spring Boot', 'React', 'AWS'],
  6,
  true,
  false,
  'urgent',
  'active'
);
```
