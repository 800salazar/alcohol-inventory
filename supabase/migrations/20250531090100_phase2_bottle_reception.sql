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
