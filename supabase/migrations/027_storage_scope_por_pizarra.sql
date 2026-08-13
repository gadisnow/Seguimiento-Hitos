-- ---------------------------------------------------------------------
-- 027_storage_scope_por_pizarra.sql
-- La politica de lectura del bucket 'documentos' (004_storage.sql) solo
-- chequeaba is_approved_user() -- valido cuando cada tema/hito tenia un id
-- global unico, pero 019_board_scope_composite_keys.sql hizo que esos
-- codigos (T-001, H-001-1) se repitan ENTRE pizarras, y la ruta de
-- Storage se arma justamente con ese codigo + un timestamp
-- (ver uploadDocumento en src/dataApi.js: `${relacionadoTipo}/${scope}/...`).
-- Resultado: cualquier usuario aprobado de CUALQUIER pizarra podia pedir
-- una signed URL de un documento de OTRA pizarra a la que no tiene
-- acceso (o de un tema privado), adivinando/probando esa ruta de baja
-- entropia -- la tabla documentos ya valida esto via
-- documento_pizarra_visible() (ver 019), pero el bucket nunca se
-- actualizo para exigir lo mismo.
--
-- Fix: la policy de storage.objects ahora se apoya en la fila real de
-- documentos que referencia ese storage_path, y reusa la misma funcion
-- de visibilidad que ya gobierna la tabla. Es puramente restrictiva --
-- nadie que hoy tiene acceso legitimo lo pierde.
-- ---------------------------------------------------------------------

drop policy if exists documentos_storage_read on storage.objects;
create policy documentos_storage_read on storage.objects
  for select using (
    bucket_id = 'documentos'
    and public.is_approved_user()
    and exists (
      select 1 from public.documentos d
      where d.storage_path = storage.objects.name
        and public.documento_pizarra_visible(d.pizarra_id, d.tema_id, d.hito_id, d.expediente_numero)
    )
  );
