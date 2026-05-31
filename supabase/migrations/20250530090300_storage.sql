-- =============================================================================
-- Migración 0004: Supabase Storage — Buckets y políticas
-- =============================================================================
-- bottle-images   -> imágenes de catálogo. Lectura pública, escritura autenticada.
-- evidence-images -> evidencias de operaciones (privadas). Solo autenticados.
-- =============================================================================

insert into storage.buckets (id, name, public)
values
  ('bottle-images', 'bottle-images', true),
  ('evidence-images', 'evidence-images', false)
on conflict (id) do nothing;

-- -----------------------------------------------------------------------------
-- Políticas sobre storage.objects
-- -----------------------------------------------------------------------------

-- bottle-images: lectura pública (cualquiera, incluso anónimo).
create policy "bottle_images_public_read"
  on storage.objects for select
  using (bucket_id = 'bottle-images');

-- bottle-images: subir / actualizar / borrar requiere usuario autenticado.
create policy "bottle_images_auth_insert"
  on storage.objects for insert to authenticated
  with check (bucket_id = 'bottle-images');

create policy "bottle_images_auth_update"
  on storage.objects for update to authenticated
  using (bucket_id = 'bottle-images')
  with check (bucket_id = 'bottle-images');

create policy "bottle_images_admin_delete"
  on storage.objects for delete to authenticated
  using (bucket_id = 'bottle-images' and public.is_admin());

-- evidence-images: todo el acceso requiere autenticación (bucket privado).
create policy "evidence_images_auth_read"
  on storage.objects for select to authenticated
  using (bucket_id = 'evidence-images');

create policy "evidence_images_auth_insert"
  on storage.objects for insert to authenticated
  with check (bucket_id = 'evidence-images');

create policy "evidence_images_admin_delete"
  on storage.objects for delete to authenticated
  using (bucket_id = 'evidence-images' and public.is_admin());
