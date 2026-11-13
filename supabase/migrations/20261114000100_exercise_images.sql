-- Public bucket with how-to photos for the built-in exercises (start and end
-- position). From the public-domain free-exercise-db (github.com/yuhonas/free-exercise-db).
-- Only the project owner uploads; everyone can view through the public URL.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('exercise-images', 'exercise-images', true, 1048576, array['image/jpeg'])
on conflict (id) do nothing;
