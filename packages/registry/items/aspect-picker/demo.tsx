import { useState } from 'react';
import { Text, View } from 'react-native';

import { DemoIcon } from '../../demo-kit/icons';
import { defineControls, type ControlValues } from '../../demo-kit/types';
import { useKinetikTheme } from '../../shared/tokens/theme';
import { AspectPicker } from './aspect-picker';

export const controls = defineControls({
  haptics: { type: 'boolean', label: 'Haptics', default: true },
  disabled: { type: 'boolean', label: 'Disabled', default: false },
});

const RATIOS: Record<string, number> = { '1:1': 1, '3:2': 3 / 2, '2:3': 2 / 3 };

export default function AspectPickerDemo({ haptics, disabled }: ControlValues<typeof controls>) {
  const { colors, font, space, radius } = useKinetikTheme();
  const [ratio, setRatio] = useState('1:1');
  const [note, setNote] = useState<string | null>(null);
  const r = RATIOS[ratio] ?? 1;
  return (
    <View style={{ gap: space[3], width: '100%', maxWidth: 360, alignSelf: 'center' }}>
      {/* A crop preview that takes the picked shape. */}
      <View style={{ height: 150, alignItems: 'center', justifyContent: 'center' }}>
        <View
          style={{
            width: r >= 1 ? 150 : 150 * r,
            height: r >= 1 ? 150 / r : 150,
            borderRadius: radius.md,
            backgroundColor: colors.surface,
            borderWidth: 1.5,
            borderColor: colors.borderStrong,
          }}
        />
      </View>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
        <Text
          style={{ color: colors.text, fontSize: font.size.sm, fontWeight: font.weight.semibold }}
        >
          Aspect ratio
        </Text>
        <Text style={{ color: colors.textMuted, fontSize: font.size.xs }}>{note ?? ratio}</Text>
      </View>
      <AspectPicker
        value={ratio}
        onChange={(v) => {
          setRatio(v);
          setNote(null);
        }}
        action={{
          icon: <DemoIcon name="dots" color={colors.textMuted} size={22} />,
          label: 'More ratios',
          onPress: () => setNote('More ratios open here'),
        }}
        haptics={haptics}
        disabled={disabled}
      />
    </View>
  );
}
