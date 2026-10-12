import { Image, StyleSheet, Text, View } from 'react-native';

import { photo, photos, type PhotoKey } from '../../demo-kit/photos';
import { defineControls, type ControlValues } from '../../demo-kit/types';
import { useKinetikTheme } from '../../shared/tokens/theme';
import { DriftMarquee } from './drift-marquee';

export const controls = defineControls({
  speed: { type: 'number', label: 'Speed (pt/s)', min: 0, max: 120, step: 4, default: 32 },
  lean: { type: 'number', label: 'Lean', min: 0, max: 1, step: 0.1, default: 0.6 },
});

const TOP: PhotoKey[] = [
  'whiteSands',
  'mistLake',
  'lastLight',
  'huacachina',
  'snowRidge',
  'pastelTide',
];
const BOTTOM: PhotoKey[] = [
  'lonePalm',
  'nightPeak',
  'cloudForest',
  'blueHour',
  'morningHaze',
  'highlandLake',
];

export default function DriftMarqueeDemo({ speed, lean }: ControlValues<typeof controls>) {
  const { colors, font, space, radius } = useKinetikTheme();
  return (
    <View style={{ gap: space[2], marginHorizontal: -space[6] }}>
      <DriftMarquee itemWidth={176} height={232} speed={speed} lean={lean}>
        {TOP.map((key) => (
          <View
            key={key}
            style={{ flex: 1, gap: space[2] }}
            accessible
            accessibilityLabel={`${photos[key].title}, ${photos[key].place}`}
          >
            <Image
              source={photo(key)}
              style={[styles.picture, { borderRadius: radius.lg }]}
              resizeMode="cover"
            />
            <View style={{ paddingHorizontal: 2 }}>
              <Text
                numberOfLines={1}
                style={{
                  color: colors.text,
                  fontSize: font.size.sm,
                  fontWeight: font.weight.semibold,
                }}
              >
                {photos[key].title}
              </Text>
              <Text numberOfLines={1} style={{ color: colors.textSubtle, fontSize: font.size.xs }}>
                {photos[key].place}
              </Text>
            </View>
          </View>
        ))}
      </DriftMarquee>
      <DriftMarquee itemWidth={112} height={136} speed={speed * 0.7} lean={lean} direction="right">
        {BOTTOM.map((key) => (
          <Image
            key={key}
            source={photo(key)}
            style={[styles.picture, { borderRadius: radius.md }]}
            resizeMode="cover"
            accessibilityLabel={photos[key].title}
          />
        ))}
      </DriftMarquee>
    </View>
  );
}

const styles = StyleSheet.create({
  picture: { flex: 1, width: '100%' },
});
