/**
 * RUN TRACKER: GPS route, distance, time, pace and splits per km, for runs,
 * walks and rides. Keeps tracking with the screen off (see lib/runTracker).
 * Only where that isn't possible does the screen stay on instead.
 */
import { Ionicons } from '@expo/vector-icons';
import { activateKeepAwakeAsync, deactivateKeepAwake } from 'expo-keep-awake';
import * as Location from 'expo-location';
import { router } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import { Alert, Platform, Pressable, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { metersBetween, RouteMap } from '@/components/RouteMap';
import { Chip, styles as ui } from '@/components/ui';
import { Colors, Radius, Spacing } from '@/constants/theme';
import { haptics } from '@/lib/haptics';
import { startRunTracking, stopRunTracking } from '@/lib/runTracker';
import { formatDuration, useNow } from '@/lib/workoutTimer';
import { todayKey } from '@/store/dates';
import { newId } from '@/store/logic';
import { useStore } from '@/store/store';
import type { WorkoutType } from '@/store/types';

type Sport = Extract<WorkoutType, 'run' | 'walk' | 'cycle'>;
const SPORTS: { id: Sport; label: string; maxSpeed: number; title: string }[] = [
  { id: 'run', label: 'Run', maxSpeed: 12, title: 'Run' },
  { id: 'walk', label: 'Walk', maxSpeed: 4, title: 'Walk' },
  { id: 'cycle', label: 'Ride', maxSpeed: 25, title: 'Ride' },
];

type Phase = 'ready' | 'tracking' | 'paused';

const paceText = (secondsPerKm: number) =>
  !isFinite(secondsPerKm) || secondsPerKm <= 0 || secondsPerKm > 3600 ? '--:--' : `${Math.floor(secondsPerKm / 60)}:${String(Math.round(secondsPerKm % 60)).padStart(2, '0')}`;

export default function RunScreen() {
  const { dispatch } = useStore();
  const now = useNow(1000);
  const [sport, setSport] = useState<Sport>('run');
  const [phase, setPhase] = useState<Phase>('ready');
  const [meters, setMeters] = useState(0);
  const [route, setRoute] = useState<[number, number][]>([]);
  const [splits, setSplits] = useState<number[]>([]);
  const [gps, setGps] = useState<number | null>(null);
  const [startedAt, setStartedAt] = useState<number | null>(null);
  const [pausedMs, setPausedMs] = useState(0);
  const pausedSince = useRef<number | null>(null);
  const [screenOff, setScreenOff] = useState(true);
  const last = useRef<{ point: [number, number]; time: number } | null>(null);
  const recent = useRef<{ meters: number; time: number }[]>([]);
  const phaseRef = useRef<Phase>('ready');
  phaseRef.current = phase;
  const metersRef = useRef(0);
  const splitStart = useRef(0);

  useEffect(
    () => () => {
      stopRunTracking();
      deactivateKeepAwake('run');
    },
    [],
  );

  const elapsedMs = startedAt ? (phase === 'paused' && pausedSince.current ? pausedSince.current : now) - startedAt - pausedMs : 0;
  const seconds = Math.max(0, Math.floor(elapsedMs / 1000));
  const km = meters / 1000;
  const avgPace = km > 0.05 ? seconds / km : NaN;
  // Current pace over the last ~30 seconds.
  const window = recent.current.filter((r) => r.time >= now - 30000);
  const windowMeters = window.reduce((t, r) => t + r.meters, 0);
  const currentPace = windowMeters > 20 ? 30 / (windowMeters / 1000) : NaN;
  const speed = seconds > 0 ? km / (seconds / 3600) : 0;
  const maxSpeed = SPORTS.find((s) => s.id === sport)!.maxSpeed;

  const onLocation = (loc: Location.LocationObject) => {
    setGps(loc.coords.accuracy ?? null);
    if (phaseRef.current !== 'tracking') return;
    if (loc.coords.accuracy !== null && loc.coords.accuracy > 30) return; // too rough to trust
    const point: [number, number] = [loc.coords.latitude, loc.coords.longitude];
    const prev = last.current;
    if (prev) {
      const d = metersBetween(prev.point, point);
      const dt = Math.max(1, (loc.timestamp - prev.time) / 1000);
      if (d < 3) return; // standing still: GPS jitter
      if (d / dt > maxSpeed) return; // a jump no human makes
      metersRef.current += d;
      recent.current = [...recent.current.filter((r) => r.time >= Date.now() - 60000), { meters: d, time: Date.now() }];
      setMeters(metersRef.current);
      // A full kilometre: remember how long it took.
      const fullKm = Math.floor(metersRef.current / 1000);
      setSplits((sp) => {
        if (fullKm > sp.length) {
          haptics.success();
          const t = Math.floor((Date.now() - (startedRef.current ?? Date.now()) - pausedRef.current) / 1000);
          const split = t - splitStart.current;
          splitStart.current = t;
          return [...sp, split];
        }
        return sp;
      });
    }
    last.current = { point, time: loc.timestamp };
    setRoute((r) => [...r, point]);
  };

  const startedRef = useRef<number | null>(null);
  startedRef.current = startedAt;
  const pausedRef = useRef(0);
  pausedRef.current = pausedMs;

  const start = async () => {
    const perm = await Location.requestForegroundPermissionsAsync();
    if (!perm.granted) {
      Alert.alert('Location needed', 'Allow location for Locked in in your phone settings to track your route.');
      return;
    }
    if (!(await Location.hasServicesEnabledAsync())) {
      Alert.alert('Turn on location', 'Your phone’s location is off. Turn it on in the quick settings, then try again.');
      return;
    }
    haptics.success();
    setStartedAt(Date.now());
    setPhase('tracking');
    const background = await startRunTracking(onLocation, () => setGps(null));
    setScreenOff(background);
    // Without background tracking, keep the screen on so GPS doesn't pause.
    if (!background) activateKeepAwakeAsync('run').catch(() => {});
  };

  const pause = () => {
    haptics.tap();
    pausedSince.current = Date.now();
    setPhase('paused');
  };

  const resume = () => {
    haptics.tap();
    if (pausedSince.current) setPausedMs((p) => p + Date.now() - pausedSince.current!);
    pausedSince.current = null;
    last.current = null; // don't draw a line across the pause
    setPhase('tracking');
  };

  const stop = () => {
    stopRunTracking();
    deactivateKeepAwake('run');
  };

  const save = () => {
    stop();
    const id = newId();
    // Keep the saved route light: at most ~400 points.
    const step = Math.max(1, Math.ceil(route.length / 400));
    const slim = route.filter((_, i) => i % step === 0 || i === route.length - 1).map(([a, b]) => [Math.round(a * 1e5) / 1e5, Math.round(b * 1e5) / 1e5] as [number, number]);
    const info = SPORTS.find((s) => s.id === sport)!;
    const h = new Date().getHours();
    dispatch({
      type: 'addWorkout',
      workout: {
        id,
        date: todayKey(),
        type: sport,
        title: `${h < 12 ? 'Morning' : h < 18 ? 'Afternoon' : 'Evening'} ${info.title.toLowerCase()}`,
        durationMin: Math.max(1, Math.round(seconds / 60)),
        distanceKm: Math.round(km * 100) / 100,
        route: slim,
        splits,
      },
    });
    router.replace({ pathname: '/workout/[id]', params: { id, fresh: '1' } });
  };

  const finish = () => {
    if (km < 0.05) {
      Alert.alert('Barely moved', 'Less than 50 metres so far. Discard this one?', [
        { text: 'Keep going', style: 'cancel' },
        { text: 'Discard', style: 'destructive', onPress: close },
      ]);
      return;
    }
    Alert.alert('Finish and save?', undefined, [
      { text: 'Keep going', style: 'cancel' },
      { text: 'Save', onPress: save },
    ]);
  };

  const close = () => {
    stop();
    router.back();
  };

  const gpsLabel = gps === null ? 'Searching for GPS' : gps <= 10 ? 'GPS strong' : gps <= 30 ? 'GPS ok' : 'GPS weak';
  const gpsColor = gps === null || gps > 30 ? Colors.fat : Colors.lime;

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: Colors.background }}>
      <View style={s.top}>
        <Pressable
          hitSlop={12}
          onPress={() =>
            phase === 'ready'
              ? close()
              : Alert.alert('Stop without saving?', 'This run will be lost.', [
                  { text: 'Keep going', style: 'cancel' },
                  { text: 'Discard', style: 'destructive', onPress: close },
                ])
          }
          accessibilityLabel="Close">
          <Ionicons name="close" size={28} color={Colors.text} />
        </Pressable>
        <View style={[s.gps, { borderColor: gpsColor }]}>
          <View style={[s.gpsDot, { backgroundColor: gpsColor }]} />
          <Text style={{ color: gpsColor, fontWeight: '700', fontSize: 12 }}>{phase === 'ready' ? 'Ready' : gpsLabel}</Text>
        </View>
        <View style={{ width: 28 }} />
      </View>

      {phase === 'ready' ? (
        <View style={s.ready}>
          <Ionicons name="navigate-circle" size={96} color={Colors.lime} />
          <Text style={{ color: Colors.text, fontSize: 28, fontWeight: '900' }}>Track your route</Text>
          <View style={{ flexDirection: 'row', gap: Spacing.sm }}>
            {SPORTS.map((sp) => (
              <Chip key={sp.id} label={sp.label} active={sport === sp.id} onPress={() => setSport(sp.id)} />
            ))}
          </View>
          <Text style={[ui.muted, { textAlign: 'center' }]}>
            {Platform.OS === 'web' ? 'Keep this page open while you track.' : 'You can lock your phone and put it in your pocket. A notification shows while the run is tracked.'}
          </Text>
        </View>
      ) : (
        <View style={{ flex: 1, paddingHorizontal: Spacing.lg, gap: Spacing.lg }}>
          <View style={{ alignItems: 'center' }}>
            <Text style={s.big}>{km.toFixed(2)}</Text>
            <Text style={ui.statLabel}>KILOMETRES</Text>
          </View>
          <View style={s.row}>
            <Metric value={formatDuration(seconds)} label="TIME" />
            {sport === 'cycle' ? <Metric value={speed.toFixed(1)} label="KM/H" /> : <Metric value={paceText(currentPace)} label="PACE NOW" />}
            <Metric value={sport === 'cycle' ? paceText(avgPace) : paceText(avgPace)} label={sport === 'cycle' ? 'MIN/KM' : 'AVG PACE'} />
          </View>
          <RouteMap route={route} height={200} />
          {splits.length > 0 && (
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6 }}>
              {splits.map((sp, i) => (
                <View key={i} style={s.split}>
                  <Text style={{ color: Colors.textMuted, fontSize: 11, fontWeight: '700' }}>KM {i + 1}</Text>
                  <Text style={{ color: Colors.text, fontWeight: '800' }}>{paceText(sp)}</Text>
                </View>
              ))}
            </View>
          )}
          {phase === 'paused' && <Text style={[ui.muted, { textAlign: 'center' }]}>Paused. Time and distance are on hold.</Text>}
          {!screenOff && phase === 'tracking' && <Text style={[ui.muted, { textAlign: 'center' }]}>Keep the screen on: tracking pauses when the app is closed.</Text>}
        </View>
      )}

      <View style={s.controls}>
        {phase === 'ready' && (
          <Pressable style={s.startBtn} onPress={start} accessibilityLabel="Start">
            <Text style={s.startText}>START</Text>
          </Pressable>
        )}
        {phase === 'tracking' && (
          <Pressable style={[s.round, { backgroundColor: Colors.lime }]} onPress={pause} accessibilityLabel="Pause">
            <Ionicons name="pause" size={34} color={Colors.background} />
          </Pressable>
        )}
        {phase === 'paused' && (
          <>
            <Pressable style={[s.round, { backgroundColor: Colors.lime }]} onPress={resume} accessibilityLabel="Resume">
              <Ionicons name="play" size={34} color={Colors.background} />
            </Pressable>
            <Pressable style={[s.round, { backgroundColor: Colors.cardRaised, borderWidth: 2, borderColor: Colors.lime }]} onPress={finish} accessibilityLabel="Finish">
              <Ionicons name="stop" size={30} color={Colors.lime} />
            </Pressable>
          </>
        )}
      </View>
    </SafeAreaView>
  );
}

function Metric({ value, label }: { value: string; label: string }) {
  return (
    <View style={{ flex: 1, alignItems: 'center', gap: 2 }}>
      <Text style={{ color: Colors.text, fontSize: 26, fontWeight: '800', fontVariant: ['tabular-nums'] }}>{value}</Text>
      <Text style={ui.statLabel}>{label}</Text>
    </View>
  );
}

const s = StyleSheet.create({
  top: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: Spacing.lg, paddingVertical: Spacing.md },
  gps: { flexDirection: 'row', alignItems: 'center', gap: 6, borderWidth: 1, borderRadius: Radius.pill, paddingHorizontal: 10, paddingVertical: 4 },
  gpsDot: { width: 8, height: 8, borderRadius: 4 },
  ready: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: Spacing.lg, paddingHorizontal: Spacing.xl },
  big: { color: Colors.lime, fontSize: 84, fontWeight: '900', letterSpacing: -2, fontVariant: ['tabular-nums'] },
  row: { flexDirection: 'row' },
  split: { paddingHorizontal: 10, paddingVertical: 6, borderRadius: Radius.sm, backgroundColor: Colors.card, borderWidth: 1, borderColor: Colors.border, alignItems: 'center' },
  controls: { flexDirection: 'row', justifyContent: 'center', gap: Spacing.xl, paddingVertical: Spacing.xl },
  startBtn: { width: 140, height: 140, borderRadius: 70, backgroundColor: Colors.lime, alignItems: 'center', justifyContent: 'center', boxShadow: '0 0 40px rgba(163,255,63,0.4)' },
  startText: { color: Colors.background, fontSize: 26, fontWeight: '900', letterSpacing: 2 },
  round: { width: 84, height: 84, borderRadius: 42, alignItems: 'center', justifyContent: 'center' },
});
