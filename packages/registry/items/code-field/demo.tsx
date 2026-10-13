import { useEffect, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { DemoIcon } from '../../demo-kit/icons';
import { defineControls, type ControlValues } from '../../demo-kit/types';
import { useKinetikTheme } from '../../shared/tokens/theme';
import { minTouchTarget } from '../../shared/tokens/tokens';
import { CodeField, type CodeFieldStatus } from './code-field';

export const controls = defineControls({
  length: { type: 'number', label: 'Digits', min: 4, max: 6, step: 1, default: 6 },
  secure: { type: 'boolean', label: 'Secure', default: false },
});

/** The demo accepts this code (cut to the chosen length); anything else is wrong. */
const RIGHT = '204816';

export default function CodeFieldDemo({ length, secure }: ControlValues<typeof controls>) {
  const { colors, font, space, radius } = useKinetikTheme();
  const [code, setCode] = useState('');
  const [status, setStatus] = useState<CodeFieldStatus>('idle');

  // Start over when the length changes, and after a result has been shown.
  const [forLength, setForLength] = useState(length);
  if (forLength !== length) {
    setForLength(length);
    setCode('');
    setStatus('idle');
  }
  useEffect(() => {
    if (status === 'idle') return;
    const id = setTimeout(() => {
      setStatus('idle');
      setCode('');
    }, 1800);
    return () => clearTimeout(id);
  }, [status]);

  return (
    <View
      style={[
        styles.card,
        {
          backgroundColor: colors.surface,
          borderColor: colors.border,
          borderRadius: radius.xl,
          padding: space[5],
          gap: space[4],
        },
      ]}
    >
      <View style={[styles.badge, { backgroundColor: colors.azureSoft, borderRadius: radius.md }]}>
        <DemoIcon name="message" color={colors.azure} size={22} />
      </View>
      <View style={{ gap: 4 }}>
        <Text
          style={{ color: colors.text, fontSize: font.size.lg, fontWeight: font.weight.semibold }}
        >
          Check your messages
        </Text>
        <Text style={{ color: colors.textMuted, fontSize: font.size.sm }}>
          {status === 'success'
            ? 'Verified. Welcome back.'
            : status === 'error'
              ? 'That code did not match. Try again.'
              : `Enter the code we sent to •• 48. Try ${RIGHT.slice(0, length)}.`}
        </Text>
      </View>
      <CodeField
        value={code}
        onChangeText={(v) => {
          setCode(v);
          if (status !== 'idle') setStatus('idle');
        }}
        onComplete={(c) => setStatus(c === RIGHT.slice(0, length) ? 'success' : 'error')}
        length={length}
        secure={secure}
        status={status}
      />
      <Pressable
        accessibilityRole="button"
        onPress={() => {
          setCode(RIGHT.slice(0, length));
          setStatus('success');
        }}
        style={({ pressed }) => [styles.link, { opacity: pressed ? 0.6 : 1 }]}
      >
        <Text
          style={{ color: colors.azure, fontSize: font.size.sm, fontWeight: font.weight.semibold }}
        >
          Paste from messages
        </Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  card: { borderWidth: StyleSheet.hairlineWidth },
  badge: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center' },
  link: { minHeight: minTouchTarget, justifyContent: 'center', alignSelf: 'flex-start' },
});
