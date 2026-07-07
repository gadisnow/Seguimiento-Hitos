-- =====================================================================
-- 003_rls_policies.sql
-- Row Level Security en todas las tablas.
--   Viewer : solo lectura (usuarios aprobados y activos).
--   Editor : lectura + crear/editar (no eliminar, no usuarios).
--   Admin  : todo + eliminar + administrar usuarios.
-- =====================================================================

alter table public.profiles    enable row level security;
alter table public.responsables enable row level security;
alter table public.temas       enable row level security;
alter table public.hitos       enable row level security;
alter table public.expedientes enable row level security;
alter table public.comentarios enable row level security;
alter table public.activity_log enable row level security;
alter table public.documentos  enable row level security;

-- ---------------- profiles ------------------------------------------
drop policy if exists profiles_select on public.profiles;
create policy profiles_select on public.profiles
  for select using (id = auth.uid() or public.is_admin());

drop policy if exists profiles_insert on public.profiles;
create policy profiles_insert on public.profiles
  for insert with check (public.is_admin());

-- Un usuario puede actualizar su propia fila (el trigger
-- protect_profile_privileges impide que cambie rol/aprobado/activo);
-- un Admin puede actualizar cualquiera.
drop policy if exists profiles_update_self on public.profiles;
create policy profiles_update_self on public.profiles
  for update using (id = auth.uid()) with check (id = auth.uid());

drop policy if exists profiles_update_admin on public.profiles;
create policy profiles_update_admin on public.profiles
  for update using (public.is_admin()) with check (public.is_admin());

drop policy if exists profiles_delete on public.profiles;
create policy profiles_delete on public.profiles
  for delete using (public.is_admin() and id <> auth.uid());

-- ---------------- responsables --------------------------------------
drop policy if exists responsables_select on public.responsables;
create policy responsables_select on public.responsables
  for select using (public.is_approved_user());

drop policy if exists responsables_write on public.responsables;
create policy responsables_write on public.responsables
  for insert with check (public.can_edit());

drop policy if exists responsables_update on public.responsables;
create policy responsables_update on public.responsables
  for update using (public.can_edit()) with check (public.can_edit());

drop policy if exists responsables_delete on public.responsables;
create policy responsables_delete on public.responsables
  for delete using (public.is_admin());

-- ---------------- temas ---------------------------------------------
drop policy if exists temas_select on public.temas;
create policy temas_select on public.temas
  for select using (
    public.is_approved_user()
    and (privado = false or creado_por = auth.uid() or public.is_admin())
  );

drop policy if exists temas_insert on public.temas;
create policy temas_insert on public.temas
  for insert with check (public.can_edit());

drop policy if exists temas_update on public.temas;
create policy temas_update on public.temas
  for update using (public.can_edit()) with check (public.can_edit());

drop policy if exists temas_delete on public.temas;
create policy temas_delete on public.temas
  for delete using (public.is_admin());

-- ---------------- hitos ---------------------------------------------
drop policy if exists hitos_select on public.hitos;
create policy hitos_select on public.hitos
  for select using (
    public.is_approved_user()
    and exists (
      select 1 from public.temas t
      where t.id = hitos.tema_id
        and (t.privado = false or t.creado_por = auth.uid() or public.is_admin())
    )
  );

drop policy if exists hitos_insert on public.hitos;
create policy hitos_insert on public.hitos
  for insert with check (public.can_edit());

drop policy if exists hitos_update on public.hitos;
create policy hitos_update on public.hitos
  for update using (public.can_edit()) with check (public.can_edit());

drop policy if exists hitos_delete on public.hitos;
create policy hitos_delete on public.hitos
  for delete using (public.is_admin());

-- ---------------- expedientes ---------------------------------------
drop policy if exists expedientes_select on public.expedientes;
create policy expedientes_select on public.expedientes
  for select using (public.is_approved_user());

drop policy if exists expedientes_insert on public.expedientes;
create policy expedientes_insert on public.expedientes
  for insert with check (public.can_edit());

drop policy if exists expedientes_update on public.expedientes;
create policy expedientes_update on public.expedientes
  for update using (public.can_edit()) with check (public.can_edit());

drop policy if exists expedientes_delete on public.expedientes;
create policy expedientes_delete on public.expedientes
  for delete using (public.is_admin());

-- ---------------- comentarios ---------------------------------------
drop policy if exists comentarios_select on public.comentarios;
create policy comentarios_select on public.comentarios
  for select using (
    public.is_approved_user()
    and exists (
      select 1 from public.temas t
      where t.id = comentarios.tema_id
        and (t.privado = false or t.creado_por = auth.uid() or public.is_admin())
    )
  );

drop policy if exists comentarios_insert on public.comentarios;
create policy comentarios_insert on public.comentarios
  for insert with check (public.can_edit() and user_id = auth.uid());

drop policy if exists comentarios_delete on public.comentarios;
create policy comentarios_delete on public.comentarios
  for delete using (public.is_admin() or user_id = auth.uid());

-- ---------------- activity_log --------------------------------------
drop policy if exists activity_select on public.activity_log;
create policy activity_select on public.activity_log
  for select using (public.is_approved_user());

drop policy if exists activity_insert on public.activity_log;
create policy activity_insert on public.activity_log
  for insert with check (public.can_edit());

drop policy if exists activity_delete on public.activity_log;
create policy activity_delete on public.activity_log
  for delete using (public.is_admin());

-- ---------------- documentos ----------------------------------------
drop policy if exists documentos_select on public.documentos;
create policy documentos_select on public.documentos
  for select using (public.is_approved_user());

drop policy if exists documentos_insert on public.documentos;
create policy documentos_insert on public.documentos
  for insert with check (public.can_edit() and uploaded_by = auth.uid());

drop policy if exists documentos_delete on public.documentos;
create policy documentos_delete on public.documentos
  for delete using (public.is_admin() or uploaded_by = auth.uid());
