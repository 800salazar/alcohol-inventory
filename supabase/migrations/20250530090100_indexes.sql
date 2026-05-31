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
