/** This week at a glance: a ring per day showing habit progress. Tap to open the calendar. */
import { router } from 'expo-router';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import Svg, { Circle } from 'react-native-svg';

import { Colors } from '@/constants/theme';
import { addDays, fromKey, startOfWeek, todayKey } from '@/store/dates';
import { dayProgress, workoutsOn } from '@/store/logic';
import { useStore } from '@/store/store';

const LETTERS = ['M', 'T', 'W', 'T', 'F', 'S', 'S'];

function Ring({ progress, today }: { progress: number; today: boolean }) {
  const r = 15;
  const c = 2 * Math.PI * r;
  return (
    <Svg width={38} height={38} style={{ transform: [{ rotate: '-90deg' }] }}>
      <Circle cx={19} cy={19} r={r} stroke={today ? '#3A3A3A' : Colors.border} strokeWidth={4} fill="none" />
      {progress > 0 && (
        <Circle
          cx={19}
          cy={19}
          r={r}
          stroke={Colors.lime}
          strokeWidth={4}
          strokeLinecap="round"
          strokeDasharray={`${c * Math.min(1, progress)} ${c}`}
          fill="none"
        />
      )}
    </Svg>
  );
}

export function WeekStrip() {
  const { state } = useStore();
  const today = todayKey();
  const monday = startOfWeek(today);

  return (
    <Pressable onPress={() => router.push('/calendar')} style={s.row}>
      {LETTERS.map((letter, i) => {
        const day = addDays(monday, i);
        const future = day > today;
        const p = future ? 0 : dayProgress(state, day);
        return (
          <View key={day} style={s.day}>
            <Text style={[s.letter, day === today && { color: Colors.lime }]}>{letter}</Text>
            <View>
              <Ring progress={p} today={day === today} />
              <View style={[StyleSheet.absoluteFill, s.center]}>
                <Text style={[s.date, future && { color: Colors.textFaint }]}>{fromKey(day).getDate()}</Text>
              </View>
            </View>
            <View style={[s.dot, workoutsOn(state, day).length > 0 && { backgroundColor: Colors.lime }]} />
          </View>
        );
      })}
    </Pressable>
  );
}

const s = StyleSheet.create({
  row: { flexDirection: 'row', justifyContent: 'space-between' },
  day: { alignItems: 'center', gap: 4 },
  letter: { color: Colors.textMuted, fontSize: 11, fontWeight: '700' },
  center: { alignItems: 'center', justifyContent: 'center' },
  date: { color: Colors.text, fontSize: 12, fontWeight: '700' },
  dot: { width: 4, height: 4, borderRadius: 2, backgroundColor: 'transparent' },
});
