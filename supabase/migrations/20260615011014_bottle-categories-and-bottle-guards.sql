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
