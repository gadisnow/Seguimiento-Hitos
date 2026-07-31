-- =====================================================================
-- 002_functions_triggers.sql
-- Helpers de permisos (SECURITY DEFINER para evitar recursión de RLS),
-- trigger de creación de profile y triggers de updated_at.
-- =====================================================================

-- ---- Helpers de permisos -------------------------------------------
create or replace function public.is_approved_user()
returns boolean
language sql stable security definer set search_path = public
as $$
  select exists(
    select 1 from public.profiles p
    where p.id = auth.uid() and p.aprobado = true and p.activo = true
  );
$$;

create or replace function public.current_rol()
returns text
language sql stable security definer set search_path = public
as $$
  select rol from public.profiles where id = auth.uid();
$$;

create or replace function public.is_admin()
returns boolean
language sql stable security definer set search_path = public
as $$
  select exists(
    select 1 from public.profiles p
    where p.id = auth.uid() and p.rol = 'Admin' and p.aprobado = true and p.activo = true
  );
$$;

create or replace function public.can_edit()
returns boolean
language sql stable security definer set search_path = public
as $$
  select exists(
    select 1 from public.profiles p
    where p.id = auth.uid() and p.rol in ('Admin','Editor')
      and p.aprobado = true and p.activo = true
  );
$$;

-- ---- Creación automática de profile al registrarse -----------------
-- Los emails de bootstrap quedan como Admin aprobado automáticamente.
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
    case when is_boot then 'Admin' else 'Viewer' end,
    case when is_boot then true else false end,
    true
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ---- Protección de columnas privilegiadas en profiles --------------
-- Un usuario puede editar su propio nombre/datos, pero solo un Admin
-- puede cambiar rol / aprobado / activo.
create or replace function public.protect_profile_privileges()
returns trigger
language plpgsql security definer set search_path = public
as $$
begin
  if not public.is_admin() then
    new.rol      := old.rol;
    new.aprobado := old.aprobado;
    new.activo   := old.activo;
  end if;
  return new;
end;
$$;

drop trigger if exists trg_protect_profile on public.profiles;
create trigger trg_protect_profile
  before update on public.profiles
  for each row execute function public.protect_profile_privileges();

-- ---- updated_at automático -----------------------------------------
create or replace function public.set_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

do $$
declare t text;
begin
  foreach t in array array['profiles','responsables','temas','hitos','expedientes'] loop
    execute format('drop trigger if exists trg_updated_at on public.%I;', t);
    execute format('create trigger trg_updated_at before update on public.%I
                    for each row execute function public.set_updated_at();', t);
  end loop;
end $$;
