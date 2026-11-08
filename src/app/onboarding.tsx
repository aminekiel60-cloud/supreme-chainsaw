/** ONBOARDING — shown on first launch to set up your profile and goals. */
import { ScrollView, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { LogoMark } from '@/components/Logo';
import { ProfileForm } from '@/components/ProfileForm';
import { styles as ui } from '@/components/ui';
import { Colors, Spacing, Type } from '@/constants/theme';
import { useStore } from '@/store/store';

export default function OnboardingScreen() {
  const { dispatch } = useStore();

  return (
    <SafeAreaView style={ui.safe} edges={['top']}>
      <ScrollView contentContainerStyle={ui.scroll} keyboardShouldPersistTaps="handled">
        <View style={{ alignItems: 'center', gap: Spacing.md, paddingVertical: Spacing.xl }}>
          <LogoMark size={88} />
          <Text style={[Type.title, { color: Colors.text, textAlign: 'center' }]}>
            Welcome to Locked <Text style={{ color: Colors.lime }}>in</Text>
          </Text>
          <Text style={{ color: Colors.text, letterSpacing: 3, fontWeight: '800' }}>
            LOCK IN. <Text style={{ color: Colors.lime }}>LEVEL UP.</Text>
          </Text>
          <Text style={[ui.muted, { textAlign: 'center' }]}>
            Tell us a bit about yourself and we&apos;ll set your daily calorie and macro goals.
          </Text>
        </View>
        <ProfileForm submitLabel="Lock in" onSubmit={(profile) => dispatch({ type: 'setProfile', profile })} />
      </ScrollView>
    </SafeAreaView>
  );
}
