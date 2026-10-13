import type { ReactNode } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { defineControls, type ControlValues } from '../../demo-kit/types';
import { useKinetikTheme } from '../../shared/tokens/theme';
import { DotLoader } from './dot-loader';

export const controls = defineControls({
  size: { type: 'number', label: 'Size', min: 6, max: 14, step: 1, default: 8 },
  period: { type: 'number', label: 'Period (ms)', min: 700, max: 1800, step: 100, default: 1100 },
});

export default function DotLoaderDemo({ size, period }: ControlValues<typeof controls>) {
  const { colors, font, space, radius } = useKinetikTheme();

  const panel = (title: string, children: ReactNode) => (
    <View
      style={[
        styles.panel,
        {
          backgroundColor: colors.surface,
          borderColor: colors.border,
          borderRadius: radius.lg,
          gap: space[3],
        },
      ]}
    >
      <View style={styles.stage}>{children}</View>
      <Text
        style={{
          color: colors.textSubtle,
          fontSize: font.size.xs,
          fontWeight: font.weight.semibold,
        }}
      >
        {title}
      </Text>
    </View>
  );

  return (
    <View style={{ gap: space[3] }}>
      <View style={styles.pair}>
        {panel('Wave', <DotLoader size={size} period={period} color={colors.azure} />)}
        {panel(
          'Pulse',
          <DotLoader variant="pulse" size={size} period={period} color={colors.text} />,
        )}
      </View>
      <View
        style={[
          styles.chat,
          {
            backgroundColor: colors.surface,
            borderColor: colors.border,
            borderRadius: radius.lg,
            padding: space[4],
            gap: space[2],
          },
        ]}
      >
        <View
          style={[
            styles.mine,
            {
              backgroundColor: colors.azure,
              borderRadius: radius.lg,
              borderBottomRightRadius: radius.xs,
            },
          ]}
        >
          <Text style={{ color: colors.onAzure, fontSize: font.size.sm }}>
            Is the lake cabin free next weekend?
          </Text>
        </View>
        <DotLoader
          variant="typing"
          size={size}
          period={period}
          accessibilityLabel="The host is typing"
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  pair: { flexDirection: 'row', gap: 12 },
  panel: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 20,
    borderWidth: StyleSheet.hairlineWidth,
  },
  stage: { height: 40, justifyContent: 'center' },
  chat: { borderWidth: StyleSheet.hairlineWidth },
  mine: { alignSelf: 'flex-end', paddingHorizontal: 14, paddingVertical: 10, maxWidth: '80%' },
});
