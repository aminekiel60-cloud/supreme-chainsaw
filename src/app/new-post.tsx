/** NEW POST: a photo or a meal with a caption, for your friends or for everyone. */
import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { router } from 'expo-router';
import { useState } from 'react';
import { ActivityIndicator, Alert, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';

import { FormScroll } from '@/components/FormScroll';
import { Button, Card, Chip, styles as ui } from '@/components/ui';
import { Colors, Radius, Spacing } from '@/constants/theme';
import { haptics } from '@/lib/haptics';
import { pickPhoto } from '@/lib/photos';
import { createPost, type Visibility } from '@/lib/social';
import { cloudEnabled } from '@/lib/supabase';
import { todayKey } from '@/store/dates';
import { useStore } from '@/store/store';
import type { Meal } from '@/store/types';

const MEALS: Meal[] = ['Breakfast', 'Lunch', 'Dinner', 'Snacks'];

export default function NewPostScreen() {
  const { state } = useStore();
  const [photo, setPhoto] = useState<string | null>(null);
  const [kind, setKind] = useState<'photo' | 'meal'>('photo');
  const [meal, setMeal] = useState<Meal | null>(null);
  const [caption, setCaption] = useState('');
  const [visibility, setVisibility] = useState<Visibility>('friends');
  const [posting, setPosting] = useState(false);

  const today = todayKey();
  const mealTotals = (m: Meal) =>
    state.food
      .filter((f) => f.date === today && f.meal === m)
      .reduce((t, f) => ({ kcal: t.kcal + f.kcal, protein: t.protein + f.protein, carbs: t.carbs + f.carbs, fat: t.fat + f.fat }), { kcal: 0, protein: 0, carbs: 0, fat: 0 });
  const loggedMeals = MEALS.filter((m) => mealTotals(m).kcal > 0);

  const choose = () =>
    Alert.alert('Add a photo', undefined, [
      { text: 'Take photo', onPress: () => pickPhoto('camera').then((uri) => uri && setPhoto(uri)) },
      { text: 'Choose from gallery', onPress: () => pickPhoto('library').then((uri) => uri && setPhoto(uri)) },
      { text: 'Cancel', style: 'cancel' },
    ]);

  const post = async () => {
    if (!photo && !caption.trim()) {
      Alert.alert('Add a photo or write something first');
      return;
    }
    setPosting(true);
    try {
      const t = meal ? mealTotals(meal) : null;
      await createPost({
        kind,
        title: kind === 'meal' ? meal ?? 'Meal' : 'Photo',
        caption,
        photoUri: photo,
        visibility,
        stats: t
          ? [
              { label: 'kcal', value: String(Math.round(t.kcal)) },
              { label: 'Protein', value: `${Math.round(t.protein)} g` },
              { label: 'Carbs', value: `${Math.round(t.carbs)} g` },
              { label: 'Fat', value: `${Math.round(t.fat)} g` },
            ]
          : [],
      });
      haptics.success();
      router.back();
    } catch (e) {
      Alert.alert('Could not post', e instanceof Error ? e.message : 'Check your connection and try again.');
    } finally {
      setPosting(false);
    }
  };

  if (!cloudEnabled) {
    return (
      <View style={{ padding: Spacing.lg }}>
        <Card>
          <Text style={ui.muted}>Posting needs an account. Sign in first.</Text>
        </Card>
      </View>
    );
  }

  return (
    <FormScroll contentContainerStyle={{ padding: Spacing.lg, gap: Spacing.lg, paddingBottom: 60 }}>
      <Pressable onPress={choose} style={s.photo} accessibilityLabel={photo ? 'Change photo' : 'Add a photo'}>
        {photo ? (
          <>
            <Image source={{ uri: photo }} style={StyleSheet.absoluteFill} contentFit="cover" />
            <View style={s.change}>
              <Ionicons name="camera" size={16} color={Colors.background} />
              <Text style={{ color: Colors.background, fontWeight: '800' }}>Change</Text>
            </View>
          </>
        ) : (
          <View style={{ alignItems: 'center', gap: 8 }}>
            <Ionicons name="camera" size={40} color={Colors.lime} />
            <Text style={[ui.text, { fontWeight: '700' }]}>Add a photo</Text>
            <Text style={ui.muted}>Gym selfie, your meal, the view on your run</Text>
          </View>
        )}
      </Pressable>

      <View style={{ gap: Spacing.sm }}>
        <Text style={ui.statLabel}>WHAT IS IT</Text>
        <View style={{ flexDirection: 'row', gap: Spacing.sm }}>
          <Chip label="Photo" active={kind === 'photo'} onPress={() => { setKind('photo'); setMeal(null); }} />
          <Chip label="Meal" active={kind === 'meal'} onPress={() => setKind('meal')} />
        </View>
      </View>

      {kind === 'meal' && (
        <View style={{ gap: Spacing.sm }}>
          <Text style={ui.statLabel}>SHOW THE NUMBERS OF</Text>
          {loggedMeals.length === 0 ? (
            <Text style={ui.muted}>Log a meal today and you can show its calories and macros on the photo.</Text>
          ) : (
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.sm }}>
              {loggedMeals.map((m) => (
                <Chip key={m} label={`${m}, ${Math.round(mealTotals(m).kcal)} kcal`} active={meal === m} onPress={() => setMeal(meal === m ? null : m)} />
              ))}
            </View>
          )}
        </View>
      )}

      <View style={{ gap: Spacing.sm }}>
        <Text style={ui.statLabel}>CAPTION</Text>
        <TextInput
          style={[ui.input, { minHeight: 90, textAlignVertical: 'top' }]}
          placeholder="Say something about it"
          placeholderTextColor={Colors.textFaint}
          value={caption}
          onChangeText={setCaption}
          maxLength={500}
          multiline
        />
      </View>

      <View style={{ gap: Spacing.sm }}>
        <Text style={ui.statLabel}>WHO CAN SEE IT</Text>
        <Pressable onPress={() => setVisibility('friends')} style={[s.option, visibility === 'friends' && s.optionActive]}>
          <Ionicons name="people" size={22} color={visibility === 'friends' ? Colors.lime : Colors.textMuted} />
          <View style={{ flex: 1 }}>
            <Text style={[ui.text, { fontWeight: '800' }]}>My friends</Text>
            <Text style={ui.muted}>Only people you added as a friend.</Text>
          </View>
          {visibility === 'friends' && <Ionicons name="checkmark-circle" size={22} color={Colors.lime} />}
        </Pressable>
        <Pressable onPress={() => setVisibility('public')} style={[s.option, visibility === 'public' && s.optionActive]}>
          <Ionicons name="globe-outline" size={22} color={visibility === 'public' ? Colors.lime : Colors.textMuted} />
          <View style={{ flex: 1 }}>
            <Text style={[ui.text, { fontWeight: '800' }]}>Everyone</Text>
            <Text style={ui.muted}>Shown in For You to all Locked in users. You can change this later.</Text>
          </View>
          {visibility === 'public' && <Ionicons name="checkmark-circle" size={22} color={Colors.lime} />}
        </Pressable>
      </View>

      {posting ? <ActivityIndicator color={Colors.lime} /> : <Button title="Post" icon="send" onPress={post} />}
    </FormScroll>
  );
}

const s = StyleSheet.create({
  photo: {
    width: '100%',
    aspectRatio: 4 / 5,
    borderRadius: Radius.lg,
    backgroundColor: Colors.card,
    borderWidth: 1,
    borderColor: Colors.border,
    borderStyle: 'dashed',
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  change: { position: 'absolute', right: 12, bottom: 12, flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: Colors.lime, paddingHorizontal: 12, paddingVertical: 8, borderRadius: Radius.pill },
  option: { flexDirection: 'row', alignItems: 'center', gap: Spacing.md, padding: Spacing.md, borderRadius: Radius.md, backgroundColor: Colors.card, borderWidth: 1, borderColor: Colors.border },
  optionActive: { borderColor: Colors.limeBorder, backgroundColor: '#18200F' },
});
