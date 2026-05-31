-- =============================================================================
-- Seed de DESARROLLO (se ejecuta con `supabase db reset` en local).
-- NO incluir datos sensibles. Datos de demostración para probar la app.
-- =============================================================================
-- Nota: las categorías ya vienen de la migración 0005 (reference_seed).
-- Aquí agregamos tipos de botella, un producto y su receta de ejemplo
-- (Margarita = 1 oz Tequila + 1 oz Triple Sec), siguiendo el ejemplo del spec.
-- =============================================================================

-- --- Tipos de botella de ejemplo --------------------------------------------
insert into public.bottle_types (name, barcode, full_ounces, empty_weight_oz, active)
values
  ('Tequila Blanco 750ml',  '7501000000011', 25.36, 17.6, true),
  ('Triple Sec 750ml',      '7501000000028', 25.36, 17.6, true),
  ('Cerveza Lager 355ml',   '7501000000035', 12.00,  6.5, true),
  ('Ron Añejo 1L',          '7501000000042', 33.81, 21.0, true)
on conflict (barcode) do nothing;

-- --- Botellas físicas de ejemplo --------------------------------------------
insert into public.bottles (unique_code, bottle_type_id, status, current_ounces)
select 'BTL-TEQ-0001', id, 'IN_WAREHOUSE', full_ounces
from public.bottle_types where name = 'Tequila Blanco 750ml'
on conflict (unique_code) do nothing;

insert into public.bottles (unique_code, bottle_type_id, status, current_ounces)
select 'BTL-TRP-0001', id, 'IN_BAR', 12.5
from public.bottle_types where name = 'Triple Sec 750ml'
on conflict (unique_code) do nothing;

-- --- Producto + receta de ejemplo: Margarita --------------------------------
insert into public.products (category_id, name, active)
select c.id, 'Margarita', true
from public.categories c
where c.name = 'DRINK'
on conflict (category_id, name) do nothing;

insert into public.recipes (product_id, active)
select p.id, true
from public.products p
where p.name = 'Margarita'
on conflict do nothing;

-- Detalles de la receta: 1 oz de Tequila + 1 oz de Triple Sec.
insert into public.recipe_details (recipe_id, bottle_type_id, ounces)
select r.id, bt.id, 1.0
from public.recipes r
join public.products p on p.id = r.product_id and p.name = 'Margarita'
join public.bottle_types bt on bt.name = 'Tequila Blanco 750ml'
on conflict (recipe_id, bottle_type_id) do nothing;

insert into public.recipe_details (recipe_id, bottle_type_id, ounces)
select r.id, bt.id, 1.0
from public.recipes r
join public.products p on p.id = r.product_id and p.name = 'Margarita'
join public.bottle_types bt on bt.name = 'Triple Sec 750ml'
on conflict (recipe_id, bottle_type_id) do nothing;
