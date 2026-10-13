import { useState } from 'react';
import { View } from 'react-native';

import { defineControls, type ControlValues } from '../../demo-kit/types';
import { useKinetikTheme } from '../../shared/tokens/theme';
import { GrowArea } from './grow-area';

export const controls = defineControls({
  maxLength: { type: 'number', label: 'Limit', min: 60, max: 400, step: 20, default: 160 },
  maxLines: { type: 'number', label: 'Max lines', min: 4, max: 12, step: 1, default: 6 },
});

export default function GrowAreaDemo({ maxLength, maxLines }: ControlValues<typeof controls>) {
  const { space } = useKinetikTheme();
  const [bio, setBio] = useState(
    'Product designer in Lisbon. I like quiet interfaces, long walks and good coffee.',
  );
  return (
    <View style={{ gap: space[4] }}>
      <GrowArea
        label="About you"
        placeholder="A line or two about yourself"
        value={bio}
        onChangeText={setBio}
        maxLength={maxLength}
        minLines={2}
        maxLines={maxLines}
      />
    </View>
  );
}
