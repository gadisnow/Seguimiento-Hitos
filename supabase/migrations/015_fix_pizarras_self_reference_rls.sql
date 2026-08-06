-- =====================================================================
-- 015_fix_pizarras_self_reference_rls.sql
-- Bug real (confirmado con pruebas manuales contra el proyecto de test):
-- crear una pizarra vía INSERT ... RETURNING fallaba con "new row
-- violates row-level security policy for table pizarras" pese a que el
-- WITH CHECK de pizarras_insert pasaba. Causa: pizarras_select llamaba a
-- is_board_creator(id)/can_view_board(id), que vuelven a hacer un SELECT
-- sobre la MISMA tabla pizarras para resolver "soy el creador de esta
-- fila". Ese re-SELECT no ve la fila que el propio INSERT acaba de
-- escribir en el mismo statement (auto-referencia), asi que la recheck
-- de RLS sobre el RETURNING siempre daba false para una pizarra recien
-- creada. Marcar is_board_creator VOLATILE (014) no alcanza: el problema
-- no es de planificacion/cacheo sino de que la fila nueva no es visible
-- via una sub-consulta indirecta a la misma tabla dentro del mismo
-- comando.
--
-- Fix: para pizarras (unica tabla donde "soy el creador" es una columna
-- propia, no una FK indirecta a otra tabla) las politicas de
-- select/update/delete comparan directamente contra la columna
-- creador_id de la fila candidata en vez de volver a consultar
-- pizarras. is_board_creator()/can_view_board() siguen existiendo tal
-- cual y se siguen usando sin problemas en el resto de las tablas
-- (temas, hitos, responsables, etc.), donde "pizarra_id" apunta a una
-- fila de pizarras que YA existia antes del statement actual.
-- =====================================================================
drop policy pizarras_select on public.pizarras;
create policy pizarras_select on public.pizarras
  for select using (
    public.is_approved_user() and (
      creador_id = auth.uid()
      or exists (
        select 1 from public.pizarra_colaboradores pc
        where pc.pizarra_id = pizarras.id and pc.usuario_id = auth.uid() and pc.estado = 'aceptada'
      )
    )
  );

drop policy pizarras_update on public.pizarras;
create policy pizarras_update on public.pizarras
  for update using (public.is_approved_user() and creador_id = auth.uid())
  with check (public.is_approved_user() and creador_id = auth.uid());

drop policy pizarras_delete on public.pizarras;
create policy pizarras_delete on public.pizarras
  for delete using (public.is_approved_user() and creador_id = auth.uid());
