-- =====================================================================
-- 021_self_serve_signup.sql
-- Autoregistro sin aprobacion de admin: toda cuenta nueva queda aprobada
-- al instante (antes quedaba con aprobado=false hasta que un Admin la
-- revisaba a mano, bloqueando TODO via is_approved_user()) y con su propia
-- pizarra personal ya creada, lista para usar sin depender de que nadie la
-- invite ni la apruebe.
--
-- rol pasa a 'Editor' por defecto (antes 'Viewer'): can_edit_board()/
-- is_board_creator() (board-scoped, migracion 011/012) ya dejaban crear/
-- editar temas en la pizarra propia sin importar el rol global, pero subir
-- archivos sigue gateado por can_edit() GLOBAL en storage.objects (ver
-- 004_storage.sql) -- es la unica policy que quedo sin migrar a board-scope
-- en el 012. Sin este cambio, un usuario nuevo podria crear temas en su
-- propia pizarra pero no adjuntarles ningun documento.
--
-- La pizarra personal se crea DENTRO del trigger (server-side, misma
-- transaccion del insert en auth.users) y no como paso aparte desde el
-- cliente despues del signup: asi existe sin importar si el proyecto tiene
-- mailer_autoconfirm activado (da sesion al toque) o no (requiere click en
-- el mail de confirmacion antes de tener sesion) -- confirmado que
-- produccion y test difieren justo en ese punto.
--
-- Columnas default identicas a COLUMNAS_DEFAULT en src/pizarraApi.js (la
-- funcion que arma cualquier pizarra nueva creada a mano desde la UI) --
-- si se cambia el default ahi, actualizar tambien aca.
-- =====================================================================

create or replace function public.handle_new_user()
returns trigger
language plpgsql security definer set search_path = public
as $$
declare
  admin_emails text[] := array['jorgerios.estudio@gmail.com'];
  is_boot boolean;
  v_nombre text;
  v_pizarra_id uuid;
begin
  is_boot := (lower(new.email) = any (admin_emails));
  v_nombre := coalesce(nullif(new.raw_user_meta_data->>'nombre',''), split_part(new.email,'@',1));

  insert into public.profiles (id, email, nombre, rol, aprobado, activo)
  values (
    new.id,
    new.email,
    v_nombre,
    case when is_boot then 'Admin' else 'Editor' end,
    true,
    true
  )
  on conflict (id) do nothing;

  insert into public.pizarras (nombre, tipo, creador_id)
  values ('Mi pizarra', 'personal', new.id)
  returning id into v_pizarra_id;

  insert into public.columnas (pizarra_id, nombre, es_inicial, es_final, color, orden) values
    (v_pizarra_id, 'Pendiente',    true,  false, 'red',    0),
    (v_pizarra_id, 'En curso',     false, false, 'blue',   1),
    (v_pizarra_id, 'En revision',  false, false, 'violet', 2),
    (v_pizarra_id, 'Bloqueado',    false, false, 'amber',  3),
    (v_pizarra_id, 'Cerrado',      false, true,  'green',  4);

  return new;
end;
$$;

-- ---------------------------------------------------------------------
-- Lista los miembros de una pizarra con su rol, para el panel de
-- "Colaboradores" (estilo compartir de Google Sheets): dueno primero,
-- despues cada colaborador con su permiso/estado. Restringida a quien
-- puede administrar la pizarra (mismo criterio que la UI: solo el dueno
-- abre este panel) -- security definer para poder leer nombre/email de
-- otros perfiles sin pisar el RLS restrictivo de profiles, mismo patron
-- que get_board_members (017_comentarios_hito_feed.sql).
-- ---------------------------------------------------------------------
create or replace function public.list_board_collaborators(p_pizarra_id uuid)
returns table(usuario_id uuid, nombre text, email text, es_propietario boolean, permiso text, estado text)
language sql stable security definer set search_path = public as $$
  select p.id as usuario_id, p.nombre, p.email, true as es_propietario, 'edit'::text as permiso, 'aceptada'::text as estado
  from public.pizarras b
  join public.profiles p on p.id = b.creador_id
  where b.id = p_pizarra_id and public.is_board_creator(p_pizarra_id)
  union all
  select p.id as usuario_id, p.nombre, p.email, false as es_propietario, pc.permiso, pc.estado
  from public.pizarra_colaboradores pc
  join public.profiles p on p.id = pc.usuario_id
  where pc.pizarra_id = p_pizarra_id and public.is_board_creator(p_pizarra_id)
  order by es_propietario desc, nombre asc;
$$;
