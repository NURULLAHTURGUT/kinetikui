import { useState } from 'react';
import { Text, View } from 'react-native';

import { defineControls, type ControlValues } from '../../demo-kit/types';
import { useKinetikTheme } from '../../shared/tokens/theme';
import { SignaturePad } from './signature-pad';

export const controls = defineControls({
  maxWidth: { type: 'number', label: 'Ink width', min: 2.5, max: 7, step: 0.5, default: 4.5 },
  haptics: { type: 'boolean', label: 'Haptics', default: true },
});

export default function SignaturePadDemo({ maxWidth, haptics }: ControlValues<typeof controls>) {
  const { colors, font, space } = useKinetikTheme();
  const [count, setCount] = useState(0);
  return (
    <View style={{ gap: space[3] }}>
      <View style={{ gap: 2 }}>
        <Text
          style={{ color: colors.text, fontSize: font.size.lg, fontWeight: font.weight.semibold }}
        >
          Sign to accept
        </Text>
        <Text style={{ color: colors.textMuted, fontSize: font.size.sm }}>
          Lease for 14 Harbour Lane, from 1 November.
        </Text>
      </View>
      <SignaturePad
        maxWidth={maxWidth}
        haptics={haptics}
        onChange={(strokes) => setCount(strokes.length)}
      />
      <Text style={{ color: colors.textSubtle, fontSize: font.size.xs }}>
        {count === 0 ? 'Draw slowly for a bolder line.' : `${count} strokes`}
      </Text>
    </View>
  );
}
