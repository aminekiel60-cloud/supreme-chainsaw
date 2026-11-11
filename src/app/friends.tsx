/** FRIENDS — find people by name or invite code, requests, and who may coach you. */
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import { Alert, Pressable, Share, StyleSheet, Switch, Text, TextInput, View } from 'react-native';

import { Avatar } from '@/components/Avatar';
import { FormScroll } from '@/components/FormScroll';
import { Button, Card, SectionTitle, styles as ui } from '@/components/ui';
import { Colors, Radius, Spacing } from '@/constants/theme';
import {
  acceptFriend,
  addFriend,
  addFriendByCode,
  getCoachLinks,
  getMyProfile,
  listFriendships,
  removeFriend,
  searchPeople,
  setCoach,
  type Friendship,
  type PublicProfile,
} from '@/lib/social';

export default function FriendsScreen() {
  const [me, setMe] = useState<PublicProfile | null>(null);
  const [friendships, setFriendships] = useState<Friendship[]>([]);
  const [coaches, setCoaches] = useState<string[]>([]);
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<PublicProfile[]>([]);
  const [code, setCode] = useState('');

  const load = useCallback(async () => {
    try {
      const [profile, fs, links] = await Promise.all([getMyProfile(), listFriendships(), getCoachLinks()]);
      setMe(profile);
      setFriendships(fs);
      setCoaches(links.myCoaches);
    } catch {
      // offline: keep what we have
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load]),
  );

  // Search as you type (short pause first).
  useEffect(() => {
    if (query.trim().length < 2) {
      setResults([]);
      return;
    }
    const t = setTimeout(() => searchPeople(query).then(setResults).catch(() => {}), 300);
    return () => clearTimeout(t);
  }, [query]);

  const run = (action: () => Promise<unknown>, success?: string) => async () => {
    try {
      await action();
      if (success) Alert.alert(success);
      await load();
    } catch (e) {
      Alert.alert('Oops', e instanceof Error ? e.message : 'Something went wrong');
    }
  };

  const accepted = friendships.filter((f) => f.status === 'accepted');
  const incoming = friendships.filter((f) => f.status === 'pending' && f.incoming);
  const outgoing = friendships.filter((f) => f.status === 'pending' && !f.incoming);
  const knownIds = new Set(friendships.map((f) => f.friend.id));

  const invite = () =>
    Share.share({ message: `Lock in with me on Locked in 🔒 Add me with my code: ${me?.invite_code ?? ''}\nLOCK IN. LEVEL UP.` }).catch(() => {});

  return (
    <FormScroll>
      <Card highlight style={{ gap: Spacing.md, alignItems: 'center' }}>
        <Text style={ui.statLabel}>YOUR INVITE CODE</Text>
        <Text style={{ color: Colors.lime, fontSize: 36, fontWeight: '900', letterSpacing: 8 }}>{me?.invite_code ?? '······'}</Text>
        <View style={{ alignSelf: 'stretch' }}>
          <Button title="Invite friends" icon="share-social" onPress={invite} />
        </View>
      </Card>

      <Card style={{ gap: Spacing.md }}>
        <SectionTitle>Find friends</SectionTitle>
        <View style={s.search}>
          <Ionicons name="search" size={18} color={Colors.textMuted} />
          <TextInput
            style={{ flex: 1, color: Colors.text, fontSize: 16, paddingVertical: 10 }}
            placeholder="Search by name"
            placeholderTextColor={Colors.textFaint}
            value={query}
            onChangeText={setQuery}
            autoCorrect={false}
          />
        </View>
        {results.map((p) => (
          <View key={p.id} style={s.row}>
            <Avatar name={p.display_name} url={p.avatar_url} level={p.level} />
            <Text style={[ui.text, { flex: 1, fontWeight: '700' }]}>{p.display_name}</Text>
            {knownIds.has(p.id) ? (
              <Text style={ui.muted}>Added</Text>
            ) : (
              <Pressable style={s.pill} onPress={run(() => addFriend(p.id), `Request sent to ${p.display_name}!`)}>
                <Text style={s.pillText}>Add</Text>
              </Pressable>
            )}
          </View>
        ))}
        {query.trim().length >= 2 && results.length === 0 && <Text style={ui.muted}>No one found with that name.</Text>}
        <View style={{ flexDirection: 'row', gap: Spacing.sm, alignItems: 'center' }}>
          <TextInput
            style={[ui.input, { flex: 1 }]}
            placeholder="Or enter an invite code"
            placeholderTextColor={Colors.textFaint}
            autoCapitalize="characters"
            value={code}
            onChangeText={setCode}
          />
          <Pressable
            disabled={code.trim().length < 6}
            style={[s.pill, { paddingVertical: 14 }, code.trim().length < 6 && { opacity: 0.4 }]}
            onPress={run(async () => {
              const name = await addFriendByCode(code);
              setCode('');
              return name;
            }, 'Friend request sent!')}>
            <Text style={s.pillText}>Add</Text>
          </Pressable>
        </View>
      </Card>

      {incoming.length > 0 && (
        <Card style={{ gap: Spacing.md }}>
          <SectionTitle>Requests</SectionTitle>
          {incoming.map((f) => (
            <View key={f.id} style={s.row}>
              <Avatar name={f.friend.display_name} url={f.friend.avatar_url} level={f.friend.level} />
              <Text style={[ui.text, { flex: 1, fontWeight: '700' }]}>{f.friend.display_name}</Text>
              <Pressable style={s.pill} onPress={run(() => acceptFriend(f.id))}>
                <Text style={s.pillText}>Accept</Text>
              </Pressable>
              <Pressable hitSlop={10} onPress={run(() => removeFriend(f.id))}>
                <Ionicons name="close" size={22} color={Colors.textMuted} />
              </Pressable>
            </View>
          ))}
        </Card>
      )}

      <Card style={{ gap: Spacing.md }}>
        <SectionTitle action={<Text style={ui.muted}>{accepted.length}</Text>}>Your friends</SectionTitle>
        {accepted.length === 0 && <Text style={ui.muted}>No friends yet — search above or share your code.</Text>}
        {accepted.map((f) => {
          const isCoach = coaches.includes(f.friend.id);
          return (
            <View key={f.id} style={{ gap: 6 }}>
              <View style={s.row}>
                <Avatar name={f.friend.display_name} url={f.friend.avatar_url} level={f.friend.level} />
                <View style={{ flex: 1 }}>
                  <Text style={[ui.text, { fontWeight: '700' }]}>{f.friend.display_name}</Text>
                  <Text style={ui.muted}>Level {f.friend.level} · 🔥 {f.friend.streak}</Text>
                </View>
                <Pressable
                  hitSlop={10}
                  onPress={() =>
                    Alert.alert('Remove friend?', `Remove ${f.friend.display_name} from your friends?`, [
                      { text: 'Cancel', style: 'cancel' },
                      { text: 'Remove', style: 'destructive', onPress: run(() => removeFriend(f.id)) },
                    ])
                  }>
                  <Ionicons name="person-remove-outline" size={18} color={Colors.textFaint} />
                </Pressable>
              </View>
              <View style={s.coachRow}>
                <Text style={[ui.muted, { flex: 1 }]}>Coach — can see my calories & meals</Text>
                <Switch
                  value={isCoach}
                  onValueChange={(on) => {
                    setCoaches((c) => (on ? [...c, f.friend.id] : c.filter((x) => x !== f.friend.id)));
                    setCoach(f.friend.id, on).catch(() => load());
                  }}
                  trackColor={{ true: Colors.lime, false: Colors.border }}
                  thumbColor={Colors.text}
                />
              </View>
            </View>
          );
        })}
      </Card>

      {outgoing.length > 0 && (
        <Card style={{ gap: Spacing.sm }}>
          <SectionTitle>Sent requests</SectionTitle>
          {outgoing.map((f) => (
            <View key={f.id} style={s.row}>
              <Avatar name={f.friend.display_name} url={f.friend.avatar_url} size={32} />
              <Text style={[ui.text, { flex: 1 }]}>{f.friend.display_name}</Text>
              <Text style={ui.muted}>Pending</Text>
            </View>
          ))}
        </Card>
      )}
    </FormScroll>
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
  row: { flexDirection: 'row', alignItems: 'center', gap: Spacing.md },
  coachRow: { flexDirection: 'row', alignItems: 'center', paddingLeft: 52 },
  pill: { backgroundColor: Colors.lime, paddingHorizontal: 16, paddingVertical: 8, borderRadius: Radius.pill },
  pillText: { color: Colors.background, fontWeight: '800' },
});
