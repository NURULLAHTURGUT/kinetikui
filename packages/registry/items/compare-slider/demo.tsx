import { useState } from 'react';
import { Image, StyleSheet, Text, View } from 'react-native';

import { photo, type PhotoKey } from '../../demo-kit/photos';
import { defineControls, type ControlValues } from '../../demo-kit/types';
import { useKinetikTheme } from '../../shared/tokens/theme';
import { CompareSlider } from './compare-slider';

export const controls = defineControls({
  photo: {
    type: 'select',
    label: 'Photo',
    options: ['snowRidge', 'stillWater', 'highlandLake'],
    default: 'snowRidge',
  },
  hint: { type: 'boolean', label: 'Hint on mount', default: true },
});

export default function CompareSliderDemo({ photo: key, hint }: ControlValues<typeof controls>) {
  const { colors, font, space } = useKinetikTheme();
  const [position, setPosition] = useState(0.5);
  const source = photo(key as PhotoKey);

  return (
    <View style={{ gap: space[3] }}>
      <CompareSlider
        key={`${key}-${hint}`}
        accessibilityLabel="Blue hour grade"
        beforeLabel="Original"
        afterLabel="Graded"
        hint={hint}
        onPositionChange={setPosition}
        before={<Image source={source} style={styles.fill} accessibilityIgnoresInvertColors />}
        after={
          <View style={styles.fill}>
            <Image source={source} style={styles.fill} accessibilityIgnoresInvertColors />
            {/* A cool, deeper grade: a blue wash multiplied over the photo. */}
            <View style={[styles.fill, styles.grade, { backgroundColor: colors.azure }]} />
          </View>
        }
      />
      <Text style={{ color: colors.textMuted, fontSize: font.size.sm, textAlign: 'center' }}>
        Drag across the photo · {Math.round(position * 100)}% original
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  fill: { ...StyleSheet.absoluteFill, width: '100%', height: '100%' },
  grade: { opacity: 0.35, mixBlendMode: 'multiply' },
});
