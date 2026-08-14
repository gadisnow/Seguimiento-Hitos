-- ---------------------------------------------------------------------
-- 029_fix_storage_owner_id_column.sql
-- 028_fix_storage_read_owner_bypass.sql agrego "owner = auth.uid()" para
-- que el dueno de un objeto recien subido siempre lo pueda ver (evitando
-- el problema de huevo-y-gallina con la fila de documentos que todavia
-- no existe). Pero en storage.objects hay DOS columnas de dueno: `owner`
-- (uuid, legacy) y `owner_id` (text) -- esta version de storage-api deja
-- `owner` en NULL y solo completa `owner_id` (uuid como texto), asi que
-- la condicion anterior nunca matcheaba y la subida seguia rechazada.
-- Se chequean ambas columnas para no depender de cual usa esta version.
-- ---------------------------------------------------------------------

drop policy if exists documentos_storage_read on storage.objects;
create policy documentos_storage_read on storage.objects
  for select using (
    bucket_id = 'documentos'
    and public.is_approved_user()
    and (
      owner = auth.uid()
      or owner_id = auth.uid()::text
      or exists (
        select 1 from public.documentos d
        where d.storage_path = storage.objects.name
          and public.documento_pizarra_visible(d.pizarra_id, d.tema_id, d.hito_id, d.expediente_numero)
      )
    )
  );
