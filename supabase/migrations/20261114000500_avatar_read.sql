-- Fix: changing your profile picture failed ("new row violates row-level
-- security policy"). Uploading with upsert reads the new file back, and the
-- avatars bucket had no read rule. Viewing avatars by their public link is not
-- affected by this; it only lets you read the files in your own folder.
create policy "avatar read own folder" on storage.objects
  for select to authenticated using (bucket_id = 'avatars' and (storage.foldername(name))[1] = (select auth.uid())::text);
