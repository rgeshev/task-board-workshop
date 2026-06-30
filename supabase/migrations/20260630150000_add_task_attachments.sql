-- Task attachments metadata + private storage bucket

create table public.task_attachments (
  id uuid primary key default gen_random_uuid(),
  task_id uuid not null references public.tasks (id) on delete cascade,
  file_name text not null,
  storage_path text not null,
  mime_type text not null,
  size_bytes bigint not null,
  created_at timestamptz not null default now(),
  constraint task_attachments_size_positive check (size_bytes > 0)
);

create index task_attachments_task_id_idx on public.task_attachments (task_id);

alter table public.task_attachments enable row level security;

create policy "Owners can view task attachments"
  on public.task_attachments for select
  using (
    exists (
      select 1 from public.tasks t
      join public.projects p on p.id = t.project_id
      where t.id = task_attachments.task_id
        and p.owner_id = auth.uid()
    )
  );

create policy "Owners can insert task attachments"
  on public.task_attachments for insert
  with check (
    exists (
      select 1 from public.tasks t
      join public.projects p on p.id = t.project_id
      where t.id = task_attachments.task_id
        and p.owner_id = auth.uid()
    )
  );

create policy "Owners can delete task attachments"
  on public.task_attachments for delete
  using (
    exists (
      select 1 from public.tasks t
      join public.projects p on p.id = t.project_id
      where t.id = task_attachments.task_id
        and p.owner_id = auth.uid()
    )
  );

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'task-attachments',
  'task-attachments',
  false,
  52428800,
  array['image/jpeg', 'image/png', 'image/gif', 'image/webp', 'application/pdf']
);

create policy "Owners can upload task attachment files"
  on storage.objects for insert
  to authenticated
  with check (
    bucket_id = 'task-attachments'
    and auth.uid()::text = (storage.foldername(name))[1]
    and exists (
      select 1 from public.tasks t
      join public.projects p on p.id = t.project_id
      where t.id::text = (storage.foldername(name))[2]
        and p.owner_id = auth.uid()
    )
  );

create policy "Owners can view task attachment files"
  on storage.objects for select
  to authenticated
  using (
    bucket_id = 'task-attachments'
    and auth.uid()::text = (storage.foldername(name))[1]
    and exists (
      select 1 from public.tasks t
      join public.projects p on p.id = t.project_id
      where t.id::text = (storage.foldername(name))[2]
        and p.owner_id = auth.uid()
    )
  );

create policy "Owners can delete task attachment files"
  on storage.objects for delete
  to authenticated
  using (
    bucket_id = 'task-attachments'
    and auth.uid()::text = (storage.foldername(name))[1]
    and exists (
      select 1 from public.tasks t
      join public.projects p on p.id = t.project_id
      where t.id::text = (storage.foldername(name))[2]
        and p.owner_id = auth.uid()
    )
  );
