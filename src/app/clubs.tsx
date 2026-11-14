/** CLUBS: your clubs, join one with a code, find public clubs, or start your own. */
import { Ionicons } from '@expo/vector-icons';
import { router, useFocusEffect, useLocalSearchParams } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, Alert, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';

import { ClubBadge, membersText } from '@/components/ClubBadge';
import { FormScroll } from '@/components/FormScroll';
import { Pill } from '@/components/layout';
import { Button, Card, Chip, SectionTitle, styles as ui } from '@/components/ui';
import { Colors, Radius, Spacing, Type } from '@/constants/theme';
import { haptics } from '@/lib/haptics';
import { createClub, JOIN_ERRORS, joinClubByCode, joinPublicClub, listMyClubs, searchClubs, type Club, type ClubVisibility, type JoinResult } from '@/lib/social';
import { cloudEnabled } from '@/lib/supabase';

export default function ClubsScreen() {
  const params = useLocalSearchParams<{ code?: string }>();
  const [clubs, setClubs] = useState<Club[] | null>(null);
  const [error, setError] = useState(false);
  const [code, setCode] = useState(params.code ?? '');
  const [query, setQuery] = useState('');
  const [found, setFound] = useState<Club[] | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);

  const load = useCallback(() => {
    setError(false);
    listMyClubs()
      .then(setClubs)
      .catch(() => setError(true));
  }, []);
  useFocusEffect(load);

  // Search public clubs while typing.
  useEffect(() => {
    if (query.trim().length < 2) return;
    const t = setTimeout(() => {
      searchClubs(query)
        .then(setFound)
        .catch(() => setFound([]));
    }, 350);
    return () => clearTimeout(t);
  }, [query]);

  const joined = (r: JoinResult) => {
    if (!r.ok) {
      Alert.alert('Could not join', JOIN_ERRORS[r.error]);
      return;
    }
    haptics.success();
    setCode('');
    router.push({ pathname: '/club/[id]', params: { id: r.club, fresh: r.already ? undefined : '1' } });
  };

  const results = query.trim().length >= 2 ? found : null;

  const join = async (key: string, action: () => Promise<JoinResult>) => {
    setBusy(key);
    try {
      joined(await action());
    } catch {
      Alert.alert('Could not join', 'Check your connection and try again.');
    } finally {
      setBusy(null);
    }
  };

  if (!cloudEnabled) {
    return (
      <FormScroll>
        <Card>
          <Text style={ui.muted}>Clubs need an account. Sign in to train together with your gym or team.</Text>
        </Card>
      </FormScroll>
    );
  }

  return (
    <FormScroll>
      {params.code && code && (
        <Card highlight style={{ gap: Spacing.sm }}>
          <Text style={[Type.heading, { color: Colors.text }]}>You got a club invite</Text>
          <Text style={ui.muted}>Members of a club see each other&apos;s workouts that are shared with friends, and a weekly ranking.</Text>
          <Button title={busy === 'code' ? 'Joining' : 'Join the club'} icon="enter" disabled={busy !== null} onPress={() => join('code', () => joinClubByCode(code))} />
        </Card>
      )}

      {creating ? (
        <NewClub
          onClose={() => setCreating(false)}
          onCreated={(id) => {
            setCreating(false);
            router.push({ pathname: '/club/[id]', params: { id, fresh: '1' } });
          }}
        />
      ) : (
        <Button title="Start a club" icon="add-circle" onPress={() => setCreating(true)} />
      )}

      <SectionTitle>Your clubs</SectionTitle>
      {error && (
        <Card style={{ gap: Spacing.sm }}>
          <Text style={{ color: Colors.danger }}>Could not load your clubs. Check your connection.</Text>
          <Button title="Try again" icon="refresh" variant="ghost" onPress={load} />
        </Card>
      )}
      {clubs === null && !error && <ActivityIndicator color={Colors.lime} />}
      {clubs?.length === 0 && (
        <Card style={{ alignItems: 'center', gap: Spacing.sm, paddingVertical: 24 }}>
          <Ionicons name="shield" size={36} color={Colors.lime} />
          <Text style={[ui.text, { fontWeight: '700', textAlign: 'center' }]}>No club yet</Text>
          <Text style={[ui.muted, { textAlign: 'center' }]}>Start one for your gym or your mates, or join one below.</Text>
        </Card>
      )}
      {clubs?.map((c) => <ClubRow key={c.id} club={c} onPress={() => router.push({ pathname: '/club/[id]', params: { id: c.id } })} />)}

      <Card style={{ gap: Spacing.md }}>
        <SectionTitle>Join with a code</SectionTitle>
        <View style={{ flexDirection: 'row', gap: Spacing.sm }}>
          <TextInput
            style={[ui.input, { flex: 1, letterSpacing: 2 }]}
            placeholder="Club code"
            placeholderTextColor={Colors.textFaint}
            autoCapitalize="characters"
            autoCorrect={false}
            value={code}
            onChangeText={setCode}
            maxLength={12}
          />
          <Pressable
            style={[s.pill, code.trim().length < 6 && { opacity: 0.4 }]}
            disabled={code.trim().length < 6 || busy !== null}
            onPress={() => join('code', () => joinClubByCode(code))}
            accessibilityLabel="Join with code">
            {busy === 'code' ? <ActivityIndicator color={Colors.background} /> : <Text style={s.pillText}>Join</Text>}
          </Pressable>
        </View>
      </Card>

      <Card style={{ gap: Spacing.md }}>
        <SectionTitle>Find a public club</SectionTitle>
        <View style={s.search}>
          <Ionicons name="search" size={18} color={Colors.textMuted} />
          <TextInput
            style={{ flex: 1, color: Colors.text, fontSize: 16, paddingVertical: 10 }}
            placeholder="Search by name, like your gym"
            placeholderTextColor={Colors.textFaint}
            value={query}
            onChangeText={setQuery}
            autoCorrect={false}
          />
        </View>
        {results?.length === 0 && <Text style={ui.muted}>No public club with that name. Start it yourself!</Text>}
        {results?.map((c) => (
          <View key={c.id} style={{ flexDirection: 'row', alignItems: 'center', gap: Spacing.md }}>
            <ClubBadge name={c.name} />
            <View style={{ flex: 1 }}>
              <Text style={[ui.text, { fontWeight: '700' }]}>{c.name}</Text>
              <Text style={ui.muted}>{membersText(c.members)}</Text>
            </View>
            {c.isMember ? (
              <Text onPress={() => router.push({ pathname: '/club/[id]', params: { id: c.id } })} style={{ color: Colors.lime, fontWeight: '800' }}>
                Open
              </Text>
            ) : (
              <Pressable style={s.pill} disabled={busy !== null} onPress={() => join(c.id, () => joinPublicClub(c.id))} accessibilityLabel={`Join ${c.name}`}>
                {busy === c.id ? <ActivityIndicator color={Colors.background} /> : <Text style={s.pillText}>Join</Text>}
              </Pressable>
            )}
          </View>
        ))}
      </Card>
    </FormScroll>
  );
}

function ClubRow({ club: c, onPress }: { club: Club; onPress: () => void }) {
  return (
    <Pressable onPress={onPress} style={({ pressed }) => [pressed && { opacity: 0.7 }]} accessibilityLabel={`Open ${c.name}`}>
      <Card style={{ flexDirection: 'row', alignItems: 'center', gap: Spacing.md }}>
        <ClubBadge name={c.name} />
        <View style={{ flex: 1, gap: 4 }}>
          <Text style={[Type.heading, { color: Colors.text }]}>{c.name}</Text>
          <View style={{ flexDirection: 'row', gap: 6, flexWrap: 'wrap' }}>
            <Pill icon="people-outline" text={membersText(c.members)} />
            <Pill icon={c.visibility === 'public' ? 'globe-outline' : 'lock-closed-outline'} text={c.visibility === 'public' ? 'Public' : 'Private'} />
            {c.isOwner && <Pill icon="star" text="Owner" active />}
          </View>
        </View>
        <Ionicons name="chevron-forward" size={18} color={Colors.textFaint} />
      </Card>
    </Pressable>
  );
}

function NewClub({ onClose, onCreated }: { onClose: () => void; onCreated: (id: string) => void }) {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [visibility, setVisibility] = useState<ClubVisibility>('private');
  const [busy, setBusy] = useState(false);

  const create = async () => {
    setBusy(true);
    try {
      const id = await createClub(name.trim(), description.trim(), visibility);
      haptics.success();
      onCreated(id);
    } catch (e) {
      Alert.alert('Could not create the club', e instanceof Error ? e.message : 'Try again.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <Card style={{ gap: Spacing.md }}>
      <View style={{ flexDirection: 'row', alignItems: 'center' }}>
        <Text style={[Type.heading, { color: Colors.text, flex: 1 }]}>New club</Text>
        <Pressable hitSlop={10} onPress={onClose} accessibilityLabel="Close">
          <Ionicons name="close" size={22} color={Colors.textMuted} />
        </Pressable>
      </View>
      <TextInput style={ui.input} placeholder="Club name, like Basic-Fit Gent crew" placeholderTextColor={Colors.textFaint} value={name} onChangeText={setName} maxLength={40} />
      <TextInput
        style={[ui.input, { minHeight: 70, textAlignVertical: 'top' }]}
        placeholder="What is it about? (optional)"
        placeholderTextColor={Colors.textFaint}
        value={description}
        onChangeText={setDescription}
        maxLength={300}
        multiline
      />
      <Text style={ui.muted}>Who can join?</Text>
      <View style={{ flexDirection: 'row', gap: Spacing.sm }}>
        <Chip label="With the code" active={visibility === 'private'} onPress={() => setVisibility('private')} />
        <Chip label="Anyone (public)" active={visibility === 'public'} onPress={() => setVisibility('public')} />
      </View>
      <Text style={ui.muted}>
        {visibility === 'private'
          ? 'Private: only people with the code or your invite link can join. You can change this later.'
          : 'Public: anyone can find the club by its name and join. You can change this later.'}
      </Text>
      <Button title={busy ? 'Creating' : 'Create club'} icon="shield-checkmark" disabled={busy || name.trim().length < 2} onPress={create} />
    </Card>
  );
}

const s = StyleSheet.create({
  search: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 12,
    borderRadius: Radius.sm,
    backgroundColor: Colors.cardRaised,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  pill: { backgroundColor: Colors.lime, paddingHorizontal: 18, paddingVertical: 10, borderRadius: Radius.pill, minWidth: 70, alignItems: 'center' },
  pillText: { color: Colors.background, fontWeight: '800' },
});
