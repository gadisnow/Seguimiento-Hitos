-- =====================================================================
-- 012_rls_board_scope.sql
-- Reescribe las políticas de responsables/temas/hitos/expedientes/
-- comentarios/activity_log/documentos/etiquetas para quedar acotadas
-- por pizarra, y agrega políticas nuevas sobre pizarras/
-- pizarra_colaboradores/columnas.
-- is_admin()/can_edit()/is_approved_user() (globales) NO se tocan: siguen
-- gobernando exclusivamente la aprobación de usuarios a nivel plataforma.
-- =====================================================================

alter table public.pizarras enable row level security;
alter table public.pizarra_colaboradores enable row level security;
alter table public.columnas enable row level security;

-- ---------------- pizarras -------------------------------------------
create policy pizarras_select on public.pizarras
  for select using (public.is_approved_user() and public.can_view_board(id));
create policy pizarras_insert on public.pizarras
  for insert with check (public.is_approved_user() and creador_id = auth.uid());
create policy pizarras_update on public.pizarras
  for update using (public.is_approved_user() and public.is_board_creator(id))
  with check (public.is_approved_user() and public.is_board_creator(id));
create policy pizarras_delete on public.pizarras
  for delete using (public.is_approved_user() and public.is_board_creator(id));

-- ---------------- pizarra_colaboradores -------------------------------
create policy pc_select on public.pizarra_colaboradores
  for select using (usuario_id = auth.uid() or public.is_board_creator(pizarra_id));
create policy pc_insert on public.pizarra_colaboradores
  for insert with check (public.is_board_creator(pizarra_id));
create policy pc_update_creator on public.pizarra_colaboradores
  for update using (public.is_board_creator(pizarra_id)) with check (public.is_board_creator(pizarra_id));
create policy pc_update_self on public.pizarra_colaboradores
  for update using (usuario_id = auth.uid()) with check (usuario_id = auth.uid());
create policy pc_delete on public.pizarra_colaboradores
  for delete using (public.is_board_creator(pizarra_id) or usuario_id = auth.uid());

-- ---------------- columnas --------------------------------------------
create policy columnas_select on public.columnas
  for select using (public.is_approved_user() and public.can_view_board(pizarra_id));
create policy columnas_insert on public.columnas
  for insert with check (public.is_approved_user() and public.can_edit_board(pizarra_id));
create policy columnas_update on public.columnas
  for update using (public.is_approved_user() and public.can_edit_board(pizarra_id))
  with check (public.is_approved_user() and public.can_edit_board(pizarra_id));
create policy columnas_delete on public.columnas
  for delete using (public.is_approved_user() and public.can_edit_board(pizarra_id));

-- ---------------- responsables ------------------------------------------
drop policy responsables_select on public.responsables;
create policy responsables_select on public.responsables
  for select using (public.is_approved_user() and public.can_view_board(pizarra_id));

drop policy responsables_write on public.responsables;
create policy responsables_write on public.responsables
  for insert with check (public.is_approved_user() and public.can_edit_board(pizarra_id));

drop policy responsables_update on public.responsables;
create policy responsables_update on public.responsables
  for update using (public.is_approved_user() and public.can_edit_board(pizarra_id))
  with check (public.is_approved_user() and public.can_edit_board(pizarra_id));

drop policy responsables_delete on public.responsables;
create policy responsables_delete on public.responsables
  for delete using (public.is_approved_user() and public.is_board_creator(pizarra_id));

-- ---------------- temas ---------------------------------------------
drop policy temas_select on public.temas;
create policy temas_select on public.temas
  for select using (public.is_approved_user() and public.can_view_tema(id));

drop policy temas_insert on public.temas;
create policy temas_insert on public.temas
  for insert with check (public.is_approved_user() and public.can_edit_board(pizarra_id));

drop policy temas_update on public.temas;
create policy temas_update on public.temas
  for update using (public.is_approved_user() and public.can_edit_board(pizarra_id))
  with check (public.is_approved_user() and public.can_edit_board(pizarra_id));

drop policy temas_delete on public.temas;
create policy temas_delete on public.temas
  for delete using (public.is_approved_user() and public.is_board_creator(pizarra_id));

-- ---------------- hitos ---------------------------------------------
drop policy hitos_select on public.hitos;
create policy hitos_select on public.hitos
  for select using (public.is_approved_user() and public.can_view_tema(tema_id));

drop policy hitos_insert on public.hitos;
create policy hitos_insert on public.hitos
  for insert with check (public.is_approved_user() and public.can_edit_board(public.tema_pizarra_id(tema_id)));

drop policy hitos_update on public.hitos;
create policy hitos_update on public.hitos
  for update using (public.is_approved_user() and public.can_edit_board(public.tema_pizarra_id(tema_id)))
  with check (public.is_approved_user() and public.can_edit_board(public.tema_pizarra_id(tema_id)));

drop policy hitos_delete on public.hitos;
create policy hitos_delete on public.hitos
  for delete using (public.is_approved_user() and public.is_board_creator(public.tema_pizarra_id(tema_id)));

-- ---------------- expedientes ---------------------------------------
drop policy expedientes_select on public.expedientes;
create policy expedientes_select on public.expedientes
  for select using (public.is_approved_user() and public.can_view_board(pizarra_id));

drop policy expedientes_insert on public.expedientes;
create policy expedientes_insert on public.expedientes
  for insert with check (public.is_approved_user() and public.can_edit_board(pizarra_id));

drop policy expedientes_update on public.expedientes;
create policy expedientes_update on public.expedientes
  for update using (public.is_approved_user() and public.can_edit_board(pizarra_id))
  with check (public.is_approved_user() and public.can_edit_board(pizarra_id));

drop policy expedientes_delete on public.expedientes;
create policy expedientes_delete on public.expedientes
  for delete using (public.is_approved_user() and public.is_board_creator(pizarra_id));

-- ---------------- comentarios ---------------------------------------
drop policy comentarios_select on public.comentarios;
create policy comentarios_select on public.comentarios
  for select using (public.is_approved_user() and public.can_view_tema(tema_id));

drop policy comentarios_insert on public.comentarios;
create policy comentarios_insert on public.comentarios
  for insert with check (
    public.is_approved_user()
    and public.can_edit_board(public.tema_pizarra_id(tema_id))
    and user_id = auth.uid()
  );

drop policy comentarios_delete on public.comentarios;
create policy comentarios_delete on public.comentarios
  for delete using (
    public.is_board_creator(public.tema_pizarra_id(tema_id)) or user_id = auth.uid()
  );

-- ---------------- activity_log --------------------------------------
drop policy activity_select on public.activity_log;
create policy activity_select on public.activity_log
  for select using (public.is_approved_user() and public.can_view_tema(tema_id));

drop policy activity_insert on public.activity_log;
create policy activity_insert on public.activity_log
  for insert with check (public.is_approved_user() and public.can_edit_board(public.tema_pizarra_id(tema_id)));

drop policy activity_delete on public.activity_log;
create policy activity_delete on public.activity_log
  for delete using (public.is_board_creator(public.tema_pizarra_id(tema_id)));

-- ---------------- documentos ----------------------------------------
drop policy documentos_select on public.documentos;
create policy documentos_select on public.documentos
  for select using (
    public.is_approved_user()
    and public.documento_pizarra_visible(tema_id, hito_id, expediente_numero)
  );

drop policy documentos_insert on public.documentos;
create policy documentos_insert on public.documentos
  for insert with check (
    public.is_approved_user()
    and public.documento_pizarra_editable(tema_id, hito_id, expediente_numero)
    and uploaded_by = auth.uid()
  );

drop policy documentos_delete on public.documentos;
create policy documentos_delete on public.documentos
  for delete using (
    public.is_approved_user()
    and (uploaded_by = auth.uid() or public.documento_pizarra_editable(tema_id, hito_id, expediente_numero))
  );

-- ---------------- etiquetas (ahora por pizarra, no global) -----------
drop index if exists idx_etiquetas_nombre;
create unique index idx_etiquetas_pizarra_nombre on public.etiquetas (pizarra_id, lower(nombre));

drop policy etiquetas_select on public.etiquetas;
create policy etiquetas_select on public.etiquetas
  for select using (public.is_approved_user() and public.can_view_board(pizarra_id));

drop policy etiquetas_insert on public.etiquetas;
create policy etiquetas_insert on public.etiquetas
  for insert with check (public.is_approved_user() and public.can_edit_board(pizarra_id));

drop policy etiquetas_update on public.etiquetas;
create policy etiquetas_update on public.etiquetas
  for update using (public.is_approved_user() and public.can_edit_board(pizarra_id))
  with check (public.is_approved_user() and public.can_edit_board(pizarra_id));

drop policy etiquetas_delete on public.etiquetas;
create policy etiquetas_delete on public.etiquetas
  for delete using (public.is_approved_user() and public.is_board_creator(pizarra_id));
