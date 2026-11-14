/** WORKOUT: summary, sharing to the feed, photo, friends tagged, and a Strava-style share card. */
import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { Stack, router, useLocalSearchParams } from 'expo-router';
import { useRef, useState, type ComponentRef } from 'react';
import { Alert, Modal, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';

import { RouteMap } from '@/components/RouteMap';
import { ShareCard, saveCard, shareCard, type ShareStyle } from '@/components/ShareCard';
import { ShareToFeed } from '@/components/ShareToFeed';
import { TagFriends } from '@/components/TagFriends';
import { Button, Card, Chip, SectionTitle, styles as ui } from '@/components/ui';
import { Colors, Radius, Spacing, Type } from '@/constants/theme';
import { keepPhoto, pickPhoto } from '@/lib/photos';
import { cloudEnabled } from '@/lib/supabase';
import { prettyDate } from '@/store/dates';
import { describeRecord } from '@/store/exercises';
import { formatDistance, pace, sport } from '@/store/logic';
import { useStore } from '@/store/store';

export default function WorkoutScreen() {
  const { id, fresh } = useLocalSearchParams<{ id: string; fresh?: string }>();
  const [routineName, setRoutineName] = useState<string | null>(null);
  const { state, dispatch } = useStore();
  const workout = state.workouts.find((w) => w.id === id);
  const [style, setStyle] = useState<ShareStyle>('sticker');
  const [sharing, setSharing] = useState(false);
  const cardRef = useRef<ComponentRef<typeof View>>(null);

  if (!workout) {
    return (
      <View style={{ flex: 1, backgroundColor: Colors.background, alignItems: 'center', justifyContent: 'center' }}>
        <Text style={ui.muted}>This workout was deleted.</Text>
      </View>
    );
  }

  const info = sport(workout.type);
  const p = pace(workout);
  const sets = workout.exercises?.reduce((t, e) => t + e.sets.length, 0) ?? 0;
  const volume = workout.exercises?.reduce((t, e) => t + e.sets.reduce((s, x) => s + x.reps * x.weight, 0), 0) ?? 0;

  const changePhoto = () => {
    const run = async (source: 'camera' | 'library') => {
      const uri = await pickPhoto(source);
      if (uri) dispatch({ type: 'updateWorkout', id: workout.id, changes: { photoUri: await keepPhoto(uri, `workout-${workout.id}`) } });
    };
    Alert.alert('Workout photo', undefined, [
      { text: 'Take photo', onPress: () => run('camera') },
      { text: 'Choose from gallery', onPress: () => run('library') },
      { text: 'Cancel', style: 'cancel' },
    ]);
  };

  const save = async () => {
    if (style === 'photo' && !workout.photoUri) return changePhoto();
    setSharing(true);
    try {
      const ok = await saveCard(cardRef);
      Alert.alert(ok ? 'Saved to your gallery' : 'Permission needed', ok ? 'Find it in your Photos app.' : 'Allow Locked in to save photos and try again.');
    } catch {
      Alert.alert('Could not save the image.');
    } finally {
      setSharing(false);
    }
  };

  const share = async () => {
    if (style === 'photo' && !workout.photoUri) {
      changePhoto();
      return;
    }
    setSharing(true);
    try {
      await shareCard(cardRef);
    } catch {
      Alert.alert('Sharing is not available on this device.');
    } finally {
      setSharing(false);
    }
  };

  const saveAsRoutine = (name: string) => {
    const clean = name.trim() || workout.title;
    dispatch({
      type: 'addRoutine',
      routine: { name: clean, exercises: (workout.exercises ?? []).map((e) => ({ name: e.name, sets: e.sets.length, restSeconds: e.restSeconds })) },
    });
    dispatch({ type: 'updateWorkout', id: workout.id, changes: { routineId: 'saved' } });
    setRoutineName(null);
    Alert.alert('Saved as routine', `“${clean}” is now under Coach, Routines.`);
  };

  const remove = () =>
    Alert.alert('Delete workout?', 'It will also disappear from the feed.', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: () => {
          dispatch({ type: 'removeWorkout', id: workout.id });
          router.back();
        },
      },
    ]);

  return (
    <ScrollView style={{ backgroundColor: Colors.background }} contentContainerStyle={{ padding: 16, gap: 16, paddingBottom: 48 }}>
      <Stack.Screen
        options={{
          headerRight: () => (
            <Pressable hitSlop={10} onPress={() => router.push({ pathname: '/log-workout', params: { id: workout.id } })}>
              <Text style={{ color: Colors.lime, fontWeight: '800', fontSize: 16 }}>Edit</Text>
            </Pressable>
          ),
        }}
      />
      {/* Hero */}
      <View style={s.hero}>
        <View style={s.heroIcon}>
          <Ionicons name={info.icon} size={30} color={Colors.background} />
        </View>
        <Text style={[Type.title, { color: Colors.text, textAlign: 'center' }]}>{workout.title}</Text>
        <Text style={ui.muted}>
          {info.label}, {prettyDate(workout.date)}
          {workout.tagged?.length ? `, with ${workout.tagged.map((t) => t.name).join(', ')}` : ''}
        </Text>
      </View>

      {cloudEnabled && <ShareToFeed workout={workout} highlight={fresh === '1'} />}

      {workout.prs?.length ? (
        <Card highlight style={{ gap: 6 }}>
          <Text style={{ color: Colors.lime, fontWeight: '900', letterSpacing: 2 }}>NEW PERSONAL RECORD{workout.prs.length > 1 ? 'S' : ''}</Text>
          {workout.prs.map((pr, i) => (
            <Text key={i} style={ui.text}>
              {describeRecord(pr)}
            </Text>
          ))}
        </Card>
      ) : null}

      <View style={{ flexDirection: 'row', gap: Spacing.sm }}>
        <Big label="Time" value={`${workout.durationMin}`} unit="min" />
        {workout.distanceKm ? <Big label="Distance" value={formatDistance(workout).split(' ')[0]} unit={formatDistance(workout).split(' ')[1]} /> : null}
        {p ? <Big label={workout.type === 'cycle' ? 'Speed' : 'Pace'} value={p.split(' ')[0]} unit={p.split(' ')[1]} /> : null}
        {sets ? <Big label="Sets" value={String(sets)} unit={volume ? `${volume.toLocaleString('en-US')} kg` : 'sets'} /> : null}
      </View>

      {workout.route && workout.route.length > 1 ? <RouteMap route={workout.route} /> : null}

      {workout.splits?.length ? (
        <Card style={{ gap: Spacing.sm }}>
          <SectionTitle>Splits</SectionTitle>
          {workout.splits.map((sec, i) => {
            const fastest = Math.min(...workout.splits!);
            return (
              <View key={i} style={{ flexDirection: 'row', alignItems: 'center', gap: Spacing.md }}>
                <Text style={[ui.muted, { width: 44 }]}>Km {i + 1}</Text>
                <View style={{ flex: 1, height: 10, borderRadius: 5, backgroundColor: Colors.border, overflow: 'hidden' }}>
                  <View style={{ width: `${Math.round((fastest / sec) * 100)}%`, height: '100%', backgroundColor: sec === fastest ? Colors.lime : Colors.carbs, borderRadius: 5 }} />
                </View>
                <Text style={{ color: Colors.text, fontWeight: '800', width: 52, textAlign: 'right' }}>
                  {Math.floor(sec / 60)}:{String(sec % 60).padStart(2, '0')}
                </Text>
              </View>
            );
          })}
        </Card>
      ) : null}

      {workout.avgHeartRate || workout.kcal ? (
        <View style={{ flexDirection: 'row', gap: Spacing.sm }}>
          {workout.avgHeartRate ? <Big label="Avg HR" value={String(workout.avgHeartRate)} unit="bpm" /> : null}
          {workout.maxHeartRate ? <Big label="Max HR" value={String(workout.maxHeartRate)} unit="bpm" /> : null}
          {workout.kcal ? <Big label="Burned" value={String(workout.kcal)} unit="kcal" /> : null}
        </View>
      ) : null}

      {workout.exercises?.length ? (
        <Card style={{ gap: Spacing.sm }}>
          <SectionTitle
            action={
              !workout.routineId ? (
                <Pressable onPress={() => setRoutineName(workout.title)}>
                  <Text style={{ color: Colors.lime, fontWeight: '700' }}>Save as routine</Text>
                </Pressable>
              ) : undefined
            }>
            Exercises
          </SectionTitle>
          {workout.exercises.map((e, i) => (
            <Pressable key={i} onPress={() => router.push({ pathname: '/exercise/[name]', params: { name: e.name } })} style={{ flexDirection: 'row', justifyContent: 'space-between', gap: 8 }}>
              <Text style={[ui.text, { fontWeight: '700', flex: 1 }]}>{e.name}</Text>
              <Text style={ui.muted}>{e.sets.map((x) => `${x.weight}×${x.reps}`).join('  ')}</Text>
            </Pressable>
          ))}
        </Card>
      ) : null}

      <Pressable onPress={changePhoto} style={s.photo}>
        {workout.photoUri ? (
          <Image source={{ uri: workout.photoUri }} style={StyleSheet.absoluteFill} contentFit="cover" />
        ) : (
          <View style={{ alignItems: 'center', gap: 6 }}>
            <Ionicons name="camera" size={28} color={Colors.lime} />
            <Text style={ui.muted}>Add a photo</Text>
          </View>
        )}
      </Pressable>

      {cloudEnabled && (
        <Card style={{ gap: Spacing.md }}>
          <SectionTitle>Trained with</SectionTitle>
          <TagFriends
            value={workout.tagged ?? []}
            onChange={(tagged) => dispatch({ type: 'updateWorkout', id: workout.id, changes: { tagged } })}
          />
        </Card>
      )}

      {/* Share card */}
      <Card style={{ gap: Spacing.md, alignItems: 'center' }}>
        <View style={{ alignSelf: 'stretch' }}>
          <SectionTitle>Share your workout</SectionTitle>
          <Text style={ui.muted}>
            {style === 'sticker' ? 'A see-through sticker. Put it on top of your own photo in Instagram Stories.' : 'Your stats on top of your workout photo.'}
          </Text>
        </View>
        <View style={{ flexDirection: 'row', gap: Spacing.sm, alignSelf: 'stretch' }}>
          <Chip label="Sticker" active={style === 'sticker'} onPress={() => setStyle('sticker')} />
          <Chip label="On my photo" active={style === 'photo'} onPress={() => setStyle('photo')} />
        </View>
        <View style={s.checker}>
          <ShareCard workout={workout} style={style} photoUri={workout.photoUri} cardRef={cardRef} />
        </View>
        <View style={{ flexDirection: 'row', gap: Spacing.sm, alignSelf: 'stretch' }}>
          <View style={{ flex: 1 }}>
            <Button title={sharing ? 'Preparing…' : 'Share'} icon="share-social" onPress={share} disabled={sharing} />
          </View>
          <View style={{ flex: 1 }}>
            <Button title="Save image" icon="download" variant="ghost" onPress={save} disabled={sharing} />
          </View>
        </View>
      </Card>

      <Pressable onPress={remove} style={{ padding: 12 }}>
        <Text style={{ color: Colors.danger, textAlign: 'center', fontWeight: '600' }}>Delete workout</Text>
      </Pressable>
      <Modal visible={routineName !== null} transparent animationType="fade" onRequestClose={() => setRoutineName(null)}>
        <Pressable style={s.backdrop} onPress={() => setRoutineName(null)}>
          <Pressable style={s.dialog} onPress={() => {}}>
            <Text style={[Type.heading, { color: Colors.text }]}>Name your routine</Text>
            <TextInput
              style={ui.input}
              value={routineName ?? ''}
              onChangeText={setRoutineName}
              placeholder="e.g. Push day A"
              placeholderTextColor={Colors.textFaint}
              autoFocus
              selectTextOnFocus
              onSubmitEditing={() => saveAsRoutine(routineName ?? '')}
              returnKeyType="done"
              maxLength={40}
            />
            <Text style={ui.muted}>{workout.exercises?.length ?? 0} exercises with their sets and rest times.</Text>
            <View style={{ flexDirection: 'row', gap: Spacing.sm }}>
              <View style={{ flex: 1 }}>
                <Button title="Cancel" variant="ghost" onPress={() => setRoutineName(null)} />
              </View>
              <View style={{ flex: 1 }}>
                <Button title="Save" icon="checkmark" onPress={() => saveAsRoutine(routineName ?? '')} />
              </View>
            </View>
          </Pressable>
        </Pressable>
      </Modal>
    </ScrollView>
  );
}

function Big({ label, value, unit }: { label: string; value: string; unit?: string }) {
  return (
    <Card style={{ flex: 1, padding: 12, gap: 2 }}>
      <Text style={ui.statLabel}>{label}</Text>
      <Text style={{ color: Colors.text, fontSize: 22, fontWeight: '900' }}>{value}</Text>
      {unit ? <Text style={ui.muted}>{unit}</Text> : null}
    </Card>
  );
}

const s = StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.7)', justifyContent: 'center', padding: Spacing.xl },
  dialog: { backgroundColor: Colors.card, borderRadius: Radius.lg, padding: Spacing.xl, gap: Spacing.md, borderWidth: 1, borderColor: Colors.border },
  hero: { alignItems: 'center', gap: 8, paddingTop: 8 },
  heroIcon: {
    width: 64,
    height: 64,
    borderRadius: 20,
    backgroundColor: Colors.lime,
    alignItems: 'center',
    justifyContent: 'center',
    boxShadow: '0 0 30px rgba(163, 255, 63, 0.4)',
  },
  photo: {
    height: 200,
    borderRadius: Radius.lg,
    borderWidth: 1,
    borderStyle: 'dashed',
    borderColor: Colors.limeBorder,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  // Dark checkerboard-ish backdrop so the transparent sticker is visible in the preview.
  checker: { padding: 12, borderRadius: Radius.lg, backgroundColor: '#2a2a2a', borderWidth: 1, borderColor: Colors.border },
});
