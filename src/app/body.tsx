/** BODY: weight, measurements and progress photos. */
import { useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { Pressable, Text, View } from 'react-native';

import { MeasurementsPanel, PhotosPanel, WeightPanel } from '@/components/BodyPanels';
import { FormScroll } from '@/components/FormScroll';
import { feedStyles } from '@/components/PostCard';
import { Colors } from '@/constants/theme';

type Tab = 'weight' | 'sizes' | 'photos';
const TABS: { id: Tab; label: string }[] = [
  { id: 'weight', label: 'Weight' },
  { id: 'sizes', label: 'Sizes' },
  { id: 'photos', label: 'Photos' },
];

export default function BodyScreen() {
  const params = useLocalSearchParams<{ tab?: Tab }>();
  const [tab, setTab] = useState<Tab>(params.tab ?? 'weight');

  return (
    <FormScroll>
      <View style={feedStyles.segment}>
        {TABS.map((t) => (
          <Pressable key={t.id} onPress={() => setTab(t.id)} style={[feedStyles.segmentItem, tab === t.id && feedStyles.segmentActive]}>
            <Text style={{ color: tab === t.id ? Colors.background : Colors.text, fontWeight: '800' }}>{t.label}</Text>
          </Pressable>
        ))}
      </View>
      {tab === 'weight' && <WeightPanel />}
      {tab === 'sizes' && <MeasurementsPanel />}
      {tab === 'photos' && <PhotosPanel />}
    </FormScroll>
  );
}
