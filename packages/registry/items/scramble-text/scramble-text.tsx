import { useEffect, useRef, useState } from 'react';
import {
  StyleSheet,
  Text,
  View,
  type StyleProp,
  type TextStyle,
  type ViewStyle,
} from 'react-native';

import { useReduceMotion } from '../../shared/hooks/use-reduce-motion';
import { useKinetikTheme } from '../../shared/tokens/theme';

export const SCRAMBLE_GLYPHS = 'ABCDEFGHJKLMNPQRSTUVWXYZ0123456789#%&@$*+=';

/** Glyphs change every 55 ms: fast enough to read as noise, slow enough not to strobe. */
const TICK = 55;

export type ScrambleTextProps = {
  /** The text to settle on. Changing it scrambles again. */
  text: string;
  /** Time in ms for all characters to settle. Defaults to 900. */
  duration?: number;
  /** Wait before the first character settles, in ms. Defaults to 0. */
  delay?: number;
  /** Glyphs used while scrambling. */
  glyphs?: string;
  /** Change this value to replay the effect with the same text. */
  replayKey?: string | number;
  /** Scramble on first render. Defaults to true. */
  animateOnMount?: boolean;
  /** Called when every character has settled. */
  onDone?: () => void;
  style?: StyleProp<TextStyle>;
  containerStyle?: StyleProp<ViewStyle>;
};

/** Deterministic 0–1 jitter per character, so replays look the same. */
function jitter(i: number) {
  return ((i * 9301 + 49297) % 233280) / 233280;
}

/** The string shown `elapsed` ms into the effect, and whether it has settled. */
export function scrambleFrame(
  goal: string,
  elapsed: number,
  duration: number,
  delay: number,
  glyphs: string,
): { text: string; settled: boolean } {
  const n = goal.length;
  const tick = Math.floor(elapsed / TICK);
  let text = '';
  let settled = true;
  for (let i = 0; i < n; i++) {
    const ch = goal.charAt(i);
    if (ch === ' ' || ch === '\n') {
      text += ch;
      continue;
    }
    const at = delay + (n <= 1 ? 0 : i / (n - 1)) * duration * 0.65 + duration * 0.35 * jitter(i);
    if (elapsed >= at) {
      text += ch;
    } else {
      settled = false;
      text += glyphs.charAt((tick * 31 + i * 17) % glyphs.length);
    }
  }
  return { text, settled };
}

/**
 * Text whose characters cycle through random glyphs and lock into place from
 * left to right. Best for headlines, labels and codes rather than paragraphs.
 *
 * The glyphs step on a ~18 Hz timer for the length of the effect and then
 * stop. (Driving a TextInput's text from the UI thread every frame is avoided
 * on purpose: on Android's New Architecture each update chains a new text
 * input state onto the last, and long chains crash when released.)
 */
export function ScrambleText({
  text,
  duration = 900,
  delay = 0,
  glyphs = SCRAMBLE_GLYPHS,
  replayKey,
  animateOnMount = true,
  onDone,
  style,
  containerStyle,
}: ScrambleTextProps) {
  const { colors, font } = useKinetikTheme();
  const reduced = useReduceMotion();
  const [shown, setShown] = useState(() =>
    animateOnMount && !reduced ? scrambleFrame(text, 0, duration, delay, glyphs).text : text,
  );
  const [box, setBox] = useState<{ width: number; height: number } | null>(null);
  // Show the first scrambled frame in the same render the text changes.
  const [played, setPlayed] = useState({ text, replayKey });
  if (played.text !== text || played.replayKey !== replayKey) {
    setPlayed({ text, replayKey });
    setShown(scrambleFrame(text, 0, duration, delay, glyphs).text);
  }
  const first = useRef(true);
  const onDoneRef = useRef(onDone);
  useEffect(() => {
    onDoneRef.current = onDone;
  }, [onDone]);

  useEffect(() => {
    const skip = reduced || (first.current && !animateOnMount);
    first.current = false;
    if (skip) return;
    const start = Date.now();
    const step = () => {
      const frame = scrambleFrame(text, Date.now() - start, duration, delay, glyphs);
      setShown(frame.text);
      if (frame.settled) {
        clearInterval(timer);
        onDoneRef.current?.();
      }
    };
    const timer = setInterval(step, TICK);
    return () => clearInterval(timer);
  }, [text, replayKey, reduced, animateOnMount, duration, delay, glyphs]);

  const textStyle: StyleProp<TextStyle> = [
    { color: colors.text, fontSize: font.size['2xl'], fontWeight: font.weight.bold },
    style,
  ];
  // Scramble glyphs can be wider than the settled text. Single-line text gets
  // headroom so a wide glyph never wraps; multi-line text keeps its exact width
  // so line breaks match the settled text.
  const multiline = text.includes('\n');

  return (
    <View
      accessible
      accessibilityRole="text"
      accessibilityLabel={text}
      style={[styles.container, containerStyle]}
    >
      {/* The settled text sizes the box so scrambling never shifts layout. */}
      <Text
        style={[textStyle, styles.ghost]}
        importantForAccessibility="no-hide-descendants"
        accessibilityElementsHidden
        onLayout={(e) => setBox(e.nativeEvent.layout)}
      >
        {text}
      </Text>
      <Text
        importantForAccessibility="no-hide-descendants"
        accessibilityElementsHidden
        numberOfLines={multiline ? undefined : 1}
        style={[
          textStyle,
          styles.overlay,
          box && {
            width: multiline ? box.width : Math.max(box.width * 1.5, box.width + 48),
          },
        ]}
      >
        {reduced ? text : shown}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { alignSelf: 'flex-start' },
  ghost: { opacity: 0 },
  overlay: { position: 'absolute', left: 0, top: 0 },
});
