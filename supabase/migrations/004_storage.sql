-- =====================================================================
-- 004_storage.sql
-- Bucket privado 'documentos' + políticas de acceso sobre storage.objects.
-- El acceso a archivos se hace con signed URLs generadas desde el cliente
-- autenticado; el bucket NO es público.
-- =====================================================================

insert into storage.buckets (id, name, public)
values ('documentos', 'documentos', false)
on conflict (id) do nothing;

-- Lectura: cualquier usuario aprobado y activo.
drop policy if exists documentos_storage_read on storage.objects;
create policy documentos_storage_read on storage.objects
  for select using (bucket_id = 'documentos' and public.is_approved_user());

-- Subida: Editor o Admin.
drop policy if exists documentos_storage_insert on storage.objects;
create policy documentos_storage_insert on storage.objects
  for insert with check (bucket_id = 'documentos' and public.can_edit());

-- Actualización: Editor o Admin.
drop policy if exists documentos_storage_update on storage.objects;
create policy documentos_storage_update on storage.objects
  for update using (bucket_id = 'documentos' and public.can_edit());

-- Borrado: Admin, o el propio uploader.
drop policy if exists documentos_storage_delete on storage.objects;
create policy documentos_storage_delete on storage.objects
  for delete using (
    bucket_id = 'documentos' and (public.is_admin() or owner = auth.uid())
  );
