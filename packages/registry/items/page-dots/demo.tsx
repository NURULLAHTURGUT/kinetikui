import { useRef, useState } from 'react';
import { Image, StyleSheet, Text, View, type ScrollView } from 'react-native';
import Animated, { useAnimatedScrollHandler, useSharedValue } from 'react-native-reanimated';
import { scheduleOnRN } from 'react-native-worklets';

import { photo, photos, type PhotoKey } from '../../demo-kit/photos';
import { defineControls, type ControlValues } from '../../demo-kit/types';
import { useKinetikTheme } from '../../shared/tokens/theme';
import { PageDots } from './page-dots';

export const controls = defineControls({
  variant: { type: 'select', label: 'Variant', options: ['worm', 'expand'], default: 'worm' },
});

const SLIDES: PhotoKey[] = ['nightPeak', 'whiteSands', 'cloudForest', 'blueHour', 'lonePalm'];

export default function PageDotsDemo({ variant }: ControlValues<typeof controls>) {
  const { colors, font, space, radius } = useKinetikTheme();
  const [width, setWidth] = useState(0);
  const [page, setPage] = useState(0);
  const progress = useSharedValue(0);
  const scroller = useRef<ScrollView>(null);

  const onScroll = useAnimatedScrollHandler((e) => {
    if (width === 0) return;
    const p = e.contentOffset.x / width;
    progress.set(p);
    const rounded = Math.round(p);
    if (rounded !== page) scheduleOnRN(setPage, rounded);
  });

  const go = (i: number) => scroller.current?.scrollTo({ x: i * width, animated: true });

  return (
    <View style={{ gap: space[2] }}>
      <View
        onLayout={(e) => setWidth(e.nativeEvent.layout.width)}
        style={[styles.frame, { borderRadius: radius.xl, backgroundColor: colors.surface }]}
      >
        {width > 0 ? (
          <Animated.ScrollView
            ref={scroller}
            horizontal
            pagingEnabled
            showsHorizontalScrollIndicator={false}
            onScroll={onScroll}
            scrollEventThrottle={16}
          >
            {SLIDES.map((key) => (
              <View key={key} style={{ width }}>
                <Image source={photo(key)} style={styles.image} accessibilityIgnoresInvertColors />
                <View style={{ padding: space[4], gap: 2 }}>
                  <Text
                    style={{
                      color: colors.text,
                      fontSize: font.size.md,
                      fontWeight: font.weight.semibold,
                    }}
                  >
                    {photos[key].title}
                  </Text>
                  <Text style={{ color: colors.textMuted, fontSize: font.size.sm }}>
                    {photos[key].place}
                  </Text>
                </View>
              </View>
            ))}
          </Animated.ScrollView>
        ) : null}
      </View>
      <PageDots
        count={SLIDES.length}
        index={page}
        progress={progress}
        onPageChange={go}
        variant={variant}
        accessibilityLabel="Photo"
      />
    </View>
  );
}

const styles = StyleSheet.create({
  frame: { overflow: 'hidden', minHeight: 260 },
  image: { width: '100%', height: 200 },
});
