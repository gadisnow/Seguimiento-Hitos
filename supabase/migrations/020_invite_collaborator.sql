-- =====================================================================
-- 020_invite_collaborator.sql
-- Invitar colaborador a una pizarra por email. El cliente no puede leer
-- profiles por email directo (profiles_select solo deja ver el propio
-- perfil o, si sos admin, todos) -- se resuelve aca, restringido a
-- usuarios aprobados de la plataforma, y solo devuelve perfiles
-- aprobados/activos. Si no matchea nada (no existe, esta pendiente de
-- aprobacion, o esta desactivado) el llamador no distingue el motivo y
-- dispara el flujo de invitacion por email en su lugar (ver
-- invitarColaboradorPorEmail en app.js) -- evita exponer el estado de
-- cuentas ajenas a cualquier usuario aprobado que pruebe emails al azar.
-- =====================================================================
create or replace function public.find_collaborator_candidate(p_email text)
returns table(id uuid, nombre text, email text)
language sql stable security definer set search_path = public as $$
  select p.id, p.nombre, p.email
  from public.profiles p
  where public.is_approved_user()
    and p.aprobado = true and p.activo = true
    and lower(p.email) = lower(trim(p_email));
$$;
