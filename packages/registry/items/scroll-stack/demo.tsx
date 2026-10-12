import { Image, StyleSheet, Text, View } from 'react-native';

import { photo, photos, type PhotoKey } from '../../demo-kit/photos';
import { defineControls, type ControlValues } from '../../demo-kit/types';
import { gradient } from '../../shared/tokens/gradient';
import { useKinetikTheme } from '../../shared/tokens/theme';
import { ScrollStack } from './scroll-stack';

export const controls = defineControls({
  peek: { type: 'number', label: 'Peek', min: 0, max: 24, step: 2, default: 12 },
  depth: { type: 'number', label: 'Depth', min: 0, max: 0.12, step: 0.01, default: 0.06 },
});

const KEYS: PhotoKey[] = ['snowRidge', 'mistLake', 'huacachina', 'whiteSands', 'pastelTide'];

export default function ScrollStackDemo({ peek, depth }: ControlValues<typeof controls>) {
  const { colors, font, space, radius } = useKinetikTheme();
  return (
    <View
      style={[
        styles.frame,
        { borderRadius: radius.xl, borderColor: colors.border, backgroundColor: colors.background },
      ]}
    >
      <ScrollStack
        peek={peek}
        depth={depth}
        cardHeight={250}
        gap={20}
        contentContainerStyle={{ padding: space[4] }}
        header={
          <View style={{ gap: space[1], paddingTop: space[2], paddingBottom: space[5] }}>
            <Text
              style={{
                color: colors.textSubtle,
                fontSize: font.size.xs,
                fontWeight: font.weight.semibold,
                letterSpacing: 1.4,
              }}
            >
              CHAPTERS
            </Text>
            <Text
              style={{
                color: colors.text,
                fontSize: font.size['2xl'],
                fontWeight: font.weight.bold,
                letterSpacing: -0.8,
              }}
            >
              Five places
            </Text>
            <Text style={{ color: colors.textMuted, fontSize: font.size.sm }}>
              Scroll to stack the chapters.
            </Text>
          </View>
        }
      >
        {KEYS.map((key, i) => (
          <View key={key} style={styles.card}>
            <Image source={photo(key)} style={StyleSheet.absoluteFill} resizeMode="cover" />
            <View
              style={[
                styles.caption,
                { padding: space[5] },
                gradient('linear-gradient(180deg, rgba(0,0,0,0) 35%, rgba(0,0,0,0.72) 100%)'),
              ]}
            >
              <Text style={styles.index}>{String(i + 1).padStart(2, '0')}</Text>
              <Text style={styles.title}>{photos[key].title}</Text>
              <Text style={styles.meta}>{photos[key].place}</Text>
            </View>
          </View>
        ))}
      </ScrollStack>
    </View>
  );
}

const styles = StyleSheet.create({
  frame: { height: 460, overflow: 'hidden', borderWidth: StyleSheet.hairlineWidth },
  card: { flex: 1 },
  caption: { ...StyleSheet.absoluteFill, justifyContent: 'flex-end' },
  index: { color: 'rgba(255,255,255,0.7)', fontSize: 12, fontWeight: '700', letterSpacing: 1.2 },
  title: { color: '#FFFFFF', fontSize: 24, fontWeight: '700', letterSpacing: -0.6, marginTop: 4 },
  meta: { color: 'rgba(255,255,255,0.75)', fontSize: 13, marginTop: 2 },
});
