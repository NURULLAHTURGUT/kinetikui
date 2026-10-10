import {
  Canvas,
  LinearGradient,
  Text as SkiaText,
  matchFont,
  vec,
} from '@shopify/react-native-skia';
import { useEffect, useMemo } from 'react';
import {
  Platform,
  StyleSheet,
  Text,
  View,
  type StyleProp,
  type TextStyle,
  type ViewStyle,
} from 'react-native';
import {
  Easing,
  cancelAnimation,
  useDerivedValue,
  useSharedValue,
  withDelay,
  withRepeat,
  withTiming,
} from 'react-native-reanimated';

import { useReduceMotion } from '../../shared/hooks/use-reduce-motion';
import { useKinetikTheme } from '../../shared/tokens/theme';

export type ShineTextProps = {
  /** Single line of text. */
  text: string;
  /** Font size in pt. Defaults to 36. */
  fontSize?: number;
  /** Defaults to '800'. */
  fontWeight?: TextStyle['fontWeight'];
  /** Font family. Defaults to the system sans-serif. */
  fontFamily?: string;
  /** Base text colour. Defaults to the theme textMuted. */
  color?: string;
  /** Colour of the sheen. Defaults to the theme highlight. */
  shineColor?: string;
  /** Time for one sweep, in ms. Defaults to 1800. */
  duration?: number;
  /** Rest between sweeps, in ms. Defaults to 1400. */
  pause?: number;
  /** Stop sweeping, e.g. while off-screen. Defaults to true. */
  active?: boolean;
  style?: StyleProp<ViewStyle>;
};

const SYSTEM_FAMILY = Platform.select({ ios: 'Helvetica Neue', default: 'sans-serif' });

/**
 * A single line of text with a band of light sweeping across it. The sheen
 * is a real gradient masked by the glyphs: Skia on iOS and Android, CSS
 * background-clip on the web.
 */
export function ShineText(props: ShineTextProps) {
  return Platform.OS === 'web' ? <ShineTextWeb {...props} /> : <ShineTextNative {...props} />;
}

function useSheenColors(color?: string, shineColor?: string) {
  const { colors } = useKinetikTheme();
  return { base: color ?? colors.textMuted, shine: shineColor ?? colors.highlight };
}

function ShineTextNative({
  text,
  fontSize = 36,
  fontWeight = '800',
  fontFamily = SYSTEM_FAMILY,
  color,
  shineColor,
  duration = 1800,
  pause = 1400,
  active = true,
  style,
}: ShineTextProps) {
  const reduced = useReduceMotion();
  const { base, shine } = useSheenColors(color, shineColor);
  const font = useMemo(() => {
    try {
      return matchFont({ fontFamily, fontSize, fontWeight: fontWeight as never });
    } catch {
      // No such family on this device (or no Skia font manager).
      return null;
    }
  }, [fontFamily, fontSize, fontWeight]);
  // Without a matching system font (or a Skia runtime), fall back to plain text.
  const measured = useMemo(() => {
    if (!font) return null;
    const metrics = font.getMetrics();
    const ascent = Math.abs(metrics.ascent);
    return {
      width: Math.ceil(font.measureText(text).width) + 2,
      ascent,
      height: Math.ceil(ascent + Math.abs(metrics.descent) + 2),
    };
  }, [font, text]);
  const width = measured?.width ?? 0;
  const height = measured?.height ?? 0;
  const ascent = measured?.ascent ?? 0;
  const band = Math.max(fontSize * 2, width * 0.35);

  const progress = useSharedValue(0);
  useEffect(() => {
    if (reduced || !active) {
      cancelAnimation(progress);
      progress.set(0);
      return;
    }
    progress.set(0);
    progress.set(
      withRepeat(
        withDelay(pause, withTiming(1, { duration, easing: Easing.inOut(Easing.cubic) })),
        -1,
      ),
    );
    return () => cancelAnimation(progress);
  }, [reduced, active, duration, pause, progress]);

  // The sheen starts left of the text and leaves past its right edge.
  const start = useDerivedValue(() => vec(-band + progress.get() * (width + band), 0));
  const end = useDerivedValue(() => vec(progress.get() * (width + band), height * 0.4));

  if (!font || !measured) {
    return (
      <View accessible accessibilityRole="text" accessibilityLabel={text} style={style}>
        <Text numberOfLines={1} style={{ fontSize, fontWeight, fontFamily, color: base }}>
          {text}
        </Text>
      </View>
    );
  }

  return (
    <View
      accessible
      accessibilityRole="text"
      accessibilityLabel={text}
      style={[{ width, height }, style]}
    >
      <Canvas
        style={StyleSheet.absoluteFill}
        accessibilityElementsHidden
        importantForAccessibility="no"
      >
        <SkiaText x={0} y={ascent + 1} text={text} font={font} color={base}>
          {!reduced && (
            <LinearGradient
              start={start}
              end={end}
              colors={[base, base, shine, base, base]}
              positions={[0, 0.35, 0.5, 0.65, 1]}
            />
          )}
        </SkiaText>
      </Canvas>
    </View>
  );
}

function ShineTextWeb({
  text,
  fontSize = 36,
  fontWeight = '800',
  fontFamily,
  color,
  shineColor,
  duration = 1800,
  pause = 1400,
  active = true,
  style,
}: ShineTextProps) {
  const reduced = useReduceMotion();
  const { base, shine } = useSheenColors(color, shineColor);
  const cycle = duration + pause;
  const sweepEnd = Math.round((pause / cycle) * 100);
  const animate = active && !reduced;

  // react-native-web passes these CSS properties through to the DOM.
  const css = {
    backgroundImage: `linear-gradient(110deg, ${base} 0%, ${base} 40%, ${shine} 50%, ${base} 60%, ${base} 100%)`,
    backgroundSize: '250% 100%',
    backgroundClip: 'text',
    WebkitBackgroundClip: 'text',
    color: 'transparent',
    ...(animate
      ? {
          animationKeyframes: [
            {
              '0%': { backgroundPosition: '100% 0' },
              [`${sweepEnd}%`]: { backgroundPosition: '100% 0' },
              '100%': { backgroundPosition: '0% 0' },
            },
          ],
          animationDuration: `${cycle}ms`,
          animationIterationCount: 'infinite',
          animationTimingFunction: 'ease-in-out',
        }
      : { backgroundPosition: '100% 0' }),
  } as unknown as TextStyle;

  return (
    <View accessible accessibilityRole="text" accessibilityLabel={text} style={style}>
      <Text
        numberOfLines={1}
        importantForAccessibility="no"
        style={[{ fontSize, fontWeight, fontFamily, color: base }, css]}
      >
        {text}
      </Text>
    </View>
  );
}
