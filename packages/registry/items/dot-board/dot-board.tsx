import { Canvas, Group, Path, rect, Skia } from '@shopify/react-native-skia';
import { useEffect, useMemo, useState } from 'react';
import { StyleSheet, Text, View, type StyleProp, type ViewStyle } from 'react-native';
import {
  Easing,
  useDerivedValue,
  useSharedValue,
  withDelay,
  withTiming,
} from 'react-native-reanimated';

import { useReduceMotion } from '../../shared/hooks/use-reduce-motion';
import { useKinetikTheme } from '../../shared/tokens/theme';

export type DotBoardRun = {
  text: string;
  /** Colour of the lit dots. Defaults to white. */
  color?: string;
};

/** A line of the board: plain text, or runs in different colours. */
export type DotBoardLine = string | DotBoardRun[];

export type DotBoardProps = {
  title: string;
  subtitle?: string;
  /** The lines shown on the board. Letters are upper-cased; unknown characters are blank. */
  lines: DotBoardLine[];
  /** Characters per line. Defaults to the longest line, and at least 9. */
  columns?: number;
  /** Delay in ms between one line starting to light and the next. Defaults to 140. */
  stagger?: number;
  style?: StyleProp<ViewStyle>;
};

const W = 5;
const H = 7;
/** Dots between characters and rows between lines. */
const GAP_X = 1;
const GAP_Y = 2;
const DOT = 0.8;
const SWEEP_MS = 620;

/** Characters drawn on a 5 by 7 grid: one group per row, "1" is a lit dot. */
const GLYPHS: Record<string, string> = {
  '0': '01110 10001 10011 10101 11001 10001 01110',
  '1': '00100 01100 00100 00100 00100 00100 01110',
  '2': '01110 10001 00001 00010 00100 01000 11111',
  '3': '11110 00001 00001 01110 00001 00001 11110',
  '4': '00010 00110 01010 10010 11111 00010 00010',
  '5': '11111 10000 11110 00001 00001 10001 01110',
  '6': '00110 01000 10000 11110 10001 10001 01110',
  '7': '11111 00001 00010 00100 01000 01000 01000',
  '8': '01110 10001 10001 01110 10001 10001 01110',
  '9': '01110 10001 10001 01111 00001 00010 01100',
  A: '01110 10001 10001 11111 10001 10001 10001',
  B: '11110 10001 10001 11110 10001 10001 11110',
  C: '01110 10001 10000 10000 10000 10001 01110',
  D: '11110 10001 10001 10001 10001 10001 11110',
  E: '11111 10000 10000 11110 10000 10000 11111',
  F: '11111 10000 10000 11110 10000 10000 10000',
  G: '01110 10001 10000 10111 10001 10001 01111',
  H: '10001 10001 10001 11111 10001 10001 10001',
  I: '01110 00100 00100 00100 00100 00100 01110',
  J: '00111 00010 00010 00010 00010 10010 01100',
  K: '10001 10010 10100 11000 10100 10010 10001',
  L: '10000 10000 10000 10000 10000 10000 11111',
  M: '10001 11011 10101 10101 10001 10001 10001',
  N: '10001 11001 10101 10011 10001 10001 10001',
  O: '01110 10001 10001 10001 10001 10001 01110',
  P: '11110 10001 10001 11110 10000 10000 10000',
  Q: '01110 10001 10001 10001 10101 10010 01101',
  R: '11110 10001 10001 11110 10100 10010 10001',
  S: '01111 10000 10000 01110 00001 00001 11110',
  T: '11111 00100 00100 00100 00100 00100 00100',
  U: '10001 10001 10001 10001 10001 10001 01110',
  V: '10001 10001 10001 10001 10001 01010 00100',
  W: '10001 10001 10001 10101 10101 11011 10001',
  X: '10001 10001 01010 00100 01010 10001 10001',
  Y: '10001 10001 01010 00100 00100 00100 00100',
  Z: '11111 00001 00010 00100 01000 10000 11111',
  ':': '00000 00100 00100 00000 00100 00100 00000',
  '.': '00000 00000 00000 00000 00000 01100 01100',
  '-': '00000 00000 00000 11111 00000 00000 00000',
  '/': '00001 00001 00010 00100 01000 10000 10000',
  '+': '00000 00100 00100 11111 00100 00100 00000',
};

function runsOf(line: DotBoardLine): DotBoardRun[] {
  return typeof line === 'string' ? [{ text: line }] : line;
}

function textOf(line: DotBoardLine): string {
  return runsOf(line)
    .map((r) => r.text)
    .join('');
}

/** SVG path of the dots of `chars` starting at column `from`: only the lit ones, or all of them. */
export function dotsPath(chars: string, from: number, row: number, pitch: number, lit: boolean) {
  const size = (pitch * DOT).toFixed(2);
  const parts: string[] = [];
  [...chars].forEach((char, c) => {
    const rows = lit ? GLYPHS[char.toUpperCase()]?.split(' ') : null;
    if (lit && !rows) return;
    for (let y = 0; y < H; y++) {
      for (let x = 0; x < W; x++) {
        if (rows && rows[y]?.[x] !== '1') continue;
        const px = (from + c) * (W + GAP_X) * pitch + x * pitch;
        const py = (row + y) * pitch;
        parts.push(`M${px.toFixed(2)} ${py.toFixed(2)}h${size}v${size}h-${size}z`);
      }
    }
  });
  return parts.join('');
}

/** The lit dots of a line, one path per colour run. */
function litPaths(line: DotBoardLine, row: number, pitch: number) {
  const paths = [];
  let from = 0;
  for (const run of runsOf(line)) {
    const d = dotsPath(run.text, from, row, pitch, true);
    from += run.text.length;
    paths.push({ path: d ? Skia.Path.MakeFromSVGString(d) : null, color: run.color });
  }
  return paths;
}

/**
 * A departures-style board: each character is a small block of LED dots, unlit
 * dots faintly visible. When a line changes, its new dots light in a sweep from
 * left to right, one line after another.
 */
export function DotBoard({ title, subtitle, lines, columns, stagger = 140, style }: DotBoardProps) {
  const { colors, font, space } = useKinetikTheme();
  const [width, setWidth] = useState(0);
  const cols = columns ?? Math.max(9, ...lines.map((l) => textOf(l).length));
  const dotsX = cols * (W + GAP_X) - GAP_X;
  const dotsY = lines.length * (H + GAP_Y) - GAP_Y;
  const pitch = width / dotsX;
  const rows = lines.length;

  const off = useMemo(() => {
    if (!width) return null;
    const blank = ' '.repeat(cols);
    const d = Array.from({ length: rows }, (_, i) =>
      dotsPath(blank, 0, i * (H + GAP_Y), pitch, false),
    ).join('');
    return Skia.Path.MakeFromSVGString(d);
  }, [width, cols, rows, pitch]);

  return (
    <View
      accessible
      accessibilityLabel={[title, subtitle, ...lines.map(textOf)].filter(Boolean).join('. ')}
      style={[styles.card, { padding: space[5], gap: space[1] }, style]}
    >
      <Text
        style={{ color: colors.highlight, fontSize: font.size.lg, fontWeight: font.weight.bold }}
      >
        {title}
      </Text>
      {subtitle ? (
        <Text style={{ color: MUTED, fontSize: font.size.sm + 1 }}>{subtitle}</Text>
      ) : null}
      <View style={[styles.frame, { marginTop: space[6] }]}>
        <View style={styles.panel}>
          <View
            testID="dot-board-dots"
            style={[styles.dots, { aspectRatio: dotsX / dotsY }]}
            onLayout={(e) => setWidth(e.nativeEvent.layout.width)}
          >
            {off ? (
              <Canvas style={{ width, height: pitch * dotsY }} pointerEvents="none">
                <Path path={off} color={UNLIT} />
                {lines.map((line, i) => (
                  <LitLine
                    key={i}
                    line={line}
                    row={i * (H + GAP_Y)}
                    pitch={pitch}
                    columns={dotsX}
                    delay={i * stagger}
                  />
                ))}
              </Canvas>
            ) : null}
          </View>
        </View>
      </View>
    </View>
  );
}

/** One line's lit dots, clipped by a sweep that steps a column at a time, like LEDs. */
function LitLine({
  line,
  row,
  pitch,
  columns,
  delay,
}: {
  line: DotBoardLine;
  row: number;
  pitch: number;
  columns: number;
  delay: number;
}) {
  const { colors } = useKinetikTheme();
  const reduced = useReduceMotion();
  const text = textOf(line);
  const sweep = useSharedValue(reduced ? 1 : 0);

  useEffect(() => {
    if (reduced) {
      sweep.set(1);
      return;
    }
    sweep.set(0);
    sweep.set(withDelay(delay, withTiming(1, { duration: SWEEP_MS, easing: Easing.linear })));
  }, [text, reduced, delay, sweep]);

  const clip = useDerivedValue(() =>
    rect(0, row * pitch, Math.ceil(sweep.get() * columns) * pitch, H * pitch),
  );

  const paths = useMemo(() => litPaths(line, row, pitch), [line, row, pitch]);

  return (
    <Group clip={clip}>
      {paths.map(({ path, color }, i) =>
        path ? <Path key={i} path={path} color={color ?? colors.highlight} /> : null,
      )}
    </Group>
  );
}

const MUTED = 'hsl(215, 14%, 66%)';
const UNLIT = 'hsl(214, 15%, 18%)';

const styles = StyleSheet.create({
  card: {
    width: '100%',
    maxWidth: 360,
    alignSelf: 'center',
    borderRadius: 30,
    backgroundColor: 'hsl(215, 20%, 17%)',
    boxShadow: '0px 18px 40px hsla(215, 30%, 8%, 0.28)',
  },
  frame: { borderRadius: 16, padding: 7, backgroundColor: 'hsl(215, 18%, 22%)' },
  panel: { borderRadius: 11, padding: 14, backgroundColor: 'hsl(216, 20%, 8%)' },
  dots: { width: '100%' },
});
