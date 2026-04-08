begin;

create extension if not exists pgcrypto;
create extension if not exists citext;

create sequence if not exists public.order_number_seq start 1000;

create or replace function public.update_modified_column()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = timezone('utc', now());
  return new;
end;
$$;

create or replace function public.generate_order_number()
returns text
language plpgsql
as $$
declare
  next_order bigint;
begin
  next_order := nextval('public.order_number_seq');
  return 'TT-' || to_char(timezone('utc', now()), 'YYYYMMDD') || '-' || lpad(next_order::text, 6, '0');
end;
$$;

create or replace function public.is_admin()
returns boolean
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  has_admin_role boolean := false;
begin
  if auth.uid() is null then
    return false;
  end if;

  begin
    execute
      'select exists (select 1 from public.profiles p where p.id = $1 and p.role = ''admin'')'
    into has_admin_role
    using auth.uid();
  exception
    when undefined_table then
      return false;
  end;

  return has_admin_role;
end;
$$;

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  execute
    'insert into public.profiles (id, role, full_name, avatar_url, phone)
     values ($1, ''customer'', $2, $3, $4)
     on conflict (id) do nothing'
  using
    new.id,
    nullif(new.raw_user_meta_data ->> 'full_name', ''),
    nullif(new.raw_user_meta_data ->> 'avatar_url', ''),
    nullif(new.raw_user_meta_data ->> 'phone', '');

  return new;
end;
$$;

create or replace function public.strip_html(input text)
returns text
language sql
immutable
as $$
  select regexp_replace(coalesce(input, ''), '<[^>]+>', '', 'g');
$$;

create or replace function public.set_blog_excerpt()
returns trigger
language plpgsql
as $$
declare
  cleaned text;
begin
  if coalesce(trim(new.excerpt), '') = '' then
    cleaned := trim(public.strip_html(new.content));
    new.excerpt := left(cleaned, 300);
  end if;

  return new;
end;
$$;

create or replace function public.reserve_inventory(p_variant_id uuid, p_quantity integer)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  updated_rows integer;
begin
  if p_quantity <= 0 then
    return false;
  end if;

  execute
    'update public.inventory
     set reserved_quantity = reserved_quantity + $1,
         updated_at = timezone(''utc'', now())
     where variant_id = $2
       and (quantity - reserved_quantity) >= $1'
  using p_quantity, p_variant_id;

  get diagnostics updated_rows = row_count;
  return updated_rows = 1;
end;
$$;

create or replace function public.confirm_inventory(p_variant_id uuid, p_quantity integer)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  updated_rows integer;
begin
  if p_quantity <= 0 then
    return false;
  end if;

  execute
    'update public.inventory
     set quantity = quantity - $1,
         reserved_quantity = greatest(reserved_quantity - $1, 0),
         updated_at = timezone(''utc'', now())
     where variant_id = $2
       and reserved_quantity >= $1'
  using p_quantity, p_variant_id;

  get diagnostics updated_rows = row_count;
  return updated_rows = 1;
end;
$$;

create or replace function public.release_inventory(p_variant_id uuid, p_quantity integer)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  updated_rows integer;
begin
  if p_quantity <= 0 then
    return false;
  end if;

  execute
    'update public.inventory
     set reserved_quantity = greatest(reserved_quantity - $1, 0),
         updated_at = timezone(''utc'', now())
     where variant_id = $2'
  using p_quantity, p_variant_id;

  get diagnostics updated_rows = row_count;
  return updated_rows = 1;
end;
$$;

create or replace function public.increment_blog_views(p_post_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  execute
    'update public.blog_posts
     set view_count = view_count + 1,
         updated_at = timezone(''utc'', now())
     where id = $1'
  using p_post_id;
end;
$$;

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  role text not null default 'customer' check (role in ('customer', 'admin')),
  full_name text,
  avatar_url text,
  phone text,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.products (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  description text,
  meta_title text,
  meta_description text,
  slug text not null unique,
  status text not null default 'draft' check (status in ('draft', 'active', 'archived')),
  product_type text,
  vendor text,
  tags text[] not null default '{}',
  deleted_at timestamptz,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.product_variants (
  id uuid primary key default gen_random_uuid(),
  product_id uuid not null references public.products(id) on delete cascade,
  title text not null,
  sku text unique,
  price integer not null check (price >= 0),
  compare_at_price integer check (compare_at_price >= 0),
  weight integer,
  option1 text,
  option2 text,
  option3 text,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.categories (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  slug text not null unique,
  parent_id uuid references public.categories(id) on delete set null,
  position integer not null default 0,
  description text,
  image_url text,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.collections (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  slug text not null unique,
  description text,
  image_url text,
  type text not null default 'manual' check (type in ('manual', 'automated')),
  conditions jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.collection_products (
  id uuid primary key default gen_random_uuid(),
  collection_id uuid not null references public.collections(id) on delete cascade,
  product_id uuid not null references public.products(id) on delete cascade,
  position integer not null default 0,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  unique (collection_id, product_id)
);

create table if not exists public.product_images (
  id uuid primary key default gen_random_uuid(),
  product_id uuid not null references public.products(id) on delete cascade,
  variant_id uuid references public.product_variants(id) on delete set null,
  url text not null,
  alt_text text,
  position integer not null default 1 check (position > 0),
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.inventory (
  id uuid primary key default gen_random_uuid(),
  variant_id uuid not null unique references public.product_variants(id) on delete cascade,
  quantity integer not null default 0 check (quantity >= 0),
  reserved_quantity integer not null default 0 check (reserved_quantity >= 0),
  low_stock_threshold integer not null default 5 check (low_stock_threshold >= 0),
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.customers (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid unique references public.profiles(id) on delete set null,
  email citext not null unique,
  first_name text,
  last_name text,
  phone text,
  total_orders integer not null default 0 check (total_orders >= 0),
  total_spent integer not null default 0 check (total_spent >= 0),
  notes text,
  accepts_marketing boolean not null default false,
  deleted_at timestamptz,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.addresses (
  id uuid primary key default gen_random_uuid(),
  customer_id uuid not null references public.customers(id) on delete cascade,
  type text not null default 'shipping' check (type in ('shipping', 'billing')),
  is_default boolean not null default false,
  first_name text,
  last_name text,
  company text,
  address_line1 text not null,
  address_line2 text,
  city text not null,
  province text,
  postal_code text,
  country_code text not null,
  phone text,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.orders (
  id uuid primary key default gen_random_uuid(),
  order_number text not null unique default public.generate_order_number(),
  customer_id uuid references public.customers(id) on delete set null,
  email citext not null,
  status text not null default 'pending' check (status in ('pending', 'confirmed', 'processing', 'shipped', 'delivered', 'cancelled')),
  payment_status text not null default 'pending' check (payment_status in ('pending', 'paid', 'failed', 'refunded', 'partially_refunded')),
  fulfillment_status text not null default 'unfulfilled' check (fulfillment_status in ('unfulfilled', 'partial', 'fulfilled', 'returned')),
  currency text not null default 'USD' check (char_length(currency) = 3),
  subtotal integer not null check (subtotal >= 0),
  tax_total integer not null default 0 check (tax_total >= 0),
  shipping_total integer not null default 0 check (shipping_total >= 0),
  discount_total integer not null default 0 check (discount_total >= 0),
  grand_total integer not null check (grand_total >= 0),
  stripe_payment_intent_id text,
  stripe_checkout_session_id text,
  shipping_address jsonb,
  billing_address jsonb,
  notes text,
  deleted_at timestamptz,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.order_items (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.orders(id) on delete cascade,
  variant_id uuid references public.product_variants(id) on delete set null,
  product_title text not null,
  variant_title text,
  sku text,
  quantity integer not null check (quantity > 0),
  unit_price integer not null check (unit_price >= 0),
  total_price integer not null check (total_price >= 0),
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.discounts (
  id uuid primary key default gen_random_uuid(),
  code text not null unique,
  type text not null check (type in ('percentage', 'fixed_amount', 'free_shipping')),
  value integer not null check (value >= 0),
  minimum_order_amount integer,
  usage_limit integer,
  usage_count integer not null default 0,
  starts_at timestamptz,
  ends_at timestamptz,
  is_active boolean not null default true,
  applies_to jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.order_events (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.orders(id) on delete cascade,
  event_type text not null,
  description text not null,
  actor text,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.contact_submissions (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  email citext not null,
  phone text,
  message text not null,
  status text not null default 'new' check (status in ('new', 'read', 'replied', 'archived')),
  admin_notes text,
  replied_at timestamptz,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.newsletter_subscribers (
  id uuid primary key default gen_random_uuid(),
  email citext not null unique,
  status text not null default 'active' check (status in ('active', 'unsubscribed')),
  source text not null default 'footer' check (source in ('footer', 'popup', 'checkout', 'manual')),
  subscribed_at timestamptz not null default timezone('utc', now()),
  unsubscribed_at timestamptz,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.static_pages (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  slug text not null unique,
  content text,
  status text not null default 'draft' check (status in ('draft', 'published')),
  meta_title text,
  meta_description text,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.site_settings (
  id uuid primary key default gen_random_uuid(),
  key text not null unique,
  value jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.blog_categories (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  slug text not null unique,
  description text,
  position integer not null default 0,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.blog_tags (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  slug text not null unique,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.blog_posts (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  slug text not null unique,
  content text not null,
  excerpt text,
  featured_image_url text,
  featured_image_alt text,
  author_id uuid references public.profiles(id) on delete set null,
  status text not null default 'draft' check (status in ('draft', 'published', 'scheduled')),
  published_at timestamptz,
  scheduled_at timestamptz,
  view_count integer not null default 0 check (view_count >= 0),
  meta_title text,
  meta_description text,
  og_image_url text,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.blog_post_categories (
  id uuid primary key default gen_random_uuid(),
  post_id uuid not null references public.blog_posts(id) on delete cascade,
  category_id uuid not null references public.blog_categories(id) on delete cascade,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  unique (post_id, category_id)
);

create table if not exists public.blog_post_tags (
  id uuid primary key default gen_random_uuid(),
  post_id uuid not null references public.blog_posts(id) on delete cascade,
  tag_id uuid not null references public.blog_tags(id) on delete cascade,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  unique (post_id, tag_id)
);

create index if not exists idx_products_status on public.products(status);
create index if not exists idx_products_deleted_at on public.products(deleted_at);
create index if not exists idx_products_search on public.products using gin (to_tsvector('simple', coalesce(title, '') || ' ' || coalesce(description, '')));
create index if not exists idx_product_variants_product_id on public.product_variants(product_id);
create index if not exists idx_product_images_product_id on public.product_images(product_id);
create index if not exists idx_categories_parent_id on public.categories(parent_id);
create index if not exists idx_collection_products_collection_id on public.collection_products(collection_id);
create index if not exists idx_collection_products_product_id on public.collection_products(product_id);
create index if not exists idx_addresses_customer_id on public.addresses(customer_id);
create index if not exists idx_orders_customer_id on public.orders(customer_id);
create index if not exists idx_orders_status on public.orders(status);
create index if not exists idx_orders_created_at on public.orders(created_at desc);
create unique index if not exists idx_orders_stripe_checkout_session_id_unique on public.orders(stripe_checkout_session_id) where stripe_checkout_session_id is not null;
create index if not exists idx_order_items_order_id on public.order_items(order_id);
create index if not exists idx_order_events_order_id on public.order_events(order_id);
create index if not exists idx_contact_submissions_status on public.contact_submissions(status);
create index if not exists idx_newsletter_subscribers_email on public.newsletter_subscribers(email);
create index if not exists idx_blog_posts_status on public.blog_posts(status);
create index if not exists idx_blog_posts_published_at on public.blog_posts(published_at desc);
create index if not exists idx_blog_posts_search on public.blog_posts using gin (to_tsvector('simple', coalesce(title, '') || ' ' || coalesce(excerpt, '') || ' ' || public.strip_html(content)));
create index if not exists idx_blog_post_categories_post_id on public.blog_post_categories(post_id);
create index if not exists idx_blog_post_tags_post_id on public.blog_post_tags(post_id);

create trigger set_profiles_updated_at before update on public.profiles for each row execute function public.update_modified_column();
create trigger set_products_updated_at before update on public.products for each row execute function public.update_modified_column();
create trigger set_product_variants_updated_at before update on public.product_variants for each row execute function public.update_modified_column();
create trigger set_categories_updated_at before update on public.categories for each row execute function public.update_modified_column();
create trigger set_collections_updated_at before update on public.collections for each row execute function public.update_modified_column();
create trigger set_collection_products_updated_at before update on public.collection_products for each row execute function public.update_modified_column();
create trigger set_product_images_updated_at before update on public.product_images for each row execute function public.update_modified_column();
create trigger set_inventory_updated_at before update on public.inventory for each row execute function public.update_modified_column();
create trigger set_customers_updated_at before update on public.customers for each row execute function public.update_modified_column();
create trigger set_addresses_updated_at before update on public.addresses for each row execute function public.update_modified_column();
create trigger set_orders_updated_at before update on public.orders for each row execute function public.update_modified_column();
create trigger set_order_items_updated_at before update on public.order_items for each row execute function public.update_modified_column();
create trigger set_discounts_updated_at before update on public.discounts for each row execute function public.update_modified_column();
create trigger set_order_events_updated_at before update on public.order_events for each row execute function public.update_modified_column();
create trigger set_contact_submissions_updated_at before update on public.contact_submissions for each row execute function public.update_modified_column();
create trigger set_newsletter_subscribers_updated_at before update on public.newsletter_subscribers for each row execute function public.update_modified_column();
create trigger set_static_pages_updated_at before update on public.static_pages for each row execute function public.update_modified_column();
create trigger set_site_settings_updated_at before update on public.site_settings for each row execute function public.update_modified_column();
create trigger set_blog_categories_updated_at before update on public.blog_categories for each row execute function public.update_modified_column();
create trigger set_blog_tags_updated_at before update on public.blog_tags for each row execute function public.update_modified_column();
create trigger set_blog_posts_updated_at before update on public.blog_posts for each row execute function public.update_modified_column();
create trigger set_blog_post_categories_updated_at before update on public.blog_post_categories for each row execute function public.update_modified_column();
create trigger set_blog_post_tags_updated_at before update on public.blog_post_tags for each row execute function public.update_modified_column();

create trigger set_blog_post_excerpt before insert or update of content, excerpt
on public.blog_posts
for each row
execute function public.set_blog_excerpt();

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
after insert on auth.users
for each row
execute function public.handle_new_user();

alter table public.profiles enable row level security;
alter table public.products enable row level security;
alter table public.product_variants enable row level security;
alter table public.product_images enable row level security;
alter table public.categories enable row level security;
alter table public.collections enable row level security;
alter table public.collection_products enable row level security;
alter table public.inventory enable row level security;
alter table public.customers enable row level security;
alter table public.addresses enable row level security;
alter table public.orders enable row level security;
alter table public.order_items enable row level security;
alter table public.discounts enable row level security;
alter table public.order_events enable row level security;
alter table public.contact_submissions enable row level security;
alter table public.newsletter_subscribers enable row level security;
alter table public.static_pages enable row level security;
alter table public.site_settings enable row level security;
alter table public.blog_posts enable row level security;
alter table public.blog_categories enable row level security;
alter table public.blog_tags enable row level security;
alter table public.blog_post_categories enable row level security;
alter table public.blog_post_tags enable row level security;

create policy profiles_owner_read on public.profiles
for select to authenticated
using (id = auth.uid());

create policy profiles_owner_update on public.profiles
for update to authenticated
using (id = auth.uid())
with check (id = auth.uid());

create policy profiles_admin_all on public.profiles
for all to authenticated
using (public.is_admin())
with check (public.is_admin());

create policy products_public_read on public.products
for select to anon, authenticated
using (status = 'active' and deleted_at is null);

create policy products_admin_all on public.products
for all to authenticated
using (public.is_admin())
with check (public.is_admin());

create policy product_variants_public_read on public.product_variants
for select to anon, authenticated
using (
  exists (
    select 1
    from public.products p
    where p.id = product_variants.product_id
      and p.status = 'active'
      and p.deleted_at is null
  )
);

create policy product_variants_admin_all on public.product_variants
for all to authenticated
using (public.is_admin())
with check (public.is_admin());

create policy product_images_public_read on public.product_images
for select to anon, authenticated
using (
  exists (
    select 1
    from public.products p
    where p.id = product_images.product_id
      and p.status = 'active'
      and p.deleted_at is null
  )
);

create policy product_images_admin_all on public.product_images
for all to authenticated
using (public.is_admin())
with check (public.is_admin());

create policy categories_public_read on public.categories
for select to anon, authenticated
using (true);

create policy categories_admin_all on public.categories
for all to authenticated
using (public.is_admin())
with check (public.is_admin());

create policy collections_public_read on public.collections
for select to anon, authenticated
using (true);

create policy collections_admin_all on public.collections
for all to authenticated
using (public.is_admin())
with check (public.is_admin());

create policy collection_products_public_read on public.collection_products
for select to anon, authenticated
using (true);

create policy collection_products_admin_all on public.collection_products
for all to authenticated
using (public.is_admin())
with check (public.is_admin());

create policy inventory_admin_all on public.inventory
for all to authenticated
using (public.is_admin())
with check (public.is_admin());

create policy customers_owner_all on public.customers
for all to authenticated
using (profile_id = auth.uid())
with check (profile_id = auth.uid());

create policy customers_admin_all on public.customers
for all to authenticated
using (public.is_admin())
with check (public.is_admin());

create policy addresses_owner_all on public.addresses
for all to authenticated
using (
  exists (
    select 1
    from public.customers c
    where c.id = addresses.customer_id
      and c.profile_id = auth.uid()
  )
)
with check (
  exists (
    select 1
    from public.customers c
    where c.id = addresses.customer_id
      and c.profile_id = auth.uid()
  )
);

create policy addresses_admin_all on public.addresses
for all to authenticated
using (public.is_admin())
with check (public.is_admin());

create policy orders_owner_read on public.orders
for select to authenticated
using (
  exists (
    select 1
    from public.customers c
    where c.id = orders.customer_id
      and c.profile_id = auth.uid()
  )
);

create policy orders_admin_all on public.orders
for all to authenticated
using (public.is_admin())
with check (public.is_admin());

create policy order_items_owner_read on public.order_items
for select to authenticated
using (
  exists (
    select 1
    from public.orders o
    join public.customers c on c.id = o.customer_id
    where o.id = order_items.order_id
      and c.profile_id = auth.uid()
  )
);

create policy order_items_admin_all on public.order_items
for all to authenticated
using (public.is_admin())
with check (public.is_admin());

create policy discounts_admin_all on public.discounts
for all to authenticated
using (public.is_admin())
with check (public.is_admin());

create policy order_events_admin_all on public.order_events
for all to authenticated
using (public.is_admin())
with check (public.is_admin());

create policy contact_submissions_public_insert on public.contact_submissions
for insert to anon, authenticated
with check (true);

create policy contact_submissions_admin_all on public.contact_submissions
for all to authenticated
using (public.is_admin())
with check (public.is_admin());

create policy newsletter_subscribers_public_insert on public.newsletter_subscribers
for insert to anon, authenticated
with check (true);

create policy newsletter_subscribers_admin_all on public.newsletter_subscribers
for all to authenticated
using (public.is_admin())
with check (public.is_admin());

create policy static_pages_public_read on public.static_pages
for select to anon, authenticated
using (status = 'published');

create policy static_pages_admin_all on public.static_pages
for all to authenticated
using (public.is_admin())
with check (public.is_admin());

create policy site_settings_admin_all on public.site_settings
for all to authenticated
using (public.is_admin())
with check (public.is_admin());

create policy blog_posts_public_read on public.blog_posts
for select to anon, authenticated
using (
  status = 'published'
  and (published_at is null or published_at <= timezone('utc', now()))
);

create policy blog_posts_admin_all on public.blog_posts
for all to authenticated
using (public.is_admin())
with check (public.is_admin());

create policy blog_categories_public_read on public.blog_categories
for select to anon, authenticated
using (true);

create policy blog_categories_admin_all on public.blog_categories
for all to authenticated
using (public.is_admin())
with check (public.is_admin());

create policy blog_tags_public_read on public.blog_tags
for select to anon, authenticated
using (true);

create policy blog_tags_admin_all on public.blog_tags
for all to authenticated
using (public.is_admin())
with check (public.is_admin());

create policy blog_post_categories_public_read on public.blog_post_categories
for select to anon, authenticated
using (
  exists (
    select 1
    from public.blog_posts bp
    where bp.id = blog_post_categories.post_id
      and bp.status = 'published'
  )
);

create policy blog_post_categories_admin_all on public.blog_post_categories
for all to authenticated
using (public.is_admin())
with check (public.is_admin());

create policy blog_post_tags_public_read on public.blog_post_tags
for select to anon, authenticated
using (
  exists (
    select 1
    from public.blog_posts bp
    where bp.id = blog_post_tags.post_id
      and bp.status = 'published'
  )
);

create policy blog_post_tags_admin_all on public.blog_post_tags
for all to authenticated
using (public.is_admin())
with check (public.is_admin());

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values
  ('product-images', 'product-images', true, 5242880, array['image/jpeg', 'image/png', 'image/webp']),
  ('blog-images', 'blog-images', true, 5242880, array['image/jpeg', 'image/png', 'image/webp']),
  ('private-assets', 'private-assets', false, 10485760, array['application/pdf', 'image/jpeg', 'image/png', 'image/webp'])
on conflict (id) do update
set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

alter table storage.objects enable row level security;

create policy product_images_public_select on storage.objects
for select to anon, authenticated
using (bucket_id = 'product-images');

create policy blog_images_public_select on storage.objects
for select to anon, authenticated
using (bucket_id = 'blog-images');

create policy private_assets_admin_select on storage.objects
for select to authenticated
using (bucket_id = 'private-assets' and public.is_admin());

create policy product_images_admin_insert on storage.objects
for insert to authenticated
with check (bucket_id = 'product-images' and public.is_admin());

create policy product_images_admin_update on storage.objects
for update to authenticated
using (bucket_id = 'product-images' and public.is_admin())
with check (bucket_id = 'product-images' and public.is_admin());

create policy product_images_admin_delete on storage.objects
for delete to authenticated
using (bucket_id = 'product-images' and public.is_admin());

create policy blog_images_admin_insert on storage.objects
for insert to authenticated
with check (bucket_id = 'blog-images' and public.is_admin());

create policy blog_images_admin_update on storage.objects
for update to authenticated
using (bucket_id = 'blog-images' and public.is_admin())
with check (bucket_id = 'blog-images' and public.is_admin());

create policy blog_images_admin_delete on storage.objects
for delete to authenticated
using (bucket_id = 'blog-images' and public.is_admin());

create policy private_assets_admin_insert on storage.objects
for insert to authenticated
with check (bucket_id = 'private-assets' and public.is_admin());

create policy private_assets_admin_update on storage.objects
for update to authenticated
using (bucket_id = 'private-assets' and public.is_admin())
with check (bucket_id = 'private-assets' and public.is_admin());

create policy private_assets_admin_delete on storage.objects
for delete to authenticated
using (bucket_id = 'private-assets' and public.is_admin());

commit;
