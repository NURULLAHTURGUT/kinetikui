import { useState } from 'react';
import { Text, View } from 'react-native';

import { defineControls, type ControlValues } from '../../demo-kit/types';
import { useKinetikTheme } from '../../shared/tokens/theme';
import { MorphSelect } from './morph-select';

export const controls = defineControls({
  maxVisible: {
    type: 'number',
    label: 'Rows before scrolling',
    min: 3,
    max: 8,
    step: 1,
    default: 5,
  },
  haptics: { type: 'boolean', label: 'Haptics', default: true },
});

const ZONES = [
  { value: 'lis', label: 'Lisbon', description: 'Western European Time, UTC+0' },
  { value: 'lon', label: 'London', description: 'Greenwich Mean Time, UTC+0' },
  { value: 'ber', label: 'Berlin', description: 'Central European Time, UTC+1' },
  { value: 'ist', label: 'Istanbul', description: 'Turkey Time, UTC+3' },
  { value: 'dxb', label: 'Dubai', description: 'Gulf Standard Time, UTC+4' },
  { value: 'sgp', label: 'Singapore', description: 'Singapore Time, UTC+8' },
  { value: 'tyo', label: 'Tokyo', description: 'Japan Standard Time, UTC+9' },
];

export default function MorphSelectDemo({ maxVisible, haptics }: ControlValues<typeof controls>) {
  const { colors, font, space } = useKinetikTheme();
  const [zone, setZone] = useState<string | null>('ist');
  return (
    <View style={{ gap: space[3] }}>
      <MorphSelect
        label="Time zone"
        options={ZONES}
        value={zone}
        onValueChange={setZone}
        maxVisible={maxVisible}
        haptics={haptics}
      />
      <Text style={{ color: colors.textSubtle, fontSize: font.size.xs }}>
        Meetings are shown in this time zone.
      </Text>
    </View>
  );
}
