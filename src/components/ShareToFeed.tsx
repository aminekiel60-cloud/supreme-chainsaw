/**
 * Post a workout to the feed: choose Friends, Everyone or Don't share, and add
 * a caption. Shown right after you finish a workout, and on every workout page.
 */
import { Ionicons } from '@expo/vector-icons';
import { useState } from 'react';
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';

import { Colors, Radius, Spacing, Type } from '@/constants/theme';
import { haptics } from '@/lib/haptics';
import { useStore } from '@/store/store';
import type { Workout } from '@/store/types';
import { Card, styles as ui, type IconName } from './ui';

const OPTIONS: { id: NonNullable<Workout['shared']>; label: string; detail: string; icon: IconName }[] = [
  { id: 'friends', label: 'Friends', detail: 'Your friends see it in Following', icon: 'people' },
  { id: 'public', label: 'Everyone', detail: 'Also in For You for all users', icon: 'globe-outline' },
  { id: 'none', label: "Don't share", detail: 'Only you see this workout', icon: 'lock-closed' },
];

export function ShareToFeed({ workout, highlight }: { workout: Workout; highlight?: boolean }) {
  const { dispatch } = useStore();
  const shared = workout.shared ?? 'friends';
  const [caption, setCaption] = useState(workout.caption ?? '');

  const choose = (id: NonNullable<Workout['shared']>) => {
    haptics.tap();
    dispatch({ type: 'updateWorkout', id: workout.id, changes: { shared: id, caption: caption.trim() || undefined } });
  };

  return (
    <Card highlight={highlight} style={{ gap: Spacing.md }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
        <Ionicons name="paper-plane" size={18} color={Colors.lime} />
        <Text style={[Type.heading, { color: Colors.text, flex: 1 }]}>Share to the feed</Text>
        {shared !== 'none' && <Text style={{ color: Colors.lime, fontWeight: '800', fontSize: 12 }}>POSTED</Text>}
      </View>
      <View style={{ gap: 8 }}>
        {OPTIONS.map((o) => {
          const active = shared === o.id;
          return (
            <Pressable key={o.id} onPress={() => choose(o.id)} style={[s.option, active && s.optionActive]} accessibilityRole="radio" accessibilityState={{ checked: active }}>
              <Ionicons name={o.icon} size={20} color={active ? Colors.lime : Colors.textMuted} />
              <View style={{ flex: 1 }}>
                <Text style={[ui.text, { fontWeight: '800' }]}>{o.label}</Text>
                <Text style={ui.muted}>{o.detail}</Text>
              </View>
              {active && <Ionicons name="checkmark-circle" size={22} color={Colors.lime} />}
            </Pressable>
          );
        })}
      </View>
      {shared !== 'none' && (
        <TextInput
          style={[ui.input, { minHeight: 70, textAlignVertical: 'top' }]}
          placeholder="Add a caption (optional)"
          placeholderTextColor={Colors.textFaint}
          value={caption}
          onChangeText={setCaption}
          onEndEditing={() => dispatch({ type: 'updateWorkout', id: workout.id, changes: { caption: caption.trim() || undefined } })}
          maxLength={500}
          multiline
        />
      )}
      <Text style={ui.muted}>{shared === 'none' ? 'You can still share it later from this page.' : 'Add a photo below and it shows on your post.'}</Text>
    </Card>
  );
}

const s = StyleSheet.create({
  option: { flexDirection: 'row', alignItems: 'center', gap: Spacing.md, padding: 12, borderRadius: Radius.md, backgroundColor: Colors.cardRaised, borderWidth: 1, borderColor: Colors.border },
  optionActive: { borderColor: Colors.limeBorder, backgroundColor: '#18200F' },
});
