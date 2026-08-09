-- =====================================================================
-- 019_board_scope_composite_keys.sql
-- Permite que cada pizarra tenga su propia numeracion de temas/hitos
-- (T-001, H-001-1 repetibles ENTRE pizarras) en vez de una secuencia
-- global compartida. temas.id y hitos.id dejan de ser PK por si solos y
-- pasan a ser PK compuesta (pizarra_id, id): unica DENTRO de cada
-- pizarra, no en toda la tabla.
-- =====================================================================

-- ---------------------------------------------------------------------
-- 1) pizarra_id en las tablas hijas de temas/hitos (hoy solo llegan a su
--    pizarra indirectamente via tema_id/hito_id/expediente_numero)
-- ---------------------------------------------------------------------
alter table public.hitos        add column if not exists pizarra_id uuid;
alter table public.comentarios  add column if not exists pizarra_id uuid;
alter table public.activity_log add column if not exists pizarra_id uuid;
alter table public.documentos   add column if not exists pizarra_id uuid;

update public.hitos h set pizarra_id = t.pizarra_id
  from public.temas t where h.tema_id = t.id and h.pizarra_id is null;

update public.comentarios c set pizarra_id = t.pizarra_id
  from public.temas t where c.tema_id = t.id and c.pizarra_id is null;

update public.activity_log a set pizarra_id = t.pizarra_id
  from public.temas t where a.tema_id = t.id and a.pizarra_id is null;

update public.documentos d set pizarra_id = t.pizarra_id
  from public.temas t where d.tema_id = t.id and d.pizarra_id is null;
update public.documentos d set pizarra_id = h.pizarra_id
  from public.hitos h where d.hito_id = h.id and d.pizarra_id is null;
update public.documentos d set pizarra_id = e.pizarra_id
  from public.expedientes e where d.expediente_numero = e.numero and d.pizarra_id is null;

-- hitos/comentarios siempre cuelgan de un tema (tema_id not null en ambas)
-- -> pizarra_id queda siempre resuelto, se exige not null.
alter table public.hitos       alter column pizarra_id set not null;
alter table public.comentarios alter column pizarra_id set not null;
-- activity_log.tema_id y documentos.* son nullable (un documento puede
-- colgar solo de un expediente) -> pizarra_id queda nullable ahi.

alter table public.hitos        add constraint hitos_pizarra_id_fkey        foreign key (pizarra_id) references public.pizarras(id) on delete cascade;
alter table public.comentarios  add constraint comentarios_pizarra_id_fkey  foreign key (pizarra_id) references public.pizarras(id) on delete cascade;
alter table public.activity_log add constraint activity_log_pizarra_id_fkey foreign key (pizarra_id) references public.pizarras(id) on delete cascade;
alter table public.documentos   add constraint documentos_pizarra_id_fkey   foreign key (pizarra_id) references public.pizarras(id) on delete cascade;

create index if not exists idx_hitos_pizarra       on public.hitos(pizarra_id);
create index if not exists idx_comentarios_pizarra on public.comentarios(pizarra_id);
create index if not exists idx_activity_pizarra    on public.activity_log(pizarra_id);
create index if not exists idx_documentos_pizarra  on public.documentos(pizarra_id);

-- ---------------------------------------------------------------------
-- 2) Politicas RLS actuales: dependen de can_view_tema/documento_pizarra_*
--    (y estas de tema_pizarra_id/hito_tema_id) -- hay que tirarlas abajo
--    antes de poder cambiar la firma de esas funciones.
-- ---------------------------------------------------------------------
drop policy temas_select on public.temas;
drop policy hitos_select on public.hitos;
drop policy hitos_insert on public.hitos;
drop policy hitos_update on public.hitos;
drop policy hitos_delete on public.hitos;
drop policy comentarios_select on public.comentarios;
drop policy comentarios_insert on public.comentarios;
drop policy comentarios_update on public.comentarios;
drop policy comentarios_delete on public.comentarios;
drop policy activity_select on public.activity_log;
drop policy activity_insert on public.activity_log;
drop policy activity_delete on public.activity_log;
drop policy documentos_select on public.documentos;
drop policy documentos_insert on public.documentos;
drop policy documentos_delete on public.documentos;

-- ---------------------------------------------------------------------
-- 3) Drop de FKs simples viejas hacia temas(id)/hitos(id)
-- ---------------------------------------------------------------------
alter table public.hitos        drop constraint hitos_tema_id_fkey;
alter table public.hitos        drop constraint hitos_predecesor_id_fkey;
alter table public.comentarios  drop constraint comentarios_tema_id_fkey;
alter table public.comentarios  drop constraint comentarios_hito_id_fkey;
alter table public.activity_log drop constraint activity_log_tema_id_fkey;
alter table public.documentos   drop constraint documentos_tema_id_fkey;
alter table public.documentos   drop constraint documentos_hito_id_fkey;

-- ---------------------------------------------------------------------
-- 4) PK compuesta en temas/hitos: unica POR pizarra, no global
-- ---------------------------------------------------------------------
alter table public.temas drop constraint temas_pkey;
alter table public.temas add primary key (pizarra_id, id);

alter table public.hitos drop constraint hitos_pkey;
alter table public.hitos add primary key (pizarra_id, id);

-- ---------------------------------------------------------------------
-- 5) FKs compuestas nuevas contra las PK compuestas
-- ---------------------------------------------------------------------
alter table public.hitos add constraint hitos_tema_fkey
  foreign key (pizarra_id, tema_id) references public.temas(pizarra_id, id) on delete cascade;
alter table public.hitos add constraint hitos_predecesor_fkey
  foreign key (pizarra_id, predecesor_id) references public.hitos(pizarra_id, id) on delete set null (predecesor_id);

alter table public.comentarios add constraint comentarios_tema_fkey
  foreign key (pizarra_id, tema_id) references public.temas(pizarra_id, id) on delete cascade;
alter table public.comentarios add constraint comentarios_hito_fkey
  foreign key (pizarra_id, hito_id) references public.hitos(pizarra_id, id) on delete set null (hito_id);

alter table public.activity_log add constraint activity_log_tema_fkey
  foreign key (pizarra_id, tema_id) references public.temas(pizarra_id, id) on delete cascade;

alter table public.documentos add constraint documentos_tema_fkey
  foreign key (pizarra_id, tema_id) references public.temas(pizarra_id, id) on delete cascade;
alter table public.documentos add constraint documentos_hito_fkey
  foreign key (pizarra_id, hito_id) references public.hitos(pizarra_id, id) on delete cascade;

-- ---------------------------------------------------------------------
-- 6) Funciones de seguridad: ya no pueden resolver "de que pizarra es
--    este tema/hito" buscando solo por id (ahora repetible entre
--    pizarras) -- reciben pizarra_id explicito (columna ya presente en
--    la fila que dispara la politica) en vez de adivinarlo con un select
--    que, con id repetido, devolveria una fila cualquiera de las que
--    matchean.
-- ---------------------------------------------------------------------
drop function public.documento_pizarra_editable(text, text, text);
drop function public.documento_pizarra_visible(text, text, text);
drop function public.can_view_tema(text);
drop function public.tema_pizarra_id(text);
drop function public.hito_tema_id(text);

create function public.can_view_tema(p_pizarra_id uuid, p_tema_id text)
returns boolean language sql stable security definer set search_path = public as $$
  select case when t.privado then public.is_board_creator(t.pizarra_id)
              else public.can_view_board(t.pizarra_id) end
  from public.temas t where t.pizarra_id = p_pizarra_id and t.id = p_tema_id;
$$;

create function public.documento_pizarra_visible(p_pizarra_id uuid, p_tema_id text, p_hito_id text, p_expediente_numero text)
returns boolean language sql stable security definer set search_path = public as $$
  select case
    when p_tema_id is not null then public.can_view_tema(p_pizarra_id, p_tema_id)
    when p_hito_id is not null then public.can_view_tema(p_pizarra_id,
      (select tema_id from public.hitos where pizarra_id = p_pizarra_id and id = p_hito_id))
    when p_expediente_numero is not null then public.can_view_board(p_pizarra_id)
    else false
  end;
$$;

create function public.documento_pizarra_editable(p_pizarra_id uuid, p_tema_id text, p_hito_id text, p_expediente_numero text)
returns boolean language sql stable security definer set search_path = public as $$
  select public.can_edit_board(p_pizarra_id)
     and public.documento_pizarra_visible(p_pizarra_id, p_tema_id, p_hito_id, p_expediente_numero);
$$;

-- ---------------------------------------------------------------------
-- 7) Politicas de vuelta, usando pizarra_id de la propia fila (columna
--    directa, sin ambiguedad) en vez de derivarlo desde un id de texto.
-- ---------------------------------------------------------------------
create policy temas_select on public.temas
  for select using (public.is_approved_user() and public.can_view_tema(pizarra_id, id));

create policy hitos_select on public.hitos
  for select using (public.is_approved_user() and public.can_view_tema(pizarra_id, tema_id));
create policy hitos_insert on public.hitos
  for insert with check (public.is_approved_user() and public.can_edit_board(pizarra_id));
create policy hitos_update on public.hitos
  for update using (public.is_approved_user() and public.can_edit_board(pizarra_id))
  with check (public.is_approved_user() and public.can_edit_board(pizarra_id));
create policy hitos_delete on public.hitos
  for delete using (public.is_approved_user() and public.is_board_creator(pizarra_id));

create policy comentarios_select on public.comentarios
  for select using (public.is_approved_user() and public.can_view_tema(pizarra_id, tema_id));
create policy comentarios_insert on public.comentarios
  for insert with check (
    public.is_approved_user() and public.can_edit_board(pizarra_id) and user_id = auth.uid()
  );
create policy comentarios_update on public.comentarios
  for update using (public.is_board_creator(pizarra_id) or user_id = auth.uid())
  with check (public.is_board_creator(pizarra_id) or user_id = auth.uid());
create policy comentarios_delete on public.comentarios
  for delete using (public.is_board_creator(pizarra_id) or user_id = auth.uid());

create policy activity_select on public.activity_log
  for select using (public.is_approved_user() and public.can_view_tema(pizarra_id, tema_id));
create policy activity_insert on public.activity_log
  for insert with check (public.is_approved_user() and public.can_edit_board(pizarra_id));
create policy activity_delete on public.activity_log
  for delete using (public.is_board_creator(pizarra_id));

create policy documentos_select on public.documentos
  for select using (
    public.is_approved_user() and public.documento_pizarra_visible(pizarra_id, tema_id, hito_id, expediente_numero)
  );
create policy documentos_insert on public.documentos
  for insert with check (
    public.is_approved_user()
    and public.documento_pizarra_editable(pizarra_id, tema_id, hito_id, expediente_numero)
    and uploaded_by = auth.uid()
  );
create policy documentos_delete on public.documentos
  for delete using (
    public.is_approved_user()
    and (uploaded_by = auth.uid() or public.documento_pizarra_editable(pizarra_id, tema_id, hito_id, expediente_numero))
  );
