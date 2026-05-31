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
