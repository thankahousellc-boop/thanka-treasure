begin;

-- Frames catalog (global pool)
create table if not exists public.frames (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  slug text not null,
  description text,
  price_delta integer not null default 0,
  image_bucket text,
  image_path text,
  position integer not null default 0,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create unique index if not exists frames_slug_unique on public.frames (slug);
create index if not exists frames_active_idx on public.frames (is_active);

-- Per-product opt-in
create table if not exists public.product_frames (
  id uuid primary key default gen_random_uuid(),
  product_id uuid not null references public.products(id) on delete cascade,
  frame_id uuid not null references public.frames(id) on delete cascade,
  is_default boolean not null default false,
  position integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create unique index if not exists product_frames_unique on public.product_frames (product_id, frame_id);
create index if not exists product_frames_product_id_idx on public.product_frames (product_id);

-- Order items capture the chosen frame at purchase time
alter table public.order_items
  add column if not exists frame_snapshot jsonb;

-- RLS
alter table public.frames enable row level security;
alter table public.product_frames enable row level security;

drop policy if exists frames_public_select on public.frames;
create policy frames_public_select on public.frames
for select to anon, authenticated
using (is_active);

drop policy if exists frames_admin_all on public.frames;
create policy frames_admin_all on public.frames
for all to authenticated
using (public.is_admin())
with check (public.is_admin());

drop policy if exists product_frames_public_select on public.product_frames;
create policy product_frames_public_select on public.product_frames
for select to anon, authenticated
using (true);

drop policy if exists product_frames_admin_all on public.product_frames;
create policy product_frames_admin_all on public.product_frames
for all to authenticated
using (public.is_admin())
with check (public.is_admin());

-- Storage bucket for site assets (logos, frame swatches, etc.)
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values
  ('site-assets', 'site-assets', true, 5242880, array['image/jpeg', 'image/png', 'image/webp', 'image/svg+xml'])
on conflict (id) do update
set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists site_assets_public_select on storage.objects;
create policy site_assets_public_select on storage.objects
for select to anon, authenticated
using (bucket_id = 'site-assets');

drop policy if exists site_assets_admin_insert on storage.objects;
create policy site_assets_admin_insert on storage.objects
for insert to authenticated
with check (bucket_id = 'site-assets' and public.is_admin());

drop policy if exists site_assets_admin_update on storage.objects;
create policy site_assets_admin_update on storage.objects
for update to authenticated
using (bucket_id = 'site-assets' and public.is_admin())
with check (bucket_id = 'site-assets' and public.is_admin());

drop policy if exists site_assets_admin_delete on storage.objects;
create policy site_assets_admin_delete on storage.objects
for delete to authenticated
using (bucket_id = 'site-assets' and public.is_admin());

commit;
