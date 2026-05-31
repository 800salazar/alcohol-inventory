-- =============================================================================
-- Fase 2 — Migración 0006: categorías desactivables
-- =============================================================================
-- El catálogo de categorías ahora puede activarse/desactivarse (no se borra,
-- para preservar productos históricos asociados).
-- =============================================================================

alter table public.categories
  add column if not exists active boolean not null default true;

create index if not exists idx_categories_active on public.categories (active);
