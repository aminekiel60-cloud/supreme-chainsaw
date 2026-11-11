/** COMMENTS — read and write comments on a feed post. */
import { Ionicons } from '@expo/vector-icons';
import { Stack, useLocalSearchParams } from 'expo-router';
import { useHeaderHeight } from 'expo-router/react-navigation';
import { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, FlatList, KeyboardAvoidingView, Pressable, Text, TextInput, View } from 'react-native';

import { Card, styles as ui } from '@/components/ui';
import { Colors, Spacing } from '@/constants/theme';
import { addComment, getComments, type Comment } from '@/lib/social';

export default function CommentsScreen() {
  const { id, title } = useLocalSearchParams<{ id: string; title?: string }>();
  const [comments, setComments] = useState<Comment[] | null>(null);
  const [text, setText] = useState('');
  const [sending, setSending] = useState(false);
  // Android apps are edge-to-edge, so the input bar must be lifted above the keyboard explicitly.
  const headerHeight = useHeaderHeight();

  const load = useCallback(() => {
    getComments(id).then(setComments).catch(() => setComments([]));
  }, [id]);

  useEffect(load, [load]);

  const send = async () => {
    if (!text.trim()) return;
    setSending(true);
    try {
      await addComment(id, text);
      setText('');
      load();
    } finally {
      setSending(false);
    }
  };

  return (
    <KeyboardAvoidingView style={{ flex: 1, backgroundColor: Colors.background }} behavior="padding" keyboardVerticalOffset={headerHeight}>
      <Stack.Screen options={{ title: title ?? 'Comments' }} />
      {comments === null ? (
        <ActivityIndicator color={Colors.lime} style={{ marginTop: 40 }} />
      ) : (
        <FlatList
          data={comments}
          keyExtractor={(c) => String(c.id)}
          contentContainerStyle={{ padding: 16, gap: 10 }}
          ListEmptyComponent={<Text style={[ui.muted, { textAlign: 'center' }]}>No comments yet. Be the first! 💬</Text>}
          renderItem={({ item }) => (
            <Card style={{ padding: 12, gap: 4 }}>
              <Text style={{ color: item.author === 'You' ? Colors.lime : Colors.text, fontWeight: '700' }}>{item.author}</Text>
              <Text style={ui.text}>{item.body}</Text>
            </Card>
          )}
        />
      )}
      <View style={{ flexDirection: 'row', gap: Spacing.sm, padding: 12, borderTopWidth: 1, borderTopColor: Colors.border }}>
        <TextInput
          style={[ui.input, { flex: 1 }]}
          placeholder="Write a comment…"
          placeholderTextColor={Colors.textFaint}
          value={text}
          onChangeText={setText}
          maxLength={500}
        />
        <Pressable
          onPress={send}
          disabled={sending || !text.trim()}
          style={{ width: 48, borderRadius: 24, backgroundColor: Colors.lime, alignItems: 'center', justifyContent: 'center', opacity: text.trim() ? 1 : 0.4 }}>
          <Ionicons name="send" size={18} color={Colors.background} />
        </Pressable>
      </View>
    </KeyboardAvoidingView>
  );
}
