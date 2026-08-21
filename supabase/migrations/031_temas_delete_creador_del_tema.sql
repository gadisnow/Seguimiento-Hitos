-- ---------------------------------------------------------------------
-- 031_temas_delete_creador_del_tema.sql
-- Eliminar un tema: hasta ahora solo el dueno de la pizarra podia hacerlo
-- (temas_delete de 012_rls_board_scope.sql, using is_board_creator).
-- Se agrega la excepcion pedida: un colaborador tambien puede eliminar
-- un tema puntual si fue el que lo creo -- no cualquier tema del board,
-- solo el suyo. temas.creado_por ya existe (001_initial_schema.sql).
-- ---------------------------------------------------------------------

drop policy if exists temas_delete on public.temas;
create policy temas_delete on public.temas
  for delete using (
    public.is_approved_user()
    and (public.is_board_creator(pizarra_id) or creado_por = auth.uid())
  );
