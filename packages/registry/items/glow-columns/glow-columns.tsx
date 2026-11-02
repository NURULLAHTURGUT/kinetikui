import { useEffect } from 'react';
import { StyleSheet, Text, View, type StyleProp, type ViewStyle } from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withSpring,
} from 'react-native-reanimated';
import Svg, { Path } from 'react-native-svg';

import { useCountUp } from '../../shared/hooks/use-count-up';
import { useReduceMotion } from '../../shared/hooks/use-reduce-motion';
import { spring } from '../../shared/motion/motion';
import { gradient } from '../../shared/tokens/gradient';
import { useKinetikTheme } from '../../shared/tokens/theme';

export type GlowColumnsProps = {
  /** One value per period, oldest first. */
  values: number[];
  /** Top of the scale. Defaults to the largest value. */
  max?: number;
  /** Index of the current period, which sets the big number. Defaults to 0. */
  current?: number;
  /** Word beside the big number, e.g. "MODERATE". */
  level?: string;
  /** Short name in the corner, e.g. "UVI". */
  name?: string;
  /** Period labels, spread under the columns. */
  labels?: string[];
  style?: StyleProp<ViewStyle>;
};

const CHART = 66;
const CAP = 6;
const STEM = 4;

const LOW = 'hsl(138, 76%, 48%)';
const MID = 'hsl(52, 94%, 58%)';
const HIGH = 'hsl(28, 96%, 56%)';

/** The colour of a value on the scale: green when low, yellow in the middle, orange when high. */
export function levelColor(share: number): string {
  if (share < 0.3) return LOW;
  return share < 0.7 ? MID : HIGH;
}

/**
 * An index through the day as thin glowing columns: each stem grows from the floor
 * under a bright cap, one after another, and low periods sit as small green dots.
 */
export function GlowColumns({
  values,
  max,
  current = 0,
  level,
  name,
  labels,
  style,
}: GlowColumnsProps) {
  const { colors, font } = useKinetikTheme();
  const reduced = useReduceMotion();
  const top = max ?? Math.max(...values, 1);
  const now = values[current] ?? 0;
  const shown = Math.round(useCountUp(now, { instant: reduced }));
  const tone = levelColor(now / top);

  return (
    <View
      accessible
      accessibilityLabel={`${name ? `${name} ` : ''}${now}${level ? `, ${level}` : ''}`}
      style={[styles.card, style]}
    >
      <View style={styles.head}>
        <Text
          style={{
            color: colors.highlight,
            fontSize: font.size.lg,
            fontWeight: font.weight.semibold,
            fontVariant: ['tabular-nums'],
          }}
        >
          {shown}
        </Text>
        {level ? (
          <Text
            numberOfLines={1}
            style={[
              styles.grow,
              { color: tone, fontSize: font.size.xs, fontWeight: font.weight.bold },
            ]}
          >
            {level}
          </Text>
        ) : (
          <View style={styles.grow} />
        )}
        {name ? (
          <>
            <Text style={{ color: MUTED, fontSize: font.size.xs, fontWeight: font.weight.medium }}>
              {name}
            </Text>
            <Svg width={14} height={14} viewBox="0 0 24 24">
              <Path d="M21 3 3 10.5l7.2 3.3L13.5 21 21 3Z" fill={MUTED} />
            </Svg>
          </>
        ) : null}
      </View>

      <View style={styles.chart}>
        {values.map((value, i) => (
          <Column
            key={i}
            index={i}
            share={Math.max(0, Math.min(1, value / top))}
            current={i === current}
          />
        ))}
      </View>

      {labels ? (
        <View style={styles.labels}>
          {labels.map((label) => (
            <Text key={label} style={{ color: MUTED, fontSize: font.size.xs - 2 }}>
              {label}
            </Text>
          ))}
        </View>
      ) : null}
    </View>
  );
}

function Column({ index, share, current }: { index: number; share: number; current: boolean }) {
  const reduced = useReduceMotion();
  const tone = levelColor(share);
  const stem = share * (CHART - CAP);
  const grown = useSharedValue(reduced ? stem : 0);
  useEffect(() => {
    grown.set(reduced ? stem : withDelay(index * 35, withSpring(stem, spring('smooth'))));
  }, [index, stem, reduced, grown]);
  const rise = useAnimatedStyle(() => ({ height: Math.max(0, grown.get()) }));
  const lift = useAnimatedStyle(() => ({ transform: [{ translateY: -Math.max(0, grown.get()) }] }));

  return (
    <View style={styles.column}>
      <View style={[styles.rail, current ? styles.railNow : null]} />
      <Animated.View
        style={[
          styles.stem,
          gradient(`linear-gradient(180deg, ${tone} 0%, transparent 100%)`),
          rise,
        ]}
      />
      <Animated.View
        style={[styles.cap, { backgroundColor: tone, boxShadow: `0px 0px 8px ${tone}` }, lift]}
      />
    </View>
  );
}

const MUTED = 'hsl(0, 0%, 62%)';

const styles = StyleSheet.create({
  card: {
    width: '100%',
    maxWidth: 320,
    alignSelf: 'center',
    borderRadius: 24,
    borderWidth: 1,
    borderColor: 'hsla(0, 0%, 100%, 0.08)',
    backgroundColor: 'hsl(0, 0%, 5%)',
    padding: 16,
    gap: 8,
  },
  head: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  grow: { flex: 1 },
  chart: { flexDirection: 'row', height: CHART },
  column: { flex: 1, alignItems: 'center', justifyContent: 'flex-end' },
  rail: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    width: 1,
    backgroundColor: 'hsla(0, 0%, 100%, 0.12)',
  },
  railNow: { width: 1.5, backgroundColor: 'hsla(0, 0%, 100%, 0.42)' },
  stem: { width: STEM, borderRadius: STEM / 2 },
  cap: {
    position: 'absolute',
    bottom: 0,
    width: CAP,
    height: CAP,
    borderRadius: CAP / 2,
  },
  labels: { flexDirection: 'row', justifyContent: 'space-between' },
});
