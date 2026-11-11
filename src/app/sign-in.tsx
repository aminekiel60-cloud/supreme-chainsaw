/** SIGN IN — create an account or log in (email + password). */
import { useState } from 'react';
import { ActivityIndicator, Modal, Pressable, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { FormScroll } from '@/components/FormScroll';
import { LogoMark } from '@/components/Logo';
import { PrivacyPolicy } from '@/components/PrivacyPolicy';
import { Button, Card, Field, styles as ui } from '@/components/ui';
import { Colors, Spacing, Type } from '@/constants/theme';
import { db } from '@/lib/supabase';

export default function SignInScreen() {
  const [mode, setMode] = useState<'signIn' | 'signUp'>('signUp');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [showPolicy, setShowPolicy] = useState(false);

  const submit = async () => {
    setBusy(true);
    setMessage(null);
    try {
      if (mode === 'signUp') {
        const { data, error } = await db().auth.signUp({
          email: email.trim(),
          password,
          options: { data: { display_name: name.trim() } },
        });
        if (error) throw error;
        if (!data.session) {
          setMessage('Check your inbox and tap the link to confirm your email. Then log in here.');
          setMode('signIn');
        }
      } else {
        const { error } = await db().auth.signInWithPassword({ email: email.trim(), password });
        if (error) throw error;
      }
    } catch (e) {
      setMessage(e instanceof Error ? e.message : 'Something went wrong. Try again.');
    } finally {
      setBusy(false);
    }
  };

  const resetPassword = async () => {
    if (!email.trim()) {
      setMessage('Enter your email first, then tap "Forgot password?" again.');
      return;
    }
    const { error } = await db().auth.resetPasswordForEmail(email.trim());
    setMessage(error ? error.message : 'We sent you an email to reset your password.');
  };

  const valid = email.includes('@') && password.length >= 8 && (mode === 'signIn' || name.trim().length > 0);

  return (
    <SafeAreaView style={ui.safe}>
      <FormScroll contentContainerStyle={ui.scroll}>
          <View style={{ alignItems: 'center', gap: Spacing.md, paddingVertical: Spacing.xl }}>
            <LogoMark size={88} />
            <Text style={[Type.title, { color: Colors.text }]}>
              Locked <Text style={{ color: Colors.lime }}>in</Text>
            </Text>
            <Text style={{ color: Colors.text, letterSpacing: 3, fontWeight: '800' }}>
              LOCK IN. <Text style={{ color: Colors.lime }}>LEVEL UP.</Text>
            </Text>
          </View>

          <Card style={{ gap: Spacing.md }}>
            <Text style={[Type.heading, { color: Colors.text }]}>
              {mode === 'signUp' ? 'Create your account' : 'Welcome back'}
            </Text>
            {mode === 'signUp' && (
              <Field label="Name (friends see this)" placeholder="Your first name" value={name} onChangeText={setName} />
            )}
            <Field
              label="Email"
              placeholder="you@example.com"
              autoCapitalize="none"
              autoComplete="email"
              keyboardType="email-address"
              value={email}
              onChangeText={setEmail}
            />
            <Field
              label="Password (min. 8 characters)"
              placeholder="••••••••"
              secureTextEntry
              autoComplete={mode === 'signUp' ? 'new-password' : 'current-password'}
              value={password}
              onChangeText={setPassword}
            />
            {message && <Text style={{ color: Colors.lime }}>{message}</Text>}
            {busy ? (
              <ActivityIndicator color={Colors.lime} />
            ) : (
              <Button title={mode === 'signUp' ? 'Create account' : 'Log in'} icon="lock-closed" disabled={!valid} onPress={submit} />
            )}
            {mode === 'signIn' && (
              <Pressable onPress={resetPassword}>
                <Text style={[ui.muted, { textAlign: 'center' }]}>Forgot password?</Text>
              </Pressable>
            )}
          </Card>

          <Pressable onPress={() => setMode(mode === 'signUp' ? 'signIn' : 'signUp')}>
            <Text style={[ui.text, { textAlign: 'center' }]}>
              {mode === 'signUp' ? 'Already have an account? ' : 'New here? '}
              <Text style={{ color: Colors.lime, fontWeight: '700' }}>{mode === 'signUp' ? 'Log in' : 'Create one'}</Text>
            </Text>
          </Pressable>
          <Pressable onPress={() => setShowPolicy(true)}>
            <Text style={[ui.muted, { textAlign: 'center' }]}>
              By creating an account you agree to our <Text style={{ textDecorationLine: 'underline' }}>privacy policy</Text>.
            </Text>
          </Pressable>
      </FormScroll>
      <Modal visible={showPolicy} animationType="slide" onRequestClose={() => setShowPolicy(false)}>
        <SafeAreaView style={ui.safe}>
          <Pressable onPress={() => setShowPolicy(false)} style={{ padding: 16 }}>
            <Text style={{ color: Colors.lime, fontWeight: '700', fontSize: 16 }}>‹ Back</Text>
          </Pressable>
          <PrivacyPolicy />
        </SafeAreaView>
      </Modal>
    </SafeAreaView>
  );
}
