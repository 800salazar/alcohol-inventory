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
