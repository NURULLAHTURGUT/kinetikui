import { useState } from 'react';
import { ImageBackground, StyleSheet, Text, View } from 'react-native';

import { photo, photos, type PhotoKey } from '../../demo-kit/photos';
import { defineControls, type ControlValues } from '../../demo-kit/types';
import { gradient } from '../../shared/tokens/gradient';
import { useKinetikTheme } from '../../shared/tokens/theme';
import { withAlpha } from '../../shared/tokens/tokens';
import { Typewriter } from './typewriter';

export const controls = defineControls({
  caret: {
    type: 'select',
    label: 'Caret',
    options: ['bar', 'block', 'underscore'],
    default: 'bar',
  },
  speed: { type: 'number', label: 'Speed (ms)', min: 25, max: 120, step: 5, default: 55 },
});

const PLACES: { key: PhotoKey; line: string }[] = [
  { key: 'huacachina', line: 'an oasis in the dunes.' },
  { key: 'snowRidge', line: 'a ridge above the clouds.' },
  { key: 'lonePalm', line: 'the edge of Fiji.' },
];

export default function TypewriterDemo({ caret, speed }: ControlValues<typeof controls>) {
  const { colors, font, space, radius, scheme } = useKinetikTheme();
  const [at, setAt] = useState(0);
  const place = PLACES[at]!;
  // Light text over a photo needs a dark scrim in both schemes.
  const ink = scheme === 'dark' ? colors.background : colors.text;

  return (
    <ImageBackground
      source={photo(place.key)}
      resizeMode="cover"
      accessibilityLabel={`${photos[place.key].title}, ${photos[place.key].place}`}
      style={[styles.card, { borderRadius: radius.xl }]}
      imageStyle={{ borderRadius: radius.xl }}
    >
      <View
        style={[
          styles.scrim,
          { padding: space[6], gap: space[2] },
          gradient(
            `linear-gradient(180deg, ${withAlpha(ink, 0.1)} 0%, ${withAlpha(ink, 0.8)} 100%)`,
          ),
        ]}
      >
        <Text
          style={{
            color: withAlpha(colors.highlight, 0.7),
            fontSize: font.size.xs,
            fontWeight: font.weight.semibold,
            letterSpacing: 1.2,
            textTransform: 'uppercase',
          }}
        >
          {photos[place.key].place}
        </Text>
        <Typewriter
          prefix="Wake up at "
          phrases={PLACES.map((p) => p.line)}
          caret={caret}
          speed={speed}
          caretColor={colors.sky}
          // The photo follows each line once it has been typed.
          onPhraseTyped={(i) => setAt(i)}
          style={{ color: colors.highlight, fontSize: font.size['2xl'], lineHeight: 34 }}
          prefixStyle={{ color: withAlpha(colors.highlight, 0.72), fontWeight: font.weight.medium }}
          containerStyle={{ minHeight: 68 }}
        />
      </View>
    </ImageBackground>
  );
}

const styles = StyleSheet.create({
  card: { width: '100%', aspectRatio: 1.1, overflow: 'hidden' },
  scrim: { flex: 1, justifyContent: 'flex-end' },
});
