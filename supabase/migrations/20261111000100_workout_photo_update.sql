-- Allow re-uploading (upsert) your own workout photos.
create policy "workout photo update own folder" on storage.objects
  for update to authenticated using (bucket_id = 'workout-photos' and (storage.foldername(name))[1] = (select auth.uid())::text);
