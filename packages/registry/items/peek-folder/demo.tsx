import { useState } from 'react';
import { Text, View } from 'react-native';

import { defineControls, type ControlValues } from '../../demo-kit/types';
import { useKinetikTheme } from '../../shared/tokens/theme';
import { PeekFolder } from './peek-folder';

export const controls = defineControls({
  arrow: { type: 'boolean', label: 'Arrow button', default: true },
});

// Glyphs from Tabler Icons (MIT): typography, shapes and sparkles.
const TYPE = 'M4 20l3 0 M14 20l7 0 M6.9 15l6.9 0 M10.2 6.3l5.8 13.7 M5 20l6 -16l2 0l7 16';
const SHAPES =
  'M12 3l-4 7h8z M17 17m-3 0a3 3 0 1 0 6 0a3 3 0 1 0 -6 0 M4 14m0 1a1 1 0 0 1 1 -1h4a1 1 0 0 1 1 1v4a1 1 0 0 1 -1 1h-4a1 1 0 0 1 -1 -1z';
const SPARK =
  'M16 18a2 2 0 0 1 2 2a2 2 0 0 1 2 -2a2 2 0 0 1 -2 -2a2 2 0 0 1 -2 2zm0 -12a2 2 0 0 1 2 2a2 2 0 0 1 2 -2a2 2 0 0 1 -2 -2a2 2 0 0 1 -2 2zm-7 12a6 6 0 0 1 6 -6a6 6 0 0 1 -6 -6a6 6 0 0 1 -6 6a6 6 0 0 1 6 6z';

export default function PeekFolderDemo({ arrow }: ControlValues<typeof controls>) {
  const { colors, font, space } = useKinetikTheme();
  const [opened, setOpened] = useState(0);
  return (
    <View style={{ width: '100%', maxWidth: 340, alignSelf: 'center', gap: space[3] }}>
      <PeekFolder
        label="Design assets"
        items={[
          { glyph: TYPE, color: 'hsl(22, 100%, 52%)' },
          { glyph: SHAPES, color: colors.text },
          { glyph: SPARK, color: 'hsl(212, 100%, 52%)' },
        ]}
        onOpen={arrow ? () => setOpened((n) => n + 1) : undefined}
      />
      <Text style={{ color: colors.textSubtle, fontSize: font.size.sm, textAlign: 'center' }}>
        {opened > 0 ? `Opened ${opened}×` : 'Tap or hover the folder'}
      </Text>
    </View>
  );
}
