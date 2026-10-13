import { useState } from 'react';
import { Text, View } from 'react-native';

import { defineControls, type ControlValues } from '../../demo-kit/types';
import { useKinetikTheme } from '../../shared/tokens/theme';
import { TagField } from './tag-field';

export const controls = defineControls({
  maxTags: { type: 'number', label: 'Limit', min: 3, max: 10, step: 1, default: 6 },
  haptics: { type: 'boolean', label: 'Haptics', default: true },
});

export default function TagFieldDemo({ maxTags, haptics }: ControlValues<typeof controls>) {
  const { colors, font, space } = useKinetikTheme();
  const [tags, setTags] = useState(['typography', 'motion', 'colour']);
  return (
    <View style={{ gap: space[3] }}>
      <TagField
        label="Topics you follow"
        value={tags}
        onChange={setTags}
        maxTags={maxTags}
        validate={(t) => t.length <= 20}
        haptics={haptics}
      />
      <Text style={{ color: colors.textSubtle, fontSize: font.size.xs }}>
        Type and press Return or a comma. Backspace twice in the empty field removes the last one.
      </Text>
    </View>
  );
}
