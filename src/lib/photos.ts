/**
 * Photo helpers: pick or take a photo, shrink it, and upload it to Supabase Storage.
 * Profile pictures go to the public "avatars" bucket; workout photos go to the
 * private "workout-photos" bucket (only you and your friends can view them).
 */
import { ImageManipulator, SaveFormat } from 'expo-image-manipulator';
import * as ImagePicker from 'expo-image-picker';

import { db } from './supabase';

/** Ask for permission and let the user take or choose a photo. Returns its local URI, or null. */
export async function pickPhoto(source: 'camera' | 'library', square = false): Promise<string | null> {
  const perm =
    source === 'camera' ? await ImagePicker.requestCameraPermissionsAsync() : await ImagePicker.requestMediaLibraryPermissionsAsync();
  if (!perm.granted) return null;
  const options: ImagePicker.ImagePickerOptions = {
    mediaTypes: ['images'],
    quality: 0.85,
    allowsEditing: square,
    aspect: square ? [1, 1] : undefined,
  };
  const result = source === 'camera' ? await ImagePicker.launchCameraAsync(options) : await ImagePicker.launchImageLibraryAsync(options);
  return result.canceled ? null : result.assets[0].uri;
}

function base64ToBytes(base64: string): Uint8Array {
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return bytes;
}

/** Resize to `width` px, compress to JPEG and upload. Returns the storage path. */
export async function uploadPhoto(bucket: 'avatars' | 'workout-photos', path: string, uri: string, width: number) {
  const image = await ImageManipulator.manipulate(uri).resize({ width }).renderAsync();
  const saved = await image.saveAsync({ format: SaveFormat.JPEG, compress: 0.75, base64: true });
  const { error } = await db()
    .storage.from(bucket)
    .upload(path, base64ToBytes(saved.base64!), { contentType: 'image/jpeg', upsert: true });
  if (error) throw new Error('Could not upload the photo. Check your connection and try again.');
  return path;
}

/** Temporary view links for private workout photos (valid 1 hour). */
export async function workoutPhotoUrls(paths: string[]): Promise<Record<string, string>> {
  if (paths.length === 0) return {};
  const { data } = await db().storage.from('workout-photos').createSignedUrls(paths, 3600);
  const urls: Record<string, string> = {};
  for (const item of data ?? []) if (item.path && item.signedUrl) urls[item.path] = item.signedUrl;
  return urls;
}

/** Copy a picked photo into the app's own storage so it isn't lost when the cache is cleared. */
export async function keepPhoto(uri: string, name: string): Promise<string> {
  try {
    const { File, Paths } = await import('expo-file-system');
    const target = new File(Paths.document, `${name}.jpg`);
    if (target.exists) target.delete();
    await new File(uri).copy(target);
    return target.uri;
  } catch {
    return uri; // web, or copying failed: keep the original
  }
}
