-- ---------------------------------------------------------------------
-- 028_fix_storage_read_owner_bypass.sql
-- 027_storage_scope_por_pizarra.sql exige que ya exista una fila en
-- public.documentos para poder leer el objeto de Storage -- pero
-- uploadDocumento() (src/dataApi.js) sube el archivo PRIMERO y recien
-- despues inserta esa fila. En el instante del upload, storage-api hace
-- un INSERT ... RETURNING sobre storage.objects, y Postgres exige que la
-- fila recien insertada tambien pase la policy de SELECT para poder
-- devolverla -- como documentos todavia no tiene la fila, el join no
-- encuentra nada y la policy de 027 la rechaza, rompiendo CUALQUIER
-- subida de documento (no solo el caso cruzado entre pizarras que 027
-- queria cerrar).
--
-- Fix: el dueno del objeto (columna owner, que Storage completa solo con
-- auth.uid() al subir) siempre puede verlo, sin depender de que la fila
-- de documentos ya exista. La restriccion entre pizarras sigue aplicando
-- igual para cualquier OTRO usuario que no sea el dueno.
-- ---------------------------------------------------------------------

drop policy if exists documentos_storage_read on storage.objects;
create policy documentos_storage_read on storage.objects
  for select using (
    bucket_id = 'documentos'
    and public.is_approved_user()
    and (
      owner = auth.uid()
      or exists (
        select 1 from public.documentos d
        where d.storage_path = storage.objects.name
          and public.documento_pizarra_visible(d.pizarra_id, d.tema_id, d.hito_id, d.expediente_numero)
      )
    )
  );
