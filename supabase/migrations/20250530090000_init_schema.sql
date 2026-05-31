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
create type public.user_role as enum ('ADMIN', 'OPERATOR');

create type public.bottle_status as enum (
  'IN_WAREHOUSE',  -- en bodega
  'IN_BAR',        -- en barra
  'SOLD',          -- vendida (botella completa)
  'EMPTY',         -- vacía
  'RETURNED',      -- devuelta
  'LOST'           -- perdida / merma total
);

create type public.location_type as enum (
  'WAREHOUSE',
  'BAR',
  'CUSTOMER',
  'EXTERNAL'
);

create type public.movement_type as enum (
  'WAREHOUSE_TO_BAR',
  'BAR_TO_WAREHOUSE',
  'CUSTOMER_SALE',
  'WASTE',
  'ADJUSTMENT'
);

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
