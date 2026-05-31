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
