-- =====================================================================
-- 023_selfheal_missing_profile.sql
-- Bug real encontrado en vivo: hay cuentas en auth.users (viejas, previas
-- a que el trigger handle_new_user quedara estable) que nunca terminaron
-- con fila en profiles -- quedaron huerfanas. Eso las vuelve invisibles
-- para find_collaborator_candidate (solo mira profiles), asi que invitar
-- a esa persona por email caia SIEMPRE en la rama de "no tiene cuenta,
-- le mandamos un correo" aunque su cuenta ya existiera y estuviera
-- confirmada -- y como signInWithOtp sobre un email que YA existe no
-- vuelve a disparar el trigger (solo corre en insert), ese reintento
-- nunca se curaba solo.
--
-- Fix en dos partes:
--  1) ensure_personal_pizarra(): saca a una funcion propia la logica de
--     "crear pizarra personal + 5 columnas default" que handle_new_user
--     (021) ya tenia inline -- se necesita en un segundo lugar (abajo) y
--     duplicarla a mano es como se producen estos bugs de drift.
--  2) find_collaborator_candidate() ahora se autorepara: si no encuentra
--     nada en profiles, busca en auth.users por email: si existe, le crea
--     el profile y la pizarra personal en el momento (mismo criterio que
--     un alta nueva) en vez de devolver null para siempre.
-- =====================================================================

create or replace function public.ensure_personal_pizarra(p_user_id uuid, p_nombre text default 'Mi pizarra')
returns void language plpgsql security definer set search_path = public as $$
declare
  v_pizarra_id uuid;
begin
  if exists (select 1 from public.pizarras where creador_id = p_user_id) then
    return;
  end if;

  insert into public.pizarras (nombre, tipo, creador_id)
  values (p_nombre, 'personal', p_user_id)
  returning id into v_pizarra_id;

  insert into public.columnas (pizarra_id, nombre, es_inicial, es_final, color, orden) values
    (v_pizarra_id, 'Pendiente',    true,  false, 'red',    0),
    (v_pizarra_id, 'En curso',     false, false, 'blue',   1),
    (v_pizarra_id, 'En revision',  false, false, 'violet', 2),
    (v_pizarra_id, 'Bloqueado',    false, false, 'amber',  3),
    (v_pizarra_id, 'Cerrado',      false, true,  'green',  4);
end;
$$;

create or replace function public.handle_new_user()
returns trigger
language plpgsql security definer set search_path = public
as $$
declare
  admin_emails text[] := array['jorgerios.estudio@gmail.com'];
  is_boot boolean;
begin
  is_boot := (lower(new.email) = any (admin_emails));
  insert into public.profiles (id, email, nombre, rol, aprobado, activo)
  values (
    new.id,
    new.email,
    coalesce(nullif(new.raw_user_meta_data->>'nombre',''), split_part(new.email,'@',1)),
    case when is_boot then 'Admin' else 'Editor' end,
    true,
    true
  )
  on conflict (id) do nothing;

  perform public.ensure_personal_pizarra(new.id, 'Mi pizarra');
  return new;
end;
$$;

create or replace function public.find_collaborator_candidate(p_email text)
returns table(id uuid, nombre text, email text)
language plpgsql security definer set search_path = public as $$
#variable_conflict use_column
declare
  admin_emails text[] := array['jorgerios.estudio@gmail.com'];
  v_auth_id uuid;
  v_nombre text;
  v_email text := lower(trim(p_email));
begin
  if not public.is_approved_user() then
    return;
  end if;

  return query
    select p.id, p.nombre, p.email
    from public.profiles p
    where p.aprobado = true and p.activo = true and lower(p.email) = v_email;
  if found then
    return;
  end if;

  -- self-heal: la cuenta de auth existe pero por lo que sea nunca quedo
  -- con profile (dato viejo, carrera rara) -- se la crea ahora con el
  -- mismo criterio que un alta nueva, en vez de dejarla invisible.
  select au.id, coalesce(nullif(au.raw_user_meta_data->>'nombre',''), split_part(au.email,'@',1))
    into v_auth_id, v_nombre
  from auth.users au
  where lower(au.email) = v_email
  limit 1;

  if v_auth_id is null then
    return;
  end if;

  insert into public.profiles (id, email, nombre, rol, aprobado, activo)
  values (v_auth_id, v_email, v_nombre,
          case when v_email = any (admin_emails) then 'Admin' else 'Editor' end,
          true, true)
  on conflict (id) do nothing;

  perform public.ensure_personal_pizarra(v_auth_id, 'Mi pizarra');

  return query select v_auth_id, v_nombre, v_email;
end;
$$;
