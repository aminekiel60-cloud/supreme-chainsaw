-- The exercise-images bucket also holds guides.json: the steps for the
-- library exercises that aren't bundled in the app (loaded on demand).
update storage.buckets
set allowed_mime_types = array['image/jpeg', 'application/json'], file_size_limit = 2097152
where id = 'exercise-images';
