import { useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { defineControls, type ControlValues } from '../../demo-kit/types';
import { useKinetikTheme } from '../../shared/tokens/theme';
import { gradient } from '../../shared/tokens/gradient';
import { withAlpha } from '../../shared/tokens/tokens';
import { TiltDeck, TiltLayer } from './tilt-deck';

export const controls = defineControls({
  maxTilt: { type: 'number', label: 'Max tilt (°)', min: 0, max: 20, step: 1, default: 12 },
  lift: { type: 'number', label: 'Lift', min: 1, max: 1.08, step: 0.01, default: 1.03 },
  parallax: { type: 'number', label: 'Parallax (pt)', min: 0, max: 24, step: 1, default: 10 },
});

export default function TiltDeckDemo(props: ControlValues<typeof controls>) {
  const { colors, font, space, radius } = useKinetikTheme();
  const [plays, setPlays] = useState(0);

  return (
    <View style={{ gap: space[4] }}>
      <TiltDeck
        {...props}
        onPress={() => setPlays((p) => p + 1)}
        accessibilityLabel="Night Drive by Lumen Fields. Play album."
        contentStyle={{ padding: 0 }}
      >
        <View
          style={[
            styles.art,
            gradient(
              `linear-gradient(145deg, ${colors.ember} 0%, ${withAlpha(colors.ember, 0.35)} 45%, ${colors.surfaceSunken} 100%)`,
            ),
          ]}
        >
          <TiltLayer
            depth={-0.6}
            style={[styles.sun, { backgroundColor: withAlpha(colors.highlight, 0.22) }]}
          />
          <TiltLayer
            depth={0.2}
            style={[
              styles.hill,
              styles.far,
              { backgroundColor: withAlpha(colors.surfaceSunken, 0.55) },
            ]}
          />
          <TiltLayer
            depth={0.7}
            style={[styles.hill, styles.near, { backgroundColor: colors.surface }]}
          />
          <TiltLayer depth={1.4} style={styles.badgeWrap}>
            <View
              style={[
                styles.badge,
                { backgroundColor: colors.highlight, borderRadius: radius.pill },
              ]}
            >
              <Text
                style={{
                  color: colors.onIce,
                  fontSize: font.size.xs,
                  fontWeight: font.weight.bold,
                }}
              >
                NEW
              </Text>
            </View>
          </TiltLayer>
        </View>
        <TiltLayer depth={0.4} style={{ padding: space[5], gap: space[1] }}>
          <Text
            style={{ color: colors.text, fontSize: font.size.xl, fontWeight: font.weight.bold }}
          >
            Night Drive
          </Text>
          <Text style={{ color: colors.textMuted, fontSize: font.size.sm }}>
            Lumen Fields · 9 tracks
          </Text>
        </TiltLayer>
      </TiltDeck>
      <Text
        accessibilityLiveRegion="polite"
        style={{ color: colors.textMuted, fontSize: font.size.sm, textAlign: 'center' }}
      >
        {plays === 0 ? 'Press a corner to sink it · tap to play' : `Played ${plays}×`}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  art: { height: 200, overflow: 'hidden', justifyContent: 'flex-end' },
  sun: { position: 'absolute', width: 96, height: 96, borderRadius: 48, top: 34, left: 52 },
  // Hills are circles stretched into ellipses.
  hill: { position: 'absolute', width: 220, height: 220, borderRadius: 110 },
  far: { left: -30, bottom: -150, transform: [{ scaleX: 1.9 }] },
  near: { right: -60, bottom: -175, transform: [{ scaleX: 2.3 }] },
  badgeWrap: { position: 'absolute', top: 16, right: 16 },
  badge: { paddingHorizontal: 10, paddingVertical: 4 },
});
