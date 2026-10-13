import { useState } from 'react';
import { Text, View } from 'react-native';

import { defineControls, type ControlValues } from '../../demo-kit/types';
import { useKinetikTheme } from '../../shared/tokens/theme';
import { ScrollTabs } from './scroll-tabs';

export const controls = defineControls({
  haptics: { type: 'boolean', label: 'Haptics', default: true },
});

const TOPICS: Record<string, string[]> = {
  'For you': ['Quiet interfaces', 'Why springs feel right', 'A week without notifications'],
  Following: ['Maya shared a new board', 'Leo started a thread', 'Ines posted a photo set'],
  Design: ['Type scales that breathe', 'Grey is a colour', 'Designing empty states'],
  Engineering: ['Worklets in practice', 'Measuring frame time', 'The cost of a re-render'],
  Research: ['Five interviews, one insight', 'Diary studies on a budget', 'Card sorting, again'],
  Writing: ['Verbs on buttons', 'Error messages that help', 'Cutting the last ten percent'],
};

function Feed({ items }: { items: string[] }) {
  const { colors, font, radius, space } = useKinetikTheme();
  return (
    <View style={{ gap: space[2], paddingTop: space[3] }}>
      {items.map((title, i) => (
        <View
          key={title}
          style={{
            backgroundColor: colors.surface,
            borderColor: colors.border,
            borderWidth: 1,
            borderRadius: radius.md,
            padding: space[4],
            gap: 4,
          }}
        >
          <Text
            style={{ color: colors.text, fontSize: font.size.md, fontWeight: font.weight.medium }}
          >
            {title}
          </Text>
          <Text style={{ color: colors.textSubtle, fontSize: font.size.xs }}>
            {3 + i * 2} min read
          </Text>
        </View>
      ))}
    </View>
  );
}

export default function ScrollTabsDemo({ haptics }: ControlValues<typeof controls>) {
  const { colors, font } = useKinetikTheme();
  const [index, setIndex] = useState(0);
  const names = Object.keys(TOPICS);
  return (
    <View style={{ gap: 8 }}>
      <ScrollTabs
        haptics={haptics}
        onIndexChange={setIndex}
        tabs={names.map((name) => ({
          key: name,
          title: name,
          content: <Feed items={TOPICS[name]!} />,
        }))}
      />
      <Text style={{ color: colors.textSubtle, fontSize: font.size.xs, textAlign: 'center' }}>
        Swipe the cards or tap a tab · {names[index]}
      </Text>
    </View>
  );
}
