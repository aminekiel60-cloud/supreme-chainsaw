/**
 * Strava-style workout summary to share: big stats + the Locked in logo.
 * "sticker" has a transparent background (to put on top of your own photo
 * in Instagram Stories); "photo" puts the stats over your workout photo.
 */
import { Ionicons } from '@expo/vector-icons';
import * as MediaLibrary from 'expo-media-library';
import * as Sharing from 'expo-sharing';
import type { ComponentRef, RefObject } from 'react';
import { ImageBackground, StyleSheet, Text, View } from 'react-native';
import { captureRef } from 'react-native-view-shot';

import { Colors } from '@/constants/theme';
import { formatDistance, pace, sport } from '@/store/logic';
import type { Workout } from '@/store/types';
import { LogoMark } from './Logo';

export type ShareStyle = 'sticker' | 'photo';

function statsFor(w: Workout) {
  const stats: { label: string; value: string }[] = [];
  if (w.distanceKm) stats.push({ label: 'Distance', value: formatDistance(w) });
  const p = pace(w);
  if (p) stats.push({ label: w.type === 'cycle' ? 'Speed' : 'Pace', value: p });
  const h = Math.floor(w.durationMin / 60);
  stats.push({ label: 'Time', value: h ? `${h}h ${w.durationMin % 60}m` : `${w.durationMin} min` });
  if (w.exercises?.length) {
    const volume = w.exercises.reduce((t, e) => t + e.sets.reduce((s, x) => s + x.reps * x.weight, 0), 0);
    stats.push({ label: 'Sets', value: String(w.exercises.reduce((t, e) => t + e.sets.length, 0)) });
    if (volume) stats.push({ label: 'Volume', value: `${volume.toLocaleString('en-US')} kg` });
  }
  return stats.slice(0, 3);
}

/** The card itself. Rendered at a fixed size so the exported image always looks the same. */
export function ShareCard({
  workout,
  style,
  photoUri,
  cardRef,
}: {
  workout: Workout;
  style: ShareStyle;
  photoUri?: string;
  cardRef: RefObject<ComponentRef<typeof View> | null>;
}) {
  const info = sport(workout.type);
  const content = (
    <View style={s.content}>
      <View style={s.sportRow}>
        <Ionicons name={info.icon} size={22} color={Colors.lime} />
        <Text style={s.sport}>{info.label.toUpperCase()}</Text>
      </View>
      <Text style={s.title} numberOfLines={2}>
        {workout.title}
      </Text>
      {statsFor(workout).map((st) => (
        <View key={st.label} style={{ alignItems: 'center' }}>
          <Text style={s.label}>{st.label}</Text>
          <Text style={s.value}>{st.value}</Text>
        </View>
      ))}
      <View style={s.brand}>
        <LogoMark size={34} />
        <Text style={s.wordmark}>
          Locked <Text style={{ color: Colors.lime }}>in</Text>
        </Text>
      </View>
    </View>
  );

  return (
    <View ref={cardRef} collapsable={false} style={s.frame}>
      {style === 'photo' && photoUri ? (
        <ImageBackground source={{ uri: photoUri }} style={StyleSheet.absoluteFill} resizeMode="cover">
          <View style={[StyleSheet.absoluteFill, { backgroundColor: 'rgba(0,0,0,0.45)' }]} />
        </ImageBackground>
      ) : null}
      {content}
    </View>
  );
}

/** Save the card as an image in your photo gallery. */
export async function saveCard(cardRef: RefObject<ComponentRef<typeof View> | null>): Promise<boolean> {
  const uri = await captureRef(cardRef, { format: 'png', quality: 1, result: 'tmpfile' });
  const perm = await MediaLibrary.requestPermissionsAsync(true);
  if (!perm.granted) return false;
  await MediaLibrary.saveToLibraryAsync(uri);
  return true;
}

/** Save the card as a PNG (transparent for stickers) and open the share sheet. */
export async function shareCard(cardRef: RefObject<ComponentRef<typeof View> | null>) {
  const uri = await captureRef(cardRef, { format: 'png', quality: 1, result: 'tmpfile' });
  if (await Sharing.isAvailableAsync()) {
    await Sharing.shareAsync(uri, { mimeType: 'image/png', dialogTitle: 'Share your workout' });
  }
}

const s = StyleSheet.create({
  frame: { width: 300, height: 400, borderRadius: 24, overflow: 'hidden', backgroundColor: 'transparent' },
  content: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 14, padding: 20 },
  sportRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  sport: { color: Colors.lime, fontWeight: '900', letterSpacing: 3, fontSize: 13 },
  title: {
    color: '#FFFFFF',
    fontWeight: '900',
    fontSize: 22,
    textAlign: 'center',
    textShadowColor: 'rgba(0,0,0,0.5)',
    textShadowRadius: 6,
  },
  label: { color: 'rgba(255,255,255,0.85)', fontWeight: '700', fontSize: 12, letterSpacing: 1, textTransform: 'uppercase' },
  value: { color: '#FFFFFF', fontWeight: '900', fontSize: 34, textShadowColor: 'rgba(0,0,0,0.5)', textShadowRadius: 8 },
  brand: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 6 },
  wordmark: { color: '#FFFFFF', fontWeight: '900', fontSize: 20, textShadowColor: 'rgba(0,0,0,0.5)', textShadowRadius: 6 },
});
