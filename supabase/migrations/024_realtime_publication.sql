-- =====================================================================
-- 024_realtime_publication.sql
-- Habilita Supabase Realtime (Postgres Changes) sobre las tablas
-- scopeadas por pizarra que ya trae fetchInitialState (src/dataApi.js),
-- para que los cambios de otros colaboradores se vean en vivo en vez de
-- requerir una accion propia o F5 (ver src/realtimeApi.js y el wiring en
-- app.js). No hace falta tocar RLS (las policies de select ya vigentes
-- son las que Postgres Changes respeta para INSERT/UPDATE) ni
-- REPLICA IDENTITY (default ya resuelve a la PK real, incluida la
-- compuesta pizarra_id+id de temas/hitos desde la migracion 019).
--
-- Fuera de alcance a proposito: pizarra_colaboradores y profiles (los
-- cambios de colaboradores/usuarios no se reflejan en vivo en esta
-- vuelta).
-- =====================================================================

alter publication supabase_realtime add table
  public.pizarras,
  public.columnas,
  public.temas,
  public.hitos,
  public.expedientes,
  public.responsables,
  public.comentarios,
  public.activity_log,
  public.documentos,
  public.etiquetas;
