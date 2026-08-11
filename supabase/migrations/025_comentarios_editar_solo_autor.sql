-- =====================================================================
-- 025_comentarios_editar_solo_autor.sql
-- Solo quien escribio un comentario puede editarlo -- ni el creador de la
-- pizarra ni un Admin tienen ese permiso sobre comentarios ajenos (antes
-- comentarios_update dejaba editar tambien al dueno de la pizarra, igual
-- que borrar). Borrar SI sigue permitido al dueno (moderacion: puede
-- sacar un comentario ajeno, pero no reescribirlo) -- comentarios_delete
-- no se toca.
-- =====================================================================

drop policy comentarios_update on public.comentarios;
create policy comentarios_update on public.comentarios
  for update using (user_id = auth.uid())
  with check (user_id = auth.uid());
