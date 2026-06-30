-- Task Board — initial simplified schema
-- Users are managed by Supabase Auth (auth.users).
-- Application tables reference auth.users for ownership.

-- ---------------------------------------------------------------------------
-- Projects
-- ---------------------------------------------------------------------------
create table public.projects (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  description text,
  owner_id uuid not null references auth.users (id) on delete cascade,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index projects_owner_id_idx on public.projects (owner_id);

-- ---------------------------------------------------------------------------
-- Project stages (kanban columns per project)
-- ---------------------------------------------------------------------------
create table public.project_stages (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects (id) on delete cascade,
  name text not null,
  position integer not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint project_stages_position_non_negative check (position >= 0),
  constraint project_stages_name_not_blank check (char_length(trim(name)) > 0)
);

create index project_stages_project_id_idx on public.project_stages (project_id);
create unique index project_stages_project_position_idx
  on public.project_stages (project_id, position);

-- ---------------------------------------------------------------------------
-- Tasks
-- ---------------------------------------------------------------------------
create table public.tasks (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects (id) on delete cascade,
  stage_id uuid not null references public.project_stages (id) on delete cascade,
  title text not null,
  description text,
  position integer not null default 0,
  done boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint tasks_position_non_negative check (position >= 0),
  constraint tasks_title_not_blank check (char_length(trim(title)) > 0)
);

create index tasks_project_id_idx on public.tasks (project_id);
create index tasks_stage_id_idx on public.tasks (stage_id);
create index tasks_stage_position_idx on public.tasks (stage_id, position);

-- ---------------------------------------------------------------------------
-- updated_at trigger
-- ---------------------------------------------------------------------------
create or replace function public.set_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at = pg_catalog.now();
  return new;
end;
$$;

create trigger projects_set_updated_at
  before update on public.projects
  for each row execute function public.set_updated_at();

create trigger project_stages_set_updated_at
  before update on public.project_stages
  for each row execute function public.set_updated_at();

create trigger tasks_set_updated_at
  before update on public.tasks
  for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------------
-- Row Level Security (owner-only access for now)
-- ---------------------------------------------------------------------------
alter table public.projects enable row level security;
alter table public.project_stages enable row level security;
alter table public.tasks enable row level security;

create policy "Owners can view their projects"
  on public.projects for select
  using (owner_id = auth.uid());

create policy "Owners can create projects"
  on public.projects for insert
  with check (owner_id = auth.uid());

create policy "Owners can update their projects"
  on public.projects for update
  using (owner_id = auth.uid())
  with check (owner_id = auth.uid());

create policy "Owners can delete their projects"
  on public.projects for delete
  using (owner_id = auth.uid());

create policy "Owners can view project stages"
  on public.project_stages for select
  using (
    exists (
      select 1 from public.projects p
      where p.id = project_stages.project_id
        and p.owner_id = auth.uid()
    )
  );

create policy "Owners can manage project stages"
  on public.project_stages for all
  using (
    exists (
      select 1 from public.projects p
      where p.id = project_stages.project_id
        and p.owner_id = auth.uid()
    )
  )
  with check (
    exists (
      select 1 from public.projects p
      where p.id = project_stages.project_id
        and p.owner_id = auth.uid()
    )
  );

create policy "Owners can view tasks"
  on public.tasks for select
  using (
    exists (
      select 1 from public.projects p
      where p.id = tasks.project_id
        and p.owner_id = auth.uid()
    )
  );

create policy "Owners can manage tasks"
  on public.tasks for all
  using (
    exists (
      select 1 from public.projects p
      where p.id = tasks.project_id
        and p.owner_id = auth.uid()
    )
  )
  with check (
    exists (
      select 1 from public.projects p
      where p.id = tasks.project_id
        and p.owner_id = auth.uid()
    )
  );
