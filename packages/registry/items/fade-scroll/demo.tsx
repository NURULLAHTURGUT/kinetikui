import { Text, View } from 'react-native';

import { defineControls, type ControlValues } from '../../demo-kit/types';
import { useKinetikTheme } from '../../shared/tokens/theme';
import { FadeScroll } from './fade-scroll';

export const controls = defineControls({
  fadeSize: { type: 'number', label: 'Fade length', min: 12, max: 64, step: 4, default: 32 },
  indicator: { type: 'boolean', label: 'Indicator', default: true },
});

const SECTIONS = [
  ['What we collect', 'Your name, email and the projects you create. Nothing else.'],
  ['How we use it', 'To run your account, send receipts and keep your work safe.'],
  ['Who sees it', 'Only you and the people you invite. We never sell data.'],
  ['How long we keep it', 'Until you delete your account, then 30 days of backups.'],
  ['Your choices', 'Export everything or delete it at any time from Settings.'],
  ['Changes', 'We will email you a month before anything here changes.'],
];

const CHIPS = ['Typography', 'Motion', 'Colour', 'Layout', 'Icons', 'Sound', 'Haptics', 'Copy'];

export default function FadeScrollDemo({ fadeSize, indicator }: ControlValues<typeof controls>) {
  const { colors, font, radius, space } = useKinetikTheme();
  return (
    <View style={{ gap: space[5] }}>
      <FadeScroll
        accessibilityLabel="Privacy summary"
        fadeSize={fadeSize}
        indicator={indicator}
        style={{ height: 260 }}
        contentContainerStyle={{ gap: space[4], paddingVertical: space[2], paddingRight: space[3] }}
      >
        {SECTIONS.map(([title, body]) => (
          <View key={title} style={{ gap: 4 }}>
            <Text
              style={{
                color: colors.text,
                fontSize: font.size.md,
                fontWeight: font.weight.semibold,
              }}
            >
              {title}
            </Text>
            <Text style={{ color: colors.textMuted, fontSize: font.size.sm, lineHeight: 20 }}>
              {body}
            </Text>
          </View>
        ))}
      </FadeScroll>
      <FadeScroll
        horizontal
        accessibilityLabel="Topics"
        fadeSize={fadeSize}
        indicator={false}
        contentContainerStyle={{ gap: space[2] }}
      >
        {CHIPS.map((chip) => (
          <View
            key={chip}
            style={{
              paddingHorizontal: space[4],
              height: 36,
              justifyContent: 'center',
              borderRadius: radius.pill,
              backgroundColor: colors.surface,
              borderWidth: 1,
              borderColor: colors.border,
            }}
          >
            <Text style={{ color: colors.text, fontSize: font.size.sm }}>{chip}</Text>
          </View>
        ))}
      </FadeScroll>
    </View>
  );
}
