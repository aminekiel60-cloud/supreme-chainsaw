import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { router } from 'expo-router';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { Colors, Radius, Spacing } from '@/constants/theme';
import { prettyDate } from '@/store/dates';
import { formatDistance, pace, sport } from '@/store/logic';
import type { Workout } from '@/store/types';
import { Pill } from './layout';
import { Card, styles as ui } from './ui';

/** One workout in a list: photo or sport icon, title, date and the key numbers. */
export function WorkoutRow({ workout: w }: { workout: Workout }) {
  const info = sport(w.type);
  const p = pace(w);
  return (
    <Pressable onPress={() => router.push({ pathname: '/workout/[id]', params: { id: w.id } })}>
      <Card style={{ flexDirection: 'row', gap: Spacing.md, alignItems: 'center' }}>
        {w.photoUri ? (
          <Image source={{ uri: w.photoUri }} style={s.thumb} contentFit="cover" />
        ) : (
          <View style={[s.thumb, s.iconThumb]}>
            <Ionicons name={info.icon} size={24} color={Colors.lime} />
          </View>
        )}
        <View style={{ flex: 1, gap: 4 }}>
          <Text style={[ui.text, { fontWeight: '800' }]} numberOfLines={1}>
            {w.title}
          </Text>
          <Text style={ui.muted}>{prettyDate(w.date)}</Text>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6 }}>
            <Pill icon="time-outline" text={`${w.durationMin} min`} />
            {w.distanceKm ? <Pill icon="navigate-outline" text={formatDistance(w)} /> : null}
            {p ? <Pill icon="speedometer-outline" text={p} /> : null}
            {w.prs?.length ? <Pill icon="trophy" text={`${w.prs.length} PR${w.prs.length > 1 ? 's' : ''}`} /> : null}
          </View>
        </View>
        <Ionicons name="chevron-forward" size={18} color={Colors.textFaint} />
      </Card>
    </Pressable>
  );
}

const s = StyleSheet.create({
  thumb: { width: 60, height: 60, borderRadius: Radius.sm },
  iconThumb: { backgroundColor: Colors.cardRaised, alignItems: 'center', justifyContent: 'center' },
});
