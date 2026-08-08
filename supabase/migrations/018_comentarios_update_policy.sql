-- =====================================================================
-- 018_comentarios_update_policy.sql
-- comentarios nunca tuvo politica de UPDATE (solo select/insert/delete,
-- ver 003_rls_policies.sql y 012_rls_board_scope.sql) -- la funcion
-- "Editar comentario" de la UI (fase de rediseno del panel de Comentarios)
-- fallaba en silencio por RLS: sin politica que matchee, Postgres deniega
-- por defecto. Mismo criterio que ya usa comentarios_delete: el autor
-- edita el suyo, el creador de la pizarra puede editar cualquiera.
-- =====================================================================

drop policy if exists comentarios_update on public.comentarios;
create policy comentarios_update on public.comentarios
  for update using (
    public.is_board_creator(public.tema_pizarra_id(tema_id)) or user_id = auth.uid()
  )
  with check (
    public.is_board_creator(public.tema_pizarra_id(tema_id)) or user_id = auth.uid()
  );
