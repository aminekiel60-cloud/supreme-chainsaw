/** WEEK IN REVIEW — everything you did this week; pick the stats you care about and share the card. */
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useRef, useState, type ComponentRef } from 'react';
import { Alert, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { ReviewCard, type ReviewStyle } from '@/components/ReviewCard';
import { saveCard, shareCard } from '@/components/ShareCard';
import { Button, Card, Chip, SectionTitle, styles as ui } from '@/components/ui';
import { Colors, Radius, Spacing, Type } from '@/constants/theme';
import { haptics } from '@/lib/haptics';
import { addDays, prettyDate, startOfWeek, todayKey } from '@/store/dates';
import { formatDistance, sport } from '@/store/logic';
import { weekReview } from '@/store/review';
import { useStore } from '@/store/store';

const MAX_ON_CARD = 6;

export default function ReviewScreen() {
  const { state, dispatch } = useStore();
  const thisWeek = startOfWeek(todayKey());
  const [start, setStart] = useState(thisWeek);
  const [style, setStyle] = useState<ReviewStyle>('dark');
  const [busy, setBusy] = useState(false);
  const cardRef = useRef<ComponentRef<typeof View>>(null);
  const review = weekReview(state, start);
  const chosen = state.settings.reviewStats;

  const toggle = (id: string) => {
    haptics.tap();
    const next = chosen.includes(id) ? chosen.filter((x) => x !== id) : [...chosen, id];
    if (next.length === 0) return;
    if (next.length > MAX_ON_CARD) {
      Alert.alert(`Up to ${MAX_ON_CARD} stats fit on the card`, 'Turn one off first.');
      return;
    }
    dispatch({ type: 'setSettings', settings: { ...state.settings, reviewStats: next } });
  };

  const act = async (action: 'share' | 'save') => {
    setBusy(true);
    try {
      if (action === 'share') await shareCard(cardRef);
      else {
        const ok = await saveCard(cardRef);
        Alert.alert(ok ? 'Saved to your gallery' : 'Permission needed', ok ? 'Find it in your Photos app.' : 'Allow Locked in to save photos and try again.');
      }
    } catch {
      Alert.alert(action === 'share' ? 'Sharing is not available on this device.' : 'Could not save the image.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <ScrollView style={{ backgroundColor: Colors.background }} contentContainerStyle={{ padding: 16, gap: 16, paddingBottom: 48 }}>
      <View style={s.weekRow}>
        <Pressable hitSlop={12} onPress={() => setStart(addDays(start, -7))} accessibilityLabel="Previous week">
          <Ionicons name="chevron-back" size={26} color={Colors.text} />
        </Pressable>
        <View style={{ alignItems: 'center' }}>
          <Text style={[Type.title, { color: Colors.text }]}>{start === thisWeek ? 'This week' : start === addDays(thisWeek, -7) ? 'Last week' : review.label}</Text>
          <Text style={ui.muted}>{review.label}</Text>
        </View>
        <Pressable hitSlop={12} disabled={start >= thisWeek} onPress={() => setStart(addDays(start, 7))} accessibilityLabel="Next week">
          <Ionicons name="chevron-forward" size={26} color={start >= thisWeek ? Colors.textFaint : Colors.text} />
        </Pressable>
      </View>

      <Text style={{ color: Colors.lime, fontWeight: '800', fontSize: 16, textAlign: 'center' }}>{review.headline}</Text>

      {/* All numbers, with the change vs. the week before */}
      <View style={s.grid}>
        {review.stats.map((st) => (
          <Card key={st.id} style={s.stat}>
            <Text style={ui.statLabel}>{st.label}</Text>
            <Text style={{ color: Colors.text, fontSize: 20, fontWeight: '900' }}>{st.value}</Text>
            {st.delta ? <Text style={{ color: st.up ? Colors.lime : Colors.fat, fontSize: 12, fontWeight: '700' }}>{st.delta} vs last week</Text> : null}
          </Card>
        ))}
      </View>

      <Card style={{ gap: Spacing.sm }}>
        <SectionTitle>Activities</SectionTitle>
        {review.workouts.length === 0 && <Text style={ui.muted}>No workouts logged this week.</Text>}
        {review.workouts.map((w) => (
          <Pressable key={w.id} style={s.activity} onPress={() => router.push({ pathname: '/workout/[id]', params: { id: w.id } })}>
            <Ionicons name={sport(w.type).icon} size={18} color={Colors.lime} />
            <View style={{ flex: 1 }}>
              <Text style={[ui.text, { fontWeight: '700' }]} numberOfLines={1}>
                {w.title}
              </Text>
              <Text style={ui.muted}>
                {prettyDate(w.date)} · {w.durationMin} min{w.distanceKm ? ` · ${formatDistance(w)}` : ''}
                {w.prs?.length ? ` · 🏆 ${w.prs.length} PR` : ''}
              </Text>
            </View>
            <Ionicons name="chevron-forward" size={16} color={Colors.textFaint} />
          </Pressable>
        ))}
      </Card>

      {/* Share card */}
      <Card style={{ gap: Spacing.md }}>
        <SectionTitle action={<Text style={ui.muted}>{chosen.length} / {MAX_ON_CARD}</Text>}>Share your week</SectionTitle>
        <Text style={ui.muted}>Choose what goes on the card.</Text>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.sm }}>
          {review.stats.map((st) => (
            <Chip key={st.id} label={st.label} active={chosen.includes(st.id)} onPress={() => toggle(st.id)} />
          ))}
        </View>
        <View style={{ flexDirection: 'row', gap: Spacing.sm }}>
          <Chip label="Dark card" active={style === 'dark'} onPress={() => setStyle('dark')} />
          <Chip label="Transparent sticker" active={style === 'sticker'} onPress={() => setStyle('sticker')} />
        </View>
        <View style={s.preview}>
          <ReviewCard review={review} statIds={chosen} style={style} name={state.profile?.name} cardRef={cardRef} />
        </View>
        <View style={{ flexDirection: 'row', gap: Spacing.sm }}>
          <View style={{ flex: 1 }}>
            <Button title={busy ? 'Preparing…' : 'Share'} icon="share-social" disabled={busy} onPress={() => act('share')} />
          </View>
          <View style={{ flex: 1 }}>
            <Button title="Save image" icon="download" variant="ghost" disabled={busy} onPress={() => act('save')} />
          </View>
        </View>
      </Card>
    </ScrollView>
  );
}

const s = StyleSheet.create({
  weekRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.sm },
  stat: { width: '48.5%', padding: 12, gap: 2 },
  activity: { flexDirection: 'row', alignItems: 'center', gap: Spacing.md, paddingVertical: 4 },
  preview: { alignItems: 'center', padding: 12, borderRadius: Radius.lg, backgroundColor: '#2a2a2a', borderWidth: 1, borderColor: Colors.border },
});
