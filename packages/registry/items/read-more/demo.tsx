import { Image, StyleSheet, Text, View } from 'react-native';

import { photo } from '../../demo-kit/photos';
import { defineControls, type ControlValues } from '../../demo-kit/types';
import { useKinetikTheme } from '../../shared/tokens/theme';
import { ReadMore } from './read-more';

export const controls = defineControls({
  lines: { type: 'number', label: 'Lines', min: 2, max: 5, step: 1, default: 3 },
});

const ABOUT =
  'A cabin on stilts at the edge of a quiet highland lake, an hour past the last village. ' +
  'Mornings start in mist that lifts off the water by nine; evenings are long and gold.\n\n' +
  'Inside there is one room with a wood stove, a double bed under the window and a small kitchen with a two-ring hob. ' +
  'The deck runs the length of the cabin and steps straight down into the water, cold even in August.\n\n' +
  'A rowing boat and two kayaks are yours to use. The trail to the ridge starts at the gate and takes about three hours there and back.';

export default function ReadMoreDemo({ lines }: ControlValues<typeof controls>) {
  const { colors, font, space, radius } = useKinetikTheme();

  return (
    <View
      style={[
        styles.card,
        { backgroundColor: colors.surface, borderColor: colors.border, borderRadius: radius.xl },
      ]}
    >
      <Image source={photo('highlandLake')} style={styles.cover} accessibilityIgnoresInvertColors />
      <View style={{ padding: space[5], gap: space[2] }}>
        <Text
          style={{ color: colors.text, fontSize: font.size.lg, fontWeight: font.weight.semibold }}
        >
          About the cabin
        </Text>
        <ReadMore key={lines} lines={lines}>
          {ABOUT}
        </ReadMore>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: { borderWidth: StyleSheet.hairlineWidth, overflow: 'hidden' },
  cover: { width: '100%', height: 150 },
});
