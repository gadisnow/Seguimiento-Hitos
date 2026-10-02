-- ---------------------------------------------------------------------
-- 036_notas_grupos_rename.sql
-- Permite renombrar un grupo de notas (035 solo traia crear/borrar).
-- Mismo criterio de permiso que el resto de notas_grupos.
-- ---------------------------------------------------------------------

create policy notas_grupos_update on public.notas_grupos
  for update using (can_edit_board(pizarra_id)) with check (can_edit_board(pizarra_id));
