-- =============================================================================
-- Reset manual del esquema de Inventario Licor
-- =============================================================================
-- Úsalo SOLO si una ejecución manual dejó la base a medio crear y quieres
-- volver a correr `supabase/manual/initial_schema_full.sql` desde cero.
--
-- Este script elimina únicamente los objetos de esta app dentro de `public`
-- y los buckets de storage usados por el proyecto.
-- =============================================================================

-- Storage
-- Supabase no permite borrar objetos de storage directamente por SQL.
-- Si necesitas limpiar estos buckets, hazlo desde Storage en el dashboard
-- o usando la Storage API antes/después de correr este reset.
--
-- Buckets usados por la app:
-- - bottle-images
-- - evidence-images
drop policy if exists "bottle_images_public_read" on storage.objects;
drop policy if exists "bottle_images_auth_insert" on storage.objects;
drop policy if exists "bottle_images_auth_update" on storage.objects;
drop policy if exists "bottle_images_admin_delete" on storage.objects;
drop policy if exists "evidence_images_auth_read" on storage.objects;
drop policy if exists "evidence_images_auth_insert" on storage.objects;
drop policy if exists "evidence_images_admin_delete" on storage.objects;

-- Triggers sobre auth.users creados por la app
drop trigger if exists on_auth_user_updated on auth.users;
drop trigger if exists on_auth_user_created on auth.users;

-- Secuencias de la app
drop sequence if exists public.bottle_code_seq;

-- Tablas de la app
drop table if exists public.sales_details cascade;
drop table if exists public.sales_periods cascade;
drop table if exists public.inventory_movements cascade;
drop table if exists public.inventory_snapshot_details cascade;
drop table if exists public.inventory_snapshots cascade;
drop table if exists public.recipe_details cascade;
drop table if exists public.recipes cascade;
drop table if exists public.products cascade;
drop table if exists public.categories cascade;
drop table if exists public.bottles cascade;
drop table if exists public.bottle_types cascade;
drop table if exists public.bottle_categories cascade;
drop table if exists public.audit_logs cascade;
drop table if exists public.profiles cascade;

-- Funciones de la app
drop function if exists public.capture_initial_inventory(text, jsonb) cascade;
drop function if exists public.log_event(text, text, text, jsonb) cascade;
drop function if exists public.receive_bottles(uuid, integer, public.bottle_status) cascade;
drop function if exists public.prevent_bottle_unique_code_changes() cascade;
drop function if exists public.prevent_empty_weight_oz_changes() cascade;
drop function if exists public.audit_trigger() cascade;
drop function if exists public.prevent_role_escalation() cascade;
drop function if exists public.upsert_auth_user_profile() cascade;
drop function if exists public.handle_new_user() cascade;
drop function if exists public.is_admin() cascade;
drop function if exists public.current_user_role() cascade;
drop function if exists public.set_updated_at() cascade;

-- Tipos enum de la app
drop type if exists public.movement_type cascade;
drop type if exists public.location_type cascade;
drop type if exists public.bottle_status cascade;
drop type if exists public.user_role cascade;
