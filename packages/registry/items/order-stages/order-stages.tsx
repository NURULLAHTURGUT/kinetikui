import { useEffect, useRef, useState } from 'react';
import { StyleSheet, Text, View, type StyleProp, type ViewStyle } from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withSequence,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import Svg, { Path } from 'react-native-svg';

import { useCountUp } from '../../shared/hooks/use-count-up';
import { useHaptic } from '../../shared/hooks/use-haptic';
import { useReduceMotion } from '../../shared/hooks/use-reduce-motion';
import { easings, spring } from '../../shared/motion/motion';
import { gradient } from '../../shared/tokens/gradient';
import { useKinetikTheme } from '../../shared/tokens/theme';

export type OrderStage = {
  /** Status shown while this stage is under way, e.g. "COOKING". */
  label: string;
  /** Picture on the stage's chip. */
  icon: 'cook' | 'pack' | 'ride' | 'check';
};

export type OrderStagesProps = {
  stages: OrderStage[];
  /** Index of the stage under way. Changes slide the knob along. */
  current: number;
  /** Minutes until it arrives. */
  minutesLeft: number;
  /** Order number in the corner, e.g. "Nº 27". */
  order?: string;
  /** Label after the minutes. Defaults to "MIN LEFT". */
  leftLabel?: string;
  /** Vibrate when the stage changes. Defaults to true. */
  haptics?: boolean;
  style?: StyleProp<ViewStyle>;
};

const TRACK_H = 42;
const KNOB = 36;
const CHIP = 36;
const GAP = 3;
const SHEEN_W = 90;

const ICONS: Record<OrderStage['icon'], string> = {
  cook: 'M5 11h14v6a3 3 0 0 1-3 3H8a3 3 0 0 1-3-3v-6ZM2.5 11h19M9.5 7.5c0-1.6 1-1.6 1-3.2M13.5 7.5c0-1.6 1-1.6 1-3.2',
  pack: 'M6 8.5h12l1 11.5H5L6 8.5ZM9 8.5V7a3 3 0 0 1 6 0v1.5',
  ride: 'M5.5 14a3.5 3.5 0 1 0 0 7 3.5 3.5 0 0 0 0-7ZM18.5 14a3.5 3.5 0 1 0 0 7 3.5 3.5 0 0 0 0-7ZM5.5 17.5 9 10h6l3.5 7.5M15 10l-1.2-4H17',
  check: 'M5 12.5 9.5 17 19 7.5',
};

/** Where the knob's left edge sits: past the finished stages, before the chips still to come. */
export function knobOffset(width: number, count: number, current: number): number {
  const ahead = Math.max(0, count - 1 - current);
  return Math.max(0, width - KNOB - 3 - ahead * (CHIP + GAP));
}

function StageIcon({
  icon,
  color,
  size = 16,
}: {
  icon: OrderStage['icon'];
  color: string;
  size?: number;
}) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24">
      <Path
        d={ICONS[icon]}
        fill="none"
        stroke={color}
        strokeWidth={2.2}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  );
}

/**
 * An order on its way: a glowing track runs up to a knob showing the stage under
 * way, with chips for the stages to come. When the stage changes the knob springs
 * forward and swells, and a sheen keeps moving along the track.
 */
export function OrderStages({
  stages,
  current,
  minutesLeft,
  order,
  leftLabel = 'MIN LEFT',
  haptics = true,
  style,
}: OrderStagesProps) {
  const { colors, font } = useKinetikTheme();
  const reduced = useReduceMotion();
  const haptic = useHaptic(haptics);
  const [width, setWidth] = useState(0);
  const at = Math.max(0, Math.min(stages.length - 1, current));
  const stage = stages[at];
  const shown = Math.round(useCountUp(minutesLeft, { instant: reduced }));
  const target = knobOffset(width, stages.length, at);

  const x = useSharedValue(0);
  const swell = useSharedValue(1);
  const sheen = useSharedValue(0);
  const seen = useRef(at);

  useEffect(() => {
    x.set(reduced ? target : withSpring(target, spring('smooth')));
  }, [target, reduced, x]);

  useEffect(() => {
    if (reduced) return;
    sheen.set(withRepeat(withTiming(1, { duration: 2800, easing: easings.inOut }), -1, false));
  }, [reduced, sheen]);

  useEffect(() => {
    if (seen.current === at) return;
    seen.current = at;
    if (!reduced) {
      swell.set(withSequence(withSpring(1.18, spring('snappy')), withSpring(1, spring('bouncy'))));
    }
    haptic('tick');
  }, [at, reduced, swell, haptic]);

  const rail = useAnimatedStyle(() => ({ width: x.get() + KNOB / 2 + 3 }));
  const knob = useAnimatedStyle(() => ({
    transform: [{ translateX: x.get() }, { scale: swell.get() }],
  }));
  const shine = useAnimatedStyle(() => ({
    transform: [{ translateX: sheen.get() * (x.get() + SHEEN_W) - SHEEN_W }],
  }));

  return (
    <View
      accessible
      accessibilityRole="progressbar"
      accessibilityLabel={`${minutesLeft} minutes left. ${stage?.label ?? ''}${order ? `. ${order}` : ''}`}
      accessibilityValue={{ min: 0, max: stages.length, now: at + 1 }}
      style={[styles.card, style]}
    >
      <Text
        style={{
          color: colors.highlight,
          fontSize: font.size.xl,
          fontWeight: font.weight.semibold,
          fontVariant: ['tabular-nums'],
        }}
      >
        {shown}
        <Text style={{ fontSize: font.size.xs, fontWeight: font.weight.medium }}> {leftLabel}</Text>
      </Text>

      <View
        testID="order-stages-track"
        style={styles.track}
        onLayout={(e) => setWidth(e.nativeEvent.layout.width)}
      >
        <Animated.View style={[styles.rail, gradient(RAIL), rail]}>
          {reduced ? null : <Animated.View style={[styles.sheen, gradient(SHEEN), shine]} />}
        </Animated.View>
        <View style={styles.chips}>
          {stages.slice(at + 1).map((s) => (
            <View key={s.label} style={styles.chip}>
              <StageIcon icon={s.icon} color={CHIP_INK} size={16} />
            </View>
          ))}
        </View>
        <Animated.View style={[styles.knob, knob]}>
          {stage ? <StageIcon icon={stage.icon} color={KNOB_INK} size={20} /> : null}
        </Animated.View>
      </View>

      <View style={styles.foot}>
        <Text style={{ color: GOLD, fontSize: font.size.xs, fontWeight: font.weight.bold }}>
          {stage?.label}
        </Text>
        {order ? (
          <Text style={{ color: MUTED, fontSize: font.size.xs, fontVariant: ['tabular-nums'] }}>
            {order}
          </Text>
        ) : null}
      </View>
    </View>
  );
}

const MUTED = 'hsl(0, 0%, 62%)';
const GOLD = 'hsl(46, 96%, 58%)';
const KNOB_INK = 'hsl(42, 80%, 10%)';
const CHIP_INK = 'hsl(0, 0%, 72%)';
const RAIL = 'linear-gradient(90deg, hsl(44, 60%, 14%) 0%, hsl(45, 72%, 30%) 100%)';
const SHEEN =
  'linear-gradient(90deg, hsla(50, 100%, 80%, 0) 0%, hsla(50, 100%, 80%, 0.14) 50%, hsla(50, 100%, 80%, 0) 100%)';

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
  track: {
    height: TRACK_H,
    borderRadius: TRACK_H / 2,
    backgroundColor: 'hsl(0, 0%, 10%)',
    justifyContent: 'center',
  },
  rail: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    left: 0,
    borderRadius: TRACK_H / 2,
    overflow: 'hidden',
  },
  sheen: { position: 'absolute', top: 0, bottom: 0, width: SHEEN_W },
  chips: {
    position: 'absolute',
    right: 3,
    flexDirection: 'row',
    gap: GAP,
  },
  chip: {
    width: CHIP,
    height: CHIP,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'hsl(0, 0%, 17%)',
  },
  knob: {
    position: 'absolute',
    left: 0,
    width: KNOB,
    height: KNOB,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: GOLD,
    boxShadow: '0px 0px 12px hsla(46, 96%, 58%, 0.45)',
  },
  foot: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
});
