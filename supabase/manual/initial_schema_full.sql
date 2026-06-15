

-- =============================================================================
-- IMPORTANTE
-- =============================================================================
-- Este archivo consolidado está pensado principalmente para una base VACIA.
-- Si una ejecución previa falló a mitad, algunos objetos pueden ya existir.
-- Para evitar errores tempranos en reintentos manuales, los enums base se crean
-- con guardas. Si tu base quedó parcialmente creada, lo más seguro sigue siendo
-- partir de un proyecto nuevo o continuar desde el último punto aplicado.
-- =============================================================================

-- ===== FILE: supabase/migrations/20250530090000_init_schema.sql =====

-- =============================================================================
-- Inventario Licor — Fase 1
-- Migración 0001: Esquema base (tipos, tablas, constraints, funciones, triggers)
-- =============================================================================
-- Convenciones:
--   * Nombres de tablas/columnas en snake_case y plural para tablas.
--   * Toda PK es uuid (gen_random_uuid()) salvo `profiles` que reusa auth.users.id.
--   * created_at / updated_at en timestamptz con default now().
--   * Borrados protegidos con ON DELETE RESTRICT donde perder el dato rompería historial.
-- =============================================================================

-- gen_random_uuid() vive en pgcrypto (ya viene habilitado en Supabase, pero lo
-- aseguramos por idempotencia en entornos locales).
create extension if not exists "pgcrypto";

-- -----------------------------------------------------------------------------
-- 1. TIPOS ENUM
-- -----------------------------------------------------------------------------
do $$
begin
  if not exists (
    select 1
    from pg_type t
    join pg_namespace n on n.oid = t.typnamespace
    where t.typname = 'user_role' and n.nspname = 'public'
  ) then
    create type public.user_role as enum ('ADMIN', 'OPERATOR');
  end if;
end
$$;

do $$
begin
  if not exists (
    select 1
    from pg_type t
    join pg_namespace n on n.oid = t.typnamespace
    where t.typname = 'bottle_status' and n.nspname = 'public'
  ) then
    create type public.bottle_status as enum (
      'IN_WAREHOUSE',
      'IN_BAR',
      'SOLD',
      'EMPTY',
      'RETURNED',
      'LOST'
    );
  end if;
end
$$;

do $$
begin
  if not exists (
    select 1
    from pg_type t
    join pg_namespace n on n.oid = t.typnamespace
    where t.typname = 'location_type' and n.nspname = 'public'
  ) then
    create type public.location_type as enum (
      'WAREHOUSE',
      'BAR',
      'CUSTOMER',
      'EXTERNAL'
    );
  end if;
end
$$;

do $$
begin
  if not exists (
    select 1
    from pg_type t
    join pg_namespace n on n.oid = t.typnamespace
    where t.typname = 'movement_type' and n.nspname = 'public'
  ) then
    create type public.movement_type as enum (
      'WAREHOUSE_TO_BAR',
      'BAR_TO_WAREHOUSE',
      'CUSTOMER_SALE',
      'WASTE',
      'ADJUSTMENT'
    );
  end if;
end
$$;

-- -----------------------------------------------------------------------------
-- 2. FUNCIONES DE UTILIDAD
-- -----------------------------------------------------------------------------

-- Mantiene updated_at en cada UPDATE.
create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

-- -----------------------------------------------------------------------------
-- 3. PROFILES  (extiende auth.users)
-- -----------------------------------------------------------------------------
create table public.profiles (
  id          uuid primary key references auth.users (id) on delete cascade,
  email       text not null,
  full_name   text,
  role        public.user_role not null default 'OPERATOR',
  active      boolean not null default true,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

comment on table public.profiles is 'Perfil de aplicación. 1:1 con auth.users; guarda rol y metadatos.';

create trigger trg_profiles_updated_at
  before update on public.profiles
  for each row execute function public.set_updated_at();

-- Devuelve el rol del usuario autenticado. SECURITY DEFINER para evitar recursión
-- de RLS al leer `profiles` desde dentro de las propias policies de `profiles`.
create or replace function public.current_user_role()
returns public.user_role
language sql
stable
security definer
set search_path = public
as $$
  select role from public.profiles where id = auth.uid();
$$;

-- Helper booleano de conveniencia.
create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.profiles
    where id = auth.uid() and role = 'ADMIN'
  );
$$;

-- Crea automáticamente un profile cuando se registra un auth.user.
-- El rol y nombre pueden venir en raw_user_meta_data (al hacer signUp con options.data).
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, email, full_name, role)
  values (
    new.id,
    new.email,
    nullif(new.raw_user_meta_data ->> 'full_name', ''),
    coalesce((new.raw_user_meta_data ->> 'role')::public.user_role, 'OPERATOR')
  );
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- Impide que un usuario NO admin cambie su propio rol (escalación de privilegios).
create or replace function public.prevent_role_escalation()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.role is distinct from old.role and not public.is_admin() then
    raise exception 'Solo un ADMIN puede modificar el rol de un usuario';
  end if;
  return new;
end;
$$;

create trigger trg_profiles_prevent_role_escalation
  before update on public.profiles
  for each row execute function public.prevent_role_escalation();

-- -----------------------------------------------------------------------------
-- 4. CATÁLOGOS
-- -----------------------------------------------------------------------------

-- 4.1 bottle_types — catálogo maestro de tipos de botella.
create table public.bottle_types (
  id               uuid primary key default gen_random_uuid(),
  name             text not null,
  barcode          text unique,
  full_ounces      numeric(7, 2) not null check (full_ounces > 0),
  empty_weight_oz  numeric(7, 2) check (empty_weight_oz >= 0),
  image_url        text,
  active           boolean not null default true,
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now()
);

comment on table public.bottle_types is 'Catálogo maestro: define cada tipo/marca de botella y su capacidad.';

create trigger trg_bottle_types_updated_at
  before update on public.bottle_types
  for each row execute function public.set_updated_at();

-- 4.2 bottles — botellas físicas individuales (trazabilidad por unidad).
create table public.bottles (
  id              uuid primary key default gen_random_uuid(),
  unique_code     text not null unique,
  bottle_type_id  uuid not null references public.bottle_types (id) on delete restrict,
  status          public.bottle_status not null default 'IN_WAREHOUSE',
  current_ounces  numeric(7, 2) not null default 0 check (current_ounces >= 0),
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);

comment on table public.bottles is 'Botella física individual con código único, estado y onzas actuales.';

create trigger trg_bottles_updated_at
  before update on public.bottles
  for each row execute function public.set_updated_at();

-- 4.3 categories — categorías de producto vendible.
create table public.categories (
  id          uuid primary key default gen_random_uuid(),
  name        text not null unique,
  created_at  timestamptz not null default now()
);

comment on table public.categories is 'Categorías de producto: DRINK, SHOT, POUR, BEER, BUCKET, FULL_BOTTLE...';

-- 4.4 products — producto vendible.
create table public.products (
  id           uuid primary key default gen_random_uuid(),
  category_id  uuid not null references public.categories (id) on delete restrict,
  name         text not null,
  active       boolean not null default true,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now(),
  unique (category_id, name)
);

comment on table public.products is 'Producto vendible (ej: Margarita, Shot de Tequila).';

create trigger trg_products_updated_at
  before update on public.products
  for each row execute function public.set_updated_at();

-- 4.5 recipes — receta de un producto.
create table public.recipes (
  id          uuid primary key default gen_random_uuid(),
  product_id  uuid not null references public.products (id) on delete cascade,
  active      boolean not null default true,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

comment on table public.recipes is 'Receta de un producto. Solo puede haber una receta activa por producto.';

create trigger trg_recipes_updated_at
  before update on public.recipes
  for each row execute function public.set_updated_at();

-- Garantiza una única receta ACTIVA por producto (índice único parcial).
create unique index uq_recipes_one_active_per_product
  on public.recipes (product_id)
  where active;

-- 4.6 recipe_details — ingredientes de la receta (tipo de botella + onzas).
create table public.recipe_details (
  id              uuid primary key default gen_random_uuid(),
  recipe_id       uuid not null references public.recipes (id) on delete cascade,
  bottle_type_id  uuid not null references public.bottle_types (id) on delete restrict,
  ounces          numeric(7, 2) not null check (ounces > 0),
  created_at      timestamptz not null default now(),
  unique (recipe_id, bottle_type_id)
);

comment on table public.recipe_details is 'Detalle de receta: cuántas onzas de cada bottle_type lleva el producto.';

-- -----------------------------------------------------------------------------
-- 5. INVENTARIO (operaciones — fundación para fases siguientes)
-- -----------------------------------------------------------------------------

-- 5.1 inventory_snapshots — corte de inventario (cabecera).
create table public.inventory_snapshots (
  id             uuid primary key default gen_random_uuid(),
  snapshot_date  date not null default current_date,
  created_by     uuid references public.profiles (id) on delete set null,
  notes          text,
  created_at     timestamptz not null default now()
);

comment on table public.inventory_snapshots is 'Cabecera de un conteo/corte de inventario en una fecha.';

-- 5.2 inventory_snapshot_details — detalle del corte por botella.
create table public.inventory_snapshot_details (
  id              uuid primary key default gen_random_uuid(),
  snapshot_id     uuid not null references public.inventory_snapshots (id) on delete cascade,
  bottle_id       uuid not null references public.bottles (id) on delete restrict,
  current_ounces  numeric(7, 2) not null check (current_ounces >= 0),
  unique (snapshot_id, bottle_id)
);

-- 5.3 inventory_movements — tabla más importante: cada movimiento de stock.
create table public.inventory_movements (
  id             uuid primary key default gen_random_uuid(),
  bottle_id      uuid not null references public.bottles (id) on delete restrict,
  movement_type  public.movement_type not null,
  from_location  public.location_type,
  to_location    public.location_type,
  ounces         numeric(7, 2) check (ounces >= 0), -- cantidad consumida/movida si aplica
  notes          text,
  created_by     uuid references public.profiles (id) on delete set null,
  created_at     timestamptz not null default now()
);

comment on table public.inventory_movements is 'Bitácora de movimientos de inventario (origen/destino, tipo, onzas).';

-- -----------------------------------------------------------------------------
-- 6. VENTAS (captura manual — fundación para fases siguientes)
-- -----------------------------------------------------------------------------
create table public.sales_periods (
  id          uuid primary key default gen_random_uuid(),
  start_date  date not null,
  end_date    date not null,
  created_by  uuid references public.profiles (id) on delete set null,
  created_at  timestamptz not null default now(),
  check (end_date >= start_date)
);

create table public.sales_details (
  id               uuid primary key default gen_random_uuid(),
  sales_period_id  uuid not null references public.sales_periods (id) on delete cascade,
  product_id       uuid not null references public.products (id) on delete restrict,
  quantity         integer not null check (quantity >= 0),
  unique (sales_period_id, product_id)
);

-- -----------------------------------------------------------------------------
-- 7. AUDITORÍA
-- -----------------------------------------------------------------------------
create table public.audit_logs (
  id           uuid primary key default gen_random_uuid(),
  user_id      uuid references public.profiles (id) on delete set null,
  entity_name  text not null,
  entity_id    text,
  action       text not null,           -- INSERT | UPDATE | DELETE
  old_values   jsonb,
  new_values   jsonb,
  created_at   timestamptz not null default now()
);

comment on table public.audit_logs is 'Registro inmutable de cambios. Se llena por trigger, no por la app.';

-- Trigger genérico de auditoría: registra INSERT/UPDATE/DELETE en audit_logs.
create or replace function public.audit_trigger()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_old jsonb;
  v_new jsonb;
  v_id  text;
begin
  if (tg_op = 'DELETE') then
    v_old := to_jsonb(old);
    v_id  := old.id::text;
  elsif (tg_op = 'UPDATE') then
    v_old := to_jsonb(old);
    v_new := to_jsonb(new);
    v_id  := new.id::text;
  else -- INSERT
    v_new := to_jsonb(new);
    v_id  := new.id::text;
  end if;

  insert into public.audit_logs (user_id, entity_name, entity_id, action, old_values, new_values)
  values (auth.uid(), tg_table_name, v_id, tg_op, v_old, v_new);

  if (tg_op = 'DELETE') then
    return old;
  end if;
  return new;
end;
$$;

-- Adjuntamos auditoría a las tablas de catálogo/maestras.
create trigger trg_audit_bottle_types
  after insert or update or delete on public.bottle_types
  for each row execute function public.audit_trigger();

create trigger trg_audit_bottles
  after insert or update or delete on public.bottles
  for each row execute function public.audit_trigger();

create trigger trg_audit_categories
  after insert or update or delete on public.categories
  for each row execute function public.audit_trigger();

create trigger trg_audit_products
  after insert or update or delete on public.products
  for each row execute function public.audit_trigger();

create trigger trg_audit_recipes
  after insert or update or delete on public.recipes
  for each row execute function public.audit_trigger();

create trigger trg_audit_recipe_details
  after insert or update or delete on public.recipe_details
  for each row execute function public.audit_trigger();

create trigger trg_audit_profiles
  after insert or update or delete on public.profiles
  for each row execute function public.audit_trigger();


-- ===== FILE: supabase/migrations/20250530090100_indexes.sql =====

-- =============================================================================
-- Migración 0002: Índices recomendados
-- Cubren claves foráneas (no indexadas por defecto en Postgres) y filtros comunes.
-- =============================================================================

-- profiles
create index idx_profiles_role on public.profiles (role);

-- bottle_types
create index idx_bottle_types_active on public.bottle_types (active);

-- bottles
create index idx_bottles_bottle_type_id on public.bottles (bottle_type_id);
create index idx_bottles_status on public.bottles (status);

-- products
create index idx_products_category_id on public.products (category_id);
create index idx_products_active on public.products (active);

-- recipes
create index idx_recipes_product_id on public.recipes (product_id);

-- recipe_details
create index idx_recipe_details_recipe_id on public.recipe_details (recipe_id);
create index idx_recipe_details_bottle_type_id on public.recipe_details (bottle_type_id);

-- inventory_snapshots / details
create index idx_inventory_snapshots_date on public.inventory_snapshots (snapshot_date);
create index idx_snapshot_details_snapshot_id on public.inventory_snapshot_details (snapshot_id);
create index idx_snapshot_details_bottle_id on public.inventory_snapshot_details (bottle_id);

-- inventory_movements (consultas por botella, tipo, fecha y autor)
create index idx_movements_bottle_id on public.inventory_movements (bottle_id);
create index idx_movements_type on public.inventory_movements (movement_type);
create index idx_movements_created_at on public.inventory_movements (created_at desc);
create index idx_movements_created_by on public.inventory_movements (created_by);

-- sales
create index idx_sales_details_period_id on public.sales_details (sales_period_id);
create index idx_sales_details_product_id on public.sales_details (product_id);

-- audit_logs
create index idx_audit_entity on public.audit_logs (entity_name, entity_id);
create index idx_audit_user_id on public.audit_logs (user_id);
create index idx_audit_created_at on public.audit_logs (created_at desc);


-- ===== FILE: supabase/migrations/20250530090200_rls_policies.sql =====

-- =============================================================================
-- Migración 0003: Row Level Security (RLS)
-- =============================================================================
-- Modelo de permisos (Fase 1):
--   OPERATOR -> SELECT, INSERT, UPDATE sobre operaciones/catálogos. NO DELETE.
--   ADMIN    -> acceso completo (incluye DELETE) + gestión de usuarios/roles.
--
-- Patrón "operativo" reutilizado en catálogos y operaciones:
--   select  -> cualquier usuario autenticado
--   insert  -> cualquier usuario autenticado
--   update  -> cualquier usuario autenticado
--   delete  -> solo ADMIN
-- =============================================================================

-- Activamos RLS en TODAS las tablas de public.
alter table public.profiles                   enable row level security;
alter table public.bottle_types               enable row level security;
alter table public.bottles                    enable row level security;
alter table public.categories                 enable row level security;
alter table public.products                   enable row level security;
alter table public.recipes                    enable row level security;
alter table public.recipe_details             enable row level security;
alter table public.inventory_snapshots        enable row level security;
alter table public.inventory_snapshot_details enable row level security;
alter table public.inventory_movements        enable row level security;
alter table public.sales_periods              enable row level security;
alter table public.sales_details              enable row level security;
alter table public.audit_logs                 enable row level security;

-- -----------------------------------------------------------------------------
-- PROFILES — el usuario ve/edita lo suyo; ADMIN ve/edita todo.
-- (El trigger prevent_role_escalation impide que un no-admin cambie su rol.)
-- -----------------------------------------------------------------------------
create policy profiles_select on public.profiles
  for select to authenticated
  using (id = auth.uid() or public.is_admin());

create policy profiles_update on public.profiles
  for update to authenticated
  using (id = auth.uid() or public.is_admin())
  with check (id = auth.uid() or public.is_admin());

create policy profiles_insert_admin on public.profiles
  for insert to authenticated
  with check (public.is_admin());

create policy profiles_delete_admin on public.profiles
  for delete to authenticated
  using (public.is_admin());

-- -----------------------------------------------------------------------------
-- Macro conceptual: aplicamos el "patrón operativo" tabla por tabla.
-- (Postgres no tiene loops en DDL declarativo, se escribe explícito por claridad.)
-- -----------------------------------------------------------------------------

-- BOTTLE_TYPES
create policy bottle_types_select on public.bottle_types
  for select to authenticated using (true);
create policy bottle_types_insert on public.bottle_types
  for insert to authenticated with check (true);
create policy bottle_types_update on public.bottle_types
  for update to authenticated using (true) with check (true);
create policy bottle_types_delete on public.bottle_types
  for delete to authenticated using (public.is_admin());

-- BOTTLES
create policy bottles_select on public.bottles
  for select to authenticated using (true);
create policy bottles_insert on public.bottles
  for insert to authenticated with check (true);
create policy bottles_update on public.bottles
  for update to authenticated using (true) with check (true);
create policy bottles_delete on public.bottles
  for delete to authenticated using (public.is_admin());

-- CATEGORIES
create policy categories_select on public.categories
  for select to authenticated using (true);
create policy categories_insert on public.categories
  for insert to authenticated with check (true);
create policy categories_update on public.categories
  for update to authenticated using (true) with check (true);
create policy categories_delete on public.categories
  for delete to authenticated using (public.is_admin());

-- PRODUCTS
create policy products_select on public.products
  for select to authenticated using (true);
create policy products_insert on public.products
  for insert to authenticated with check (true);
create policy products_update on public.products
  for update to authenticated using (true) with check (true);
create policy products_delete on public.products
  for delete to authenticated using (public.is_admin());

-- RECIPES
create policy recipes_select on public.recipes
  for select to authenticated using (true);
create policy recipes_insert on public.recipes
  for insert to authenticated with check (true);
create policy recipes_update on public.recipes
  for update to authenticated using (true) with check (true);
create policy recipes_delete on public.recipes
  for delete to authenticated using (public.is_admin());

-- RECIPE_DETAILS
create policy recipe_details_select on public.recipe_details
  for select to authenticated using (true);
create policy recipe_details_insert on public.recipe_details
  for insert to authenticated with check (true);
create policy recipe_details_update on public.recipe_details
  for update to authenticated using (true) with check (true);
create policy recipe_details_delete on public.recipe_details
  for delete to authenticated using (public.is_admin());

-- INVENTORY_SNAPSHOTS
create policy snapshots_select on public.inventory_snapshots
  for select to authenticated using (true);
create policy snapshots_insert on public.inventory_snapshots
  for insert to authenticated with check (true);
create policy snapshots_update on public.inventory_snapshots
  for update to authenticated using (true) with check (true);
create policy snapshots_delete on public.inventory_snapshots
  for delete to authenticated using (public.is_admin());

-- INVENTORY_SNAPSHOT_DETAILS
create policy snapshot_details_select on public.inventory_snapshot_details
  for select to authenticated using (true);
create policy snapshot_details_insert on public.inventory_snapshot_details
  for insert to authenticated with check (true);
create policy snapshot_details_update on public.inventory_snapshot_details
  for update to authenticated using (true) with check (true);
create policy snapshot_details_delete on public.inventory_snapshot_details
  for delete to authenticated using (public.is_admin());

-- INVENTORY_MOVEMENTS  (bitácora: insertable y consultable; sin UPDATE ni DELETE
-- salvo ADMIN, para preservar integridad del historial)
create policy movements_select on public.inventory_movements
  for select to authenticated using (true);
create policy movements_insert on public.inventory_movements
  for insert to authenticated with check (true);
create policy movements_update on public.inventory_movements
  for update to authenticated using (public.is_admin()) with check (public.is_admin());
create policy movements_delete on public.inventory_movements
  for delete to authenticated using (public.is_admin());

-- SALES_PERIODS
create policy sales_periods_select on public.sales_periods
  for select to authenticated using (true);
create policy sales_periods_insert on public.sales_periods
  for insert to authenticated with check (true);
create policy sales_periods_update on public.sales_periods
  for update to authenticated using (true) with check (true);
create policy sales_periods_delete on public.sales_periods
  for delete to authenticated using (public.is_admin());

-- SALES_DETAILS
create policy sales_details_select on public.sales_details
  for select to authenticated using (true);
create policy sales_details_insert on public.sales_details
  for insert to authenticated with check (true);
create policy sales_details_update on public.sales_details
  for update to authenticated using (true) with check (true);
create policy sales_details_delete on public.sales_details
  for delete to authenticated using (public.is_admin());

-- AUDIT_LOGS — inmutable para la app: solo ADMIN puede leer; nadie inserta/edita
-- vía API (lo hace el trigger con SECURITY DEFINER, que ignora RLS).
create policy audit_logs_select_admin on public.audit_logs
  for select to authenticated using (public.is_admin());


-- ===== FILE: supabase/migrations/20250530090300_storage.sql =====

-- =============================================================================
-- Migración 0004: Supabase Storage — Buckets y políticas
-- =============================================================================
-- bottle-images   -> imágenes de catálogo. Lectura pública, escritura autenticada.
-- evidence-images -> evidencias de operaciones (privadas). Solo autenticados.
-- =============================================================================

insert into storage.buckets (id, name, public)
values
  ('bottle-images', 'bottle-images', true),
  ('evidence-images', 'evidence-images', false)
on conflict (id) do nothing;

-- -----------------------------------------------------------------------------
-- Políticas sobre storage.objects
-- -----------------------------------------------------------------------------

-- bottle-images: lectura pública (cualquiera, incluso anónimo).
drop policy if exists "bottle_images_public_read" on storage.objects;
create policy "bottle_images_public_read"
  on storage.objects for select
  using (bucket_id = 'bottle-images');

-- bottle-images: subir / actualizar / borrar requiere usuario autenticado.
drop policy if exists "bottle_images_auth_insert" on storage.objects;
create policy "bottle_images_auth_insert"
  on storage.objects for insert to authenticated
  with check (bucket_id = 'bottle-images');

drop policy if exists "bottle_images_auth_update" on storage.objects;
create policy "bottle_images_auth_update"
  on storage.objects for update to authenticated
  using (bucket_id = 'bottle-images')
  with check (bucket_id = 'bottle-images');

drop policy if exists "bottle_images_admin_delete" on storage.objects;
create policy "bottle_images_admin_delete"
  on storage.objects for delete to authenticated
  using (bucket_id = 'bottle-images' and public.is_admin());

-- evidence-images: todo el acceso requiere autenticación (bucket privado).
drop policy if exists "evidence_images_auth_read" on storage.objects;
create policy "evidence_images_auth_read"
  on storage.objects for select to authenticated
  using (bucket_id = 'evidence-images');

drop policy if exists "evidence_images_auth_insert" on storage.objects;
create policy "evidence_images_auth_insert"
  on storage.objects for insert to authenticated
  with check (bucket_id = 'evidence-images');

drop policy if exists "evidence_images_admin_delete" on storage.objects;
create policy "evidence_images_admin_delete"
  on storage.objects for delete to authenticated
  using (bucket_id = 'evidence-images' and public.is_admin());


-- ===== FILE: supabase/migrations/20250530090400_reference_seed.sql =====

-- =============================================================================
-- Migración 0005: Datos de referencia (deben existir también en producción)
-- =============================================================================
-- Categorías base del negocio. Idempotente vía ON CONFLICT.
-- =============================================================================

insert into public.categories (name) values
  ('DRINK'),
  ('SHOT'),
  ('POUR'),
  ('BEER'),
  ('BUCKET'),
  ('FULL_BOTTLE')
on conflict (name) do nothing;


-- ===== FILE: supabase/migrations/20250531090000_phase2_categories_active.sql =====

-- =============================================================================
-- Fase 2 — Migración 0006: categorías desactivables
-- =============================================================================
-- El catálogo de categorías ahora puede activarse/desactivarse (no se borra,
-- para preservar productos históricos asociados).
-- =============================================================================

alter table public.categories
  add column if not exists active boolean not null default true;

create index if not exists idx_categories_active on public.categories (active);


-- ===== FILE: supabase/migrations/20250531090100_phase2_bottle_reception.sql =====

-- =============================================================================
-- Fase 2 — Migración 0007: Recepción de botellas (generación de códigos)
-- =============================================================================
-- Al recibir mercancía, el sistema genera N botellas físicas con código
-- correlativo (10001, 10002, …) usando una secuencia (atómico y único).
-- También se permite la captura manual de códigos desde la app (bulk insert).
-- =============================================================================

-- Secuencia para códigos automáticos. Empieza en 10001.
create sequence if not exists public.bottle_code_seq
  as bigint
  start with 10001
  increment by 1;

grant usage, select on sequence public.bottle_code_seq to authenticated;

-- receive_bottles: inserta `p_count` botellas del tipo dado y devuelve las creadas.
-- SECURITY INVOKER: respeta las RLS del usuario autenticado que la invoca.
create or replace function public.receive_bottles(
  p_bottle_type_id uuid,
  p_count integer,
  p_status public.bottle_status default 'IN_WAREHOUSE'
)
returns setof public.bottles
language plpgsql
security invoker
set search_path = public
as $$
declare
  i integer;
  v_full numeric;
begin
  if p_count < 1 or p_count > 1000 then
    raise exception 'La cantidad debe estar entre 1 y 1000';
  end if;

  select full_ounces into v_full
  from public.bottle_types
  where id = p_bottle_type_id;

  if v_full is null then
    raise exception 'Tipo de botella inexistente';
  end if;

  for i in 1..p_count loop
    return query
      insert into public.bottles (unique_code, bottle_type_id, status, current_ounces)
      values (nextval('public.bottle_code_seq')::text, p_bottle_type_id, p_status, v_full)
      returning *;
  end loop;
end;
$$;

grant execute on function public.receive_bottles(uuid, integer, public.bottle_status)
  to authenticated;


-- ===== FILE: supabase/migrations/20250531090200_phase2_initial_inventory.sql =====

-- =============================================================================
-- Fase 2 — Migración 0008: Inventario inicial + evento de auditoría custom
-- =============================================================================

-- log_event: registra un evento manual en audit_logs.
-- SECURITY DEFINER porque audit_logs no tiene policy de INSERT para usuarios
-- (la bitácora solo se escribe vía funciones/triggers controlados).
create or replace function public.log_event(
  p_entity_name text,
  p_entity_id text,
  p_action text,
  p_new jsonb default null
)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.audit_logs (user_id, entity_name, entity_id, action, new_values)
  values (auth.uid(), p_entity_name, p_entity_id, p_action, p_new);
end;
$$;

revoke all on function public.log_event(text, text, text, jsonb) from public;
grant execute on function public.log_event(text, text, text, jsonb) to authenticated;

-- capture_initial_inventory: carga única al arrancar el sistema.
-- Crea un snapshot, ajusta el estado/onzas de cada botella y guarda el detalle.
-- p_lines: jsonb array de objetos { bottle_id, location: 'WAREHOUSE'|'BAR', current_ounces }.
create or replace function public.capture_initial_inventory(
  p_notes text,
  p_lines jsonb
)
returns uuid
language plpgsql
security invoker
set search_path = public
as $$
declare
  v_snapshot_id uuid;
  v_line jsonb;
  v_bottle_id uuid;
  v_location text;
  v_oz numeric;
  v_status public.bottle_status;
begin
  if jsonb_typeof(p_lines) <> 'array' or jsonb_array_length(p_lines) = 0 then
    raise exception 'Debe capturar al menos una botella';
  end if;

  insert into public.inventory_snapshots (created_by, notes)
  values (auth.uid(), coalesce(nullif(p_notes, ''), 'Inventario inicial'))
  returning id into v_snapshot_id;

  for v_line in select * from jsonb_array_elements(p_lines)
  loop
    v_bottle_id := (v_line ->> 'bottle_id')::uuid;
    v_location  := upper(v_line ->> 'location');
    v_oz        := (v_line ->> 'current_ounces')::numeric;

    if v_location = 'WAREHOUSE' then
      v_status := 'IN_WAREHOUSE';
    elsif v_location = 'BAR' then
      v_status := 'IN_BAR';
    else
      raise exception 'Ubicación inválida: %', v_location;
    end if;

    update public.bottles
      set status = v_status,
          current_ounces = v_oz
      where id = v_bottle_id;

    insert into public.inventory_snapshot_details (snapshot_id, bottle_id, current_ounces)
    values (v_snapshot_id, v_bottle_id, v_oz)
    on conflict (snapshot_id, bottle_id)
      do update set current_ounces = excluded.current_ounces;
  end loop;

  perform public.log_event(
    'inventory_snapshots',
    v_snapshot_id::text,
    'INITIAL_INVENTORY',
    jsonb_build_object('line_count', jsonb_array_length(p_lines))
  );

  return v_snapshot_id;
end;
$$;

grant execute on function public.capture_initial_inventory(text, jsonb) to authenticated;


-- ===== FILE: supabase/migrations/20260614190000_auth_profile_sync.sql =====

-- Mantiene `public.profiles` sincronizado con `auth.users` y corrige usuarios
-- existentes que pudieron haberse creado antes del trigger inicial.

create or replace function public.upsert_auth_user_profile()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, email, full_name, role, active)
  values (
    new.id,
    new.email,
    nullif(new.raw_user_meta_data ->> 'full_name', ''),
    coalesce((new.raw_user_meta_data ->> 'role')::public.user_role, 'OPERATOR'),
    true
  )
  on conflict (id) do update
  set email = excluded.email,
      full_name = coalesce(public.profiles.full_name, excluded.full_name),
      updated_at = now();

  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.upsert_auth_user_profile();

drop trigger if exists on_auth_user_updated on auth.users;

create trigger on_auth_user_updated
  after update of email, raw_user_meta_data on auth.users
  for each row execute function public.upsert_auth_user_profile();

insert into public.profiles (id, email, full_name, role, active)
select
  au.id,
  au.email,
  nullif(au.raw_user_meta_data ->> 'full_name', ''),
  coalesce((au.raw_user_meta_data ->> 'role')::public.user_role, 'OPERATOR'),
  true
from auth.users au
left join public.profiles p on p.id = au.id
where p.id is null;

update public.profiles p
set email = au.email,
    updated_at = now()
from auth.users au
where au.id = p.id
  and p.email is distinct from au.email;


-- ===== FILE: supabase/migrations/20260615011014_bottle-categories-and-bottle-guards.sql =====

-- =============================================================================
-- Fase 2 — Categorías de botellas + reglas de inmutabilidad
-- =============================================================================
-- Objetivos:
-- 1. Definir categorías de botella como TEQUILA, RON, VODKA, etc.
-- 2. Asociar cada bottle_type a una categoría.
-- 3. Permitir empty_weight_oz nulo inicialmente, pero volverlo inmutable
--    después de establecerse por primera vez.
-- 4. Impedir cambios al unique_code de una botella física.
-- 5. Marcar si una botella está nueva/cerrada o ya abierta.
-- =============================================================================

create table public.bottle_categories (
  id          uuid primary key default gen_random_uuid(),
  name        text not null unique,
  active      boolean not null default true,
  created_at  timestamptz not null default now()
);

comment on table public.bottle_categories is 'Categorías maestras de botella: TEQUILA, RON, VODKA, etc.';

insert into public.bottle_categories (name, active)
values
  ('TEQUILA', true),
  ('RON', true),
  ('VODKA', true),
  ('WHISKY', true),
  ('GIN', true),
  ('MEZCAL', true),
  ('BRANDY', true),
  ('LICOR', true),
  ('CERVEZA', true),
  ('OTRO', true)
on conflict (name) do nothing;

alter table public.bottle_types
  add column if not exists bottle_category_id uuid;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'bottle_types_bottle_category_id_fkey'
  ) then
    alter table public.bottle_types
      add constraint bottle_types_bottle_category_id_fkey
      foreign key (bottle_category_id)
      references public.bottle_categories (id)
      on delete restrict;
  end if;
end
$$;

update public.bottle_types bt
set bottle_category_id = bc.id
from public.bottle_categories bc
where bc.name = 'OTRO'
  and bt.bottle_category_id is null;

alter table public.bottle_types
  alter column bottle_category_id set not null;

alter table public.bottles
  add column if not exists is_opened boolean not null default false;

comment on column public.bottles.is_opened is 'false = nueva/cerrada, true = abierta.';
comment on column public.bottle_types.empty_weight_oz is 'Puede capturarse después; una vez definido por primera vez ya no puede modificarse.';
comment on column public.bottles.unique_code is 'Código físico único de la botella; es inmutable después del alta.';

create or replace function public.prevent_empty_weight_oz_changes()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if old.empty_weight_oz is not null
     and new.empty_weight_oz is distinct from old.empty_weight_oz then
    raise exception 'empty_weight_oz no puede modificarse una vez establecido';
  end if;

  return new;
end;
$$;

drop trigger if exists trg_bottle_types_empty_weight_lock on public.bottle_types;

create trigger trg_bottle_types_empty_weight_lock
  before update on public.bottle_types
  for each row execute function public.prevent_empty_weight_oz_changes();

create or replace function public.prevent_bottle_unique_code_changes()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.unique_code is distinct from old.unique_code then
    raise exception 'unique_code no puede modificarse después de crear la botella';
  end if;

  return new;
end;
$$;

drop trigger if exists trg_bottles_unique_code_lock on public.bottles;

create trigger trg_bottles_unique_code_lock
  before update on public.bottles
  for each row execute function public.prevent_bottle_unique_code_changes();

create index if not exists idx_bottle_categories_active
  on public.bottle_categories (active);

create index if not exists idx_bottle_types_bottle_category_id
  on public.bottle_types (bottle_category_id);

alter table public.bottle_categories enable row level security;

drop policy if exists bottle_categories_select on public.bottle_categories;
create policy bottle_categories_select on public.bottle_categories
  for select to authenticated using (true);

drop policy if exists bottle_categories_insert on public.bottle_categories;
create policy bottle_categories_insert on public.bottle_categories
  for insert to authenticated with check (true);

drop policy if exists bottle_categories_update on public.bottle_categories;
create policy bottle_categories_update on public.bottle_categories
  for update to authenticated using (true) with check (true);

drop policy if exists bottle_categories_delete on public.bottle_categories;
create policy bottle_categories_delete on public.bottle_categories
  for delete to authenticated using (public.is_admin());

drop trigger if exists trg_audit_bottle_categories on public.bottle_categories;
create trigger trg_audit_bottle_categories
  after insert or update or delete on public.bottle_categories
  for each row execute function public.audit_trigger();
