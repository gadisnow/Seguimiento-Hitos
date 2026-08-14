-- ---------------------------------------------------------------------
-- 030_restore_storage_insert_update_delete_test.sql
-- El proyecto de test (notby-test) solo tenia la policy de SELECT sobre
-- storage.objects (documentos_storage_read) -- las de INSERT/UPDATE/
-- DELETE de 004_storage.sql nunca quedaron aplicadas ahi (prod si las
-- tiene, verificado). Sin policy de INSERT, storage.objects rechaza
-- cualquier subida por defecto sin importar el rol del usuario -- por
-- eso ninguna subida de documento funcionaba en test. Repone las 3
-- policies faltantes, identicas a como las define 004_storage.sql.
-- ---------------------------------------------------------------------

drop policy if exists documentos_storage_insert on storage.objects;
create policy documentos_storage_insert on storage.objects
  for insert with check (bucket_id = 'documentos' and public.can_edit());

drop policy if exists documentos_storage_update on storage.objects;
create policy documentos_storage_update on storage.objects
  for update using (bucket_id = 'documentos' and public.can_edit());

drop policy if exists documentos_storage_delete on storage.objects;
create policy documentos_storage_delete on storage.objects
  for delete using (
    bucket_id = 'documentos' and (public.is_admin() or owner = auth.uid())
  );
