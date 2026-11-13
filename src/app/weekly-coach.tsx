/**
 * WEEKLY COACH: tips from your own log (always available), and advice written
 * by the AI coach from this week's numbers (needs an account, 3 times a week).
 */
import { Ionicons } from '@expo/vector-icons';
import { useState } from 'react';
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';

import { Section, StackPage } from '@/components/layout';
import { Button, Card, styles as ui } from '@/components/ui';
import { Colors, Radius, Spacing, Type } from '@/constants/theme';
import { haptics } from '@/lib/haptics';
import { cloudEnabled, db } from '@/lib/supabase';
import { coachPayload, coachTips } from '@/store/coach';
import { startOfWeek, todayKey } from '@/store/dates';
import { useStore } from '@/store/store';
import type { CoachAdvice } from '@/store/types';

export default function WeeklyCoachScreen() {
  const { state, dispatch } = useStore();
  const tips = coachTips(state);
  const week = startOfWeek(todayKey());
  const saved = state.coachAdvice?.week === week ? state.coachAdvice : null;
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const ask = async () => {
    setLoading(true);
    setError(null);
    try {
      const { data, error: fnError } = await db().functions.invoke<Omit<CoachAdvice, 'week'>>('weekly-coach', { body: { week: coachPayload(state) } });
      if (fnError) {
        const body = await (fnError as { context?: Response }).context?.json?.().catch(() => null);
        throw new Error(body?.error ?? 'The coach could not answer right now.');
      }
      haptics.success();
      dispatch({ type: 'apply', change: () => ({ coachAdvice: { ...data!, week } }) });
    } catch (e) {
      setError(e instanceof Error ? e.message : 'The coach could not answer right now.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <StackPage>
      <Text style={ui.muted}>Based on your last 7 days.</Text>

      {tips.map((t, i) => (
        <Card key={i} style={{ flexDirection: 'row', gap: Spacing.md, alignItems: 'flex-start' }}>
          <View style={[s.icon, { backgroundColor: t.good ? Colors.limeSoft : 'rgba(255,178,63,0.14)' }]}>
            <Ionicons name={t.icon} size={20} color={t.good ? Colors.lime : Colors.fat} />
          </View>
          <View style={{ flex: 1, gap: 2 }}>
            <Text style={[ui.text, { fontWeight: '800' }]}>{t.title}</Text>
            <Text style={ui.muted}>{t.detail}</Text>
          </View>
        </Card>
      ))}

      <Section title="AI coach" />
      {saved ? (
        <Card highlight style={{ gap: Spacing.md }}>
          <Text style={[Type.heading, { color: Colors.text }]}>{saved.headline}</Text>
          {saved.wins.length > 0 && (
            <View style={{ gap: 6 }}>
              <Text style={ui.statLabel}>WHAT WENT WELL</Text>
              {saved.wins.map((w, i) => (
                <View key={i} style={{ flexDirection: 'row', gap: 8 }}>
                  <Ionicons name="checkmark-circle" size={18} color={Colors.lime} />
                  <Text style={[ui.text, { flex: 1 }]}>{w}</Text>
                </View>
              ))}
            </View>
          )}
          <View style={{ gap: Spacing.sm }}>
            <Text style={ui.statLabel}>NEXT WEEK</Text>
            {saved.focus.map((f, i) => (
              <View key={i} style={s.focus}>
                <Text style={[ui.text, { fontWeight: '800' }]}>{f.title}</Text>
                <Text style={ui.muted}>{f.detail}</Text>
              </View>
            ))}
          </View>
          {cloudEnabled && <Button title="Ask again with my latest data" icon="refresh" variant="ghost" onPress={ask} disabled={loading} />}
        </Card>
      ) : (
        <Card style={{ gap: Spacing.md }}>
          <Text style={ui.text}>The AI coach reads this week's numbers and writes you a short check-in: what went well and what to do next week.</Text>
          <Text style={ui.muted}>It gets your totals only (workouts, food, sleep, weight), never your name or photos. You can ask 3 times a week.</Text>
          {cloudEnabled ? (
            <Button title={loading ? 'Thinking' : 'Get my weekly advice'} icon="sparkles" onPress={ask} disabled={loading} />
          ) : (
            <Text style={ui.muted}>Sign in to use the AI coach.</Text>
          )}
        </Card>
      )}
      {loading && <ActivityIndicator color={Colors.lime} />}
      {error && <Text style={{ color: Colors.danger }}>{error}</Text>}
      <Text style={[ui.muted, { fontSize: 12 }]}>General fitness advice, not medical advice.</Text>
    </StackPage>
  );
}

const s = StyleSheet.create({
  icon: { width: 38, height: 38, borderRadius: 19, alignItems: 'center', justifyContent: 'center' },
  focus: { gap: 2, padding: Spacing.md, borderRadius: Radius.md, backgroundColor: Colors.cardRaised },
});
