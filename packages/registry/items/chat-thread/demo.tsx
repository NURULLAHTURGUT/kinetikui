import { useEffect, useState } from 'react';
import { Pressable, Text, View } from 'react-native';

import { defineControls, type ControlValues } from '../../demo-kit/types';
import { useKinetikTheme } from '../../shared/tokens/theme';
import { ChatThread, type ChatMessage } from './chat-thread';

export const controls = defineControls({
  replies: { type: 'boolean', label: 'Maya replies', default: true },
});

const START: ChatMessage[] = [
  { id: 'a', from: 'them', text: 'Are we still on for Saturday?' },
  { id: 'b', from: 'them', text: 'The forecast finally looks good', time: '09:40' },
  { id: 'c', from: 'me', text: 'Yes! Meet at the station at 8?', time: '09:41' },
];

const MINE = ['I will bring coffee', 'Shall we take the coast path?', 'See you there'];
const THEIRS = ['Perfect, see you then', 'Coast path, definitely', 'Bring a jacket, it gets windy'];

export default function ChatThreadDemo({ replies }: ControlValues<typeof controls>) {
  const { colors, font, radius, space } = useKinetikTheme();
  const [messages, setMessages] = useState(START);
  const [typing, setTyping] = useState(false);
  const [turn, setTurn] = useState(0);

  // Maya types for a moment after each of your messages, then answers.
  useEffect(() => {
    if (!replies || turn === 0) return;
    const start = setTimeout(() => setTyping(true), 700);
    const answer = setTimeout(() => {
      setTyping(false);
      setMessages((m) => [
        ...m,
        { id: `t${turn}`, from: 'them', text: THEIRS[(turn - 1) % THEIRS.length]!, time: 'now' },
      ]);
    }, 2400);
    return () => {
      clearTimeout(start);
      clearTimeout(answer);
    };
  }, [turn, replies]);

  const send = () => {
    const text = MINE[turn % MINE.length]!;
    setMessages((m) => [...m.slice(-8), { id: `m${turn}`, from: 'me', text, time: 'now' }]);
    setTurn((t) => t + 1);
  };

  const last = messages[messages.length - 1];
  return (
    <View style={{ gap: space[4] }}>
      <ChatThread messages={messages} typing={typing} seen={last?.from === 'me'} name="Maya" />
      <Pressable
        onPress={send}
        accessibilityRole="button"
        accessibilityLabel="Send a message"
        style={({ pressed }) => ({
          minHeight: 44,
          borderRadius: radius.pill,
          paddingHorizontal: space[4],
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'space-between',
          backgroundColor: colors.surface,
          borderWidth: 1,
          borderColor: colors.border,
          opacity: pressed ? 0.8 : 1,
        })}
      >
        <Text style={{ color: colors.textSubtle, fontSize: font.size.sm }}>
          {MINE[turn % MINE.length]}
        </Text>
        <Text
          style={{ color: colors.azure, fontSize: font.size.sm, fontWeight: font.weight.semibold }}
        >
          Send
        </Text>
      </Pressable>
    </View>
  );
}
