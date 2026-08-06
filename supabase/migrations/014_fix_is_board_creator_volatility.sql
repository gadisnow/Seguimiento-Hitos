-- =====================================================================
-- 014_fix_is_board_creator_volatility.sql
-- Corrige la volatilidad de is_board_creator (ver detalle completo del
-- bug en 015_fix_pizarras_self_reference_rls.sql). VOLATILE por si solo
-- no resuelve el bug de auto-referencia (eso lo arregla 015), pero es la
-- volatilidad semanticamente correcta para una funcion de autorizacion
-- invocada desde politicas RLS: no debe cachear resultados entre filas.
-- =====================================================================
create or replace function public.is_board_creator(p_pizarra_id uuid)
returns boolean language sql volatile security definer set search_path = public as $$
  select exists(
    select 1 from public.pizarras where id = p_pizarra_id and creador_id = auth.uid()
  );
$$;
