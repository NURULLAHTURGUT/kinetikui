import {
  Atlas,
  Canvas,
  Circle,
  Group,
  Rect,
  Skia,
  rect,
  useRSXformBuffer,
  useTexture,
  type SkSize,
} from '@shopify/react-native-skia';
import { useEffect, useImperativeHandle, useMemo, useRef, type ReactNode, type Ref } from 'react';
import { StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';
import { useFrameCallback, useSharedValue } from 'react-native-reanimated';
import { scheduleOnRN } from 'react-native-worklets';

import { useHaptic } from '../../shared/hooks/use-haptic';
import { useReduceMotion } from '../../shared/hooks/use-reduce-motion';
import { useKinetikTheme } from '../../shared/tokens/theme';

export type ConfettiHandle = {
  /** Fires a burst from a point in the component's coordinates (defaults to `origin`). */
  burst: (at?: { x: number; y: number }) => void;
};

export type ConfettiBurstProps = {
  /** Content the confetti flies over. */
  children?: ReactNode;
  /** Particles per burst, up to 300. Defaults to 90. */
  count?: number;
  /** Particle colours. Defaults to the theme accents. */
  colors?: string[];
  /**
   * Where bursts start, as fractions of the size (0–1). Defaults to the
   * centre, slightly below the middle.
   */
  origin?: { x: number; y: number };
  /** Launch speed multiplier. Defaults to 1. */
  power?: number;
  /** Change this value to fire a burst (e.g. a counter). */
  trigger?: number | string;
  /** A success haptic with each burst. Defaults to true. */
  haptics?: boolean;
  /** Imperative handle with `burst()`. */
  ref?: Ref<ConfettiHandle>;
  style?: StyleProp<ViewStyle>;
};

type Particle = {
  x: number;
  y: number;
  vx: number;
  vy: number;
  r: number;
  vr: number;
  /** 0–1, shrinks towards the end of life. */
  scale: number;
  age: number;
  life: number;
  /** Sprite: 0 ribbon, 1 dot. */
  shape: number;
};

const MAX = 300;
const GRAVITY = 1400;
const DRAG = 1.4;

// Two white sprites in one small texture; Atlas tints each particle.
const RIBBON = rect(0, 0, 12, 7);
const DOT = rect(16, 0, 8, 8);
const TEXTURE = { width: 24, height: 8 };

/**
 * A burst of confetti drawn as one Skia Atlas: hundreds of tinted sprites in
 * a single draw call, with physics stepped on the UI thread only while the
 * burst is in the air.
 */
export function ConfettiBurst({
  children,
  count = 90,
  colors,
  origin = { x: 0.5, y: 0.55 },
  power = 1,
  trigger,
  haptics = true,
  ref,
  style,
}: ConfettiBurstProps) {
  const theme = useKinetikTheme();
  const reduced = useReduceMotion();
  const haptic = useHaptic(haptics);
  const n = Math.max(1, Math.min(MAX, Math.round(count)));
  const size = useSharedValue<SkSize>({ width: 0, height: 0 });
  const particles = useSharedValue<Particle[]>([]);
  const tick = useSharedValue(0);
  const alive = useSharedValue(0);

  // The highlight is left out: it is white in both schemes and vanishes on a light ground.
  const palette = colors ?? [
    theme.colors.ember,
    theme.colors.ice,
    theme.colors.textMuted,
    theme.colors.textSubtle,
  ];
  const paletteKey = palette.join('|');
  // Keyed on the colours' text so a new array with the same colours is free.
  const tints = useMemo(() => {
    const list = paletteKey.split('|');
    return Array.from({ length: n }, (_, i) => Skia.Color(list[i % list.length] ?? 'white'));
  }, [n, paletteKey]);
  const sprites = useMemo(
    () => Array.from({ length: n }, (_, i) => (i % 3 === 0 ? DOT : RIBBON)),
    [n],
  );

  const texture = useTexture(
    <Group>
      <Rect x={RIBBON.x} y={RIBBON.y} width={RIBBON.width} height={RIBBON.height} color="white" />
      <Circle cx={DOT.x + 4} cy={DOT.y + 4} r={4} color="white" />
    </Group>,
    TEXTURE,
  );

  const stopRef = useRef<(() => void) | null>(null);
  const stop = () => stopRef.current?.();

  const physics = useFrameCallback((info) => {
    const dt = Math.min(0.05, (info.timeSincePreviousFrame ?? 16) / 1000);
    particles.modify((list) => {
      'worklet';
      let living = 0;
      for (const p of list) {
        if (p.age >= p.life) continue;
        living++;
        p.age += dt;
        p.vx -= p.vx * DRAG * dt;
        p.vy += GRAVITY * dt - p.vy * DRAG * dt;
        p.x += p.vx * dt;
        p.y += p.vy * dt;
        p.r += p.vr * dt;
        const remaining = p.life - p.age;
        p.scale = remaining < 0.5 ? Math.max(0, remaining / 0.5) : 1;
      }
      alive.set(living);
      return list;
    });
    tick.set(tick.get() + 1);
    if (alive.get() === 0) scheduleOnRN(stop);
  }, false);

  useEffect(() => {
    stopRef.current = () => physics.setActive(false);
  }, [physics]);

  const fire = (at?: { x: number; y: number }) => {
    haptic('success');
    if (reduced) return;
    const { width, height } = size.get();
    const ox = at?.x ?? width * origin.x;
    const oy = at?.y ?? height * origin.y;
    const k = Math.max(0.2, power);
    particles.set(
      Array.from({ length: n }, (_, i) => {
        // Mostly upwards, fanning out to the sides.
        const angle = -Math.PI / 2 + (Math.random() - 0.5) * Math.PI * 1.1;
        const speed = (520 + Math.random() * 680) * k;
        return {
          x: ox,
          y: oy,
          vx: Math.cos(angle) * speed,
          vy: Math.sin(angle) * speed,
          r: Math.random() * Math.PI * 2,
          vr: (Math.random() - 0.5) * 14,
          scale: 1,
          age: 0,
          life: 1.6 + Math.random() * 1.2,
          shape: i % 3 === 0 ? 1 : 0,
        };
      }),
    );
    physics.setActive(true);
  };

  useImperativeHandle(ref, () => ({ burst: fire }));

  const first = useRef(true);
  useEffect(() => {
    if (first.current) {
      first.current = false;
      return;
    }
    if (trigger !== undefined) fire();
    // Fires only when `trigger` changes.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [trigger]);

  const transforms = useRSXformBuffer(n, (val, i) => {
    'worklet';
    tick.get();
    const p = particles.get()[i];
    if (!p || p.age >= p.life) {
      val.set(0, 0, -100, -100);
      return;
    }
    const sprite = p.shape === 1 ? DOT : RIBBON;
    const s = p.scale;
    const c = Math.cos(p.r) * s;
    const sn = Math.sin(p.r) * s;
    // Rotate about the sprite's centre.
    const hw = sprite.width / 2;
    const hh = sprite.height / 2;
    val.set(c, sn, p.x - (c * hw - sn * hh), p.y - (sn * hw + c * hh));
  });

  return (
    <View style={[styles.root, style]}>
      {children}
      {/* The wrapper lets touches through: on the web the canvas itself ignores pointerEvents. */}
      <View
        pointerEvents="none"
        style={StyleSheet.absoluteFill}
        accessibilityElementsHidden
        importantForAccessibility="no-hide-descendants"
      >
        <Canvas style={StyleSheet.absoluteFill} onSize={size}>
          <Atlas
            image={texture}
            sprites={sprites}
            transforms={transforms}
            colors={tints}
            colorBlendMode="modulate"
          />
        </Canvas>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {},
});
