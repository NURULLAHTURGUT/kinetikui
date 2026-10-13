import { useState } from 'react';
import { Text, View } from 'react-native';

import { defineControls, type ControlValues } from '../../demo-kit/types';
import { useKinetikTheme } from '../../shared/tokens/theme';
import { SplitPane } from './split-pane';

export const controls = defineControls({
  haptics: { type: 'boolean', label: 'Haptics', default: true },
});

const PLACES = [
  ['Café Lumen', '4 min walk'],
  ['Northside Books', '7 min walk'],
  ['Harbour Market', '11 min walk'],
  ['The Glasshouse', '15 min walk'],
  ['Old Mill Gallery', '18 min walk'],
];

export default function SplitPaneDemo({ haptics }: ControlValues<typeof controls>) {
  const { colors, font, radius, space } = useKinetikTheme();
  const [share, setShare] = useState(0.5);

  const card = {
    flex: 1,
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderWidth: 1,
    borderRadius: radius.lg,
    overflow: 'hidden' as const,
  };

  return (
    <View style={{ gap: space[2] }}>
      <SplitPane
        style={{ height: 420 }}
        haptics={haptics}
        onChange={setShare}
        first={
          <View style={[card, { padding: space[4], justifyContent: 'flex-end' }]}>
            {[0.2, 0.45, 0.7].map((x, i) => (
              <View
                key={x}
                style={{
                  position: 'absolute',
                  left: `${x * 100}%`,
                  top: `${30 + i * 18}%`,
                  width: 12,
                  height: 12,
                  borderRadius: 6,
                  backgroundColor: colors.azure,
                }}
              />
            ))}
            <Text style={{ color: colors.textSubtle, fontSize: font.size.xs }}>Map</Text>
          </View>
        }
        second={
          <View style={[card, { paddingHorizontal: space[4], paddingTop: space[2] }]}>
            {PLACES.map(([name, walk]) => (
              <View
                key={name}
                style={{
                  flexDirection: 'row',
                  justifyContent: 'space-between',
                  paddingVertical: space[3],
                  borderBottomWidth: 1,
                  borderBottomColor: colors.border,
                }}
              >
                <Text style={{ color: colors.text, fontSize: font.size.md }}>{name}</Text>
                <Text style={{ color: colors.textMuted, fontSize: font.size.sm }}>{walk}</Text>
              </View>
            ))}
          </View>
        }
      />
      <Text style={{ color: colors.textSubtle, fontSize: font.size.xs, textAlign: 'center' }}>
        Drag the handle · map takes {Math.round(share * 100)}%
      </Text>
    </View>
  );
}
