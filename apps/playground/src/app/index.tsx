import { categories, demos, type DemoEntry } from '@kinetik/registry/demos.generated';
import { useKinetikTheme } from '@kinetik/registry/shared/tokens/theme';
import { withAlpha } from '@kinetik/registry/shared/tokens/tokens';
import { router } from 'expo-router';
import { useMemo, useState } from 'react';
import { SectionList, StyleSheet, Text, TextInput, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Icon } from '../ui/icon';
import { PrefsBar } from '../ui/prefs-bar';
import { PressableScale } from '../ui/pressable-scale';

type CategoryKey = keyof typeof categories;

const screenCount = demos.filter((d) => d.category === 'screen').length;
const componentCount = demos.length - screenCount;

export default function Catalog() {
  const theme = useKinetikTheme();
  const { colors, space, font, radius } = theme;
  const insets = useSafeAreaInsets();
  const [query, setQuery] = useState('');

  const sections = useMemo(() => {
    const q = query.trim().toLowerCase();
    const matches = demos.filter(
      (d) =>
        !q ||
        d.title.toLowerCase().includes(q) ||
        d.description.toLowerCase().includes(q) ||
        d.category.includes(q),
    );
    return (Object.keys(categories) as CategoryKey[])
      .map((key) => ({
        key,
        title: categories[key],
        data: matches.filter((d) => d.category === key),
      }))
      .filter((s) => s.data.length > 0);
  }, [query]);

  return (
    <SectionList
      sections={sections}
      keyExtractor={(item) => item.name}
      stickySectionHeadersEnabled={false}
      keyboardDismissMode="on-drag"
      keyboardShouldPersistTaps="handled"
      contentContainerStyle={{
        paddingTop: insets.top + space[6],
        paddingBottom: insets.bottom + space[10],
        paddingHorizontal: space[5],
      }}
      ListHeaderComponent={
        <View style={{ gap: space[5], marginBottom: space[2] }}>
          <View style={{ gap: space[2] }}>
            <View style={styles.brandRow}>
              <View
                style={[
                  styles.brandDot,
                  {
                    backgroundColor: colors.ember,
                    boxShadow: `0px 0px 12px ${withAlpha(colors.ember, 0.8)}`,
                  },
                ]}
              />
              <Text style={[styles.overline, { color: colors.textMuted }]}>
                KINETIK UI · PLAYGROUND
              </Text>
            </View>
            <Text
              accessibilityRole="header"
              style={{
                color: colors.text,
                fontSize: font.size['3xl'],
                fontWeight: font.weight.heavy,
                letterSpacing: -1.2,
                lineHeight: 40,
              }}
            >
              Motion parts{'\n'}for Expo.
            </Text>
            <Text style={{ color: colors.textMuted, fontSize: font.size.md, lineHeight: 22 }}>
              {componentCount} components running on the UI thread, plus {screenCount} full-screen
              templates. Tap one to play with it.
            </Text>
          </View>
          <PrefsBar />
          <View
            style={[
              styles.search,
              {
                backgroundColor: colors.surface,
                borderColor: colors.border,
                borderRadius: radius.md,
                gap: space[2],
              },
            ]}
          >
            <Icon name="search" size={18} color={colors.textSubtle} />
            <TextInput
              value={query}
              onChangeText={setQuery}
              placeholder="Search components"
              placeholderTextColor={colors.textSubtle}
              accessibilityLabel="Search components"
              returnKeyType="search"
              autoCorrect={false}
              style={{
                flex: 1,
                alignSelf: 'stretch',
                color: colors.text,
                fontSize: font.size.md,
                paddingVertical: 0,
              }}
            />
            {query.length > 0 && (
              <PressableScale
                accessibilityRole="button"
                accessibilityLabel="Clear search"
                hitSlop={12}
                onPress={() => setQuery('')}
              >
                <Icon name="close" size={16} color={colors.textMuted} />
              </PressableScale>
            )}
          </View>
        </View>
      }
      renderSectionHeader={({ section }) => (
        <View style={[styles.sectionHeader, { marginTop: space[6], marginBottom: space[2] }]}>
          <Text style={[styles.overline, { color: colors.textSubtle }]}>
            {section.title.toUpperCase()}
          </Text>
          <Text style={[styles.overline, { color: colors.textSubtle }]}>{section.data.length}</Text>
        </View>
      )}
      ItemSeparatorComponent={() => <View style={{ height: space[2] }} />}
      renderItem={({ item }) => <Row item={item} />}
      ListEmptyComponent={
        <View style={{ alignItems: 'center', paddingVertical: space[12], gap: space[2] }}>
          <Text
            style={{ color: colors.text, fontSize: font.size.lg, fontWeight: font.weight.semibold }}
          >
            No matches
          </Text>
          <Text style={{ color: colors.textMuted, fontSize: font.size.sm }}>
            Try a component name or a category.
          </Text>
        </View>
      }
    />
  );
}

function Row({ item }: { item: DemoEntry }) {
  const { colors, space, font, radius } = useKinetikTheme();
  const accent =
    item.category === 'card' || item.category === 'interaction' ? colors.ember : colors.ice;
  return (
    <PressableScale
      accessibilityRole="button"
      accessibilityLabel={`${item.title}. ${item.description}`}
      accessibilityHint="Opens the live demo"
      onPress={() =>
        item.category === 'screen'
          ? router.push({ pathname: '/s/[name]', params: { name: item.name } })
          : router.push({ pathname: '/c/[name]', params: { name: item.name } })
      }
      style={[
        styles.row,
        {
          backgroundColor: colors.surface,
          borderColor: colors.border,
          borderRadius: radius.lg,
          padding: space[4],
          gap: space[4],
        },
      ]}
    >
      <View
        style={[
          styles.glyph,
          { backgroundColor: withAlpha(accent, 0.12), borderRadius: radius.md },
        ]}
      >
        <Text style={{ color: accent, fontWeight: font.weight.heavy, fontSize: font.size.md }}>
          {item.title
            .split(' ')
            .map((w) => w[0])
            .join('')
            .slice(0, 2)}
        </Text>
      </View>
      <View style={{ flex: 1, gap: 2 }}>
        <Text
          style={{ color: colors.text, fontSize: font.size.md, fontWeight: font.weight.semibold }}
        >
          {item.title}
        </Text>
        <Text
          numberOfLines={2}
          style={{ color: colors.textMuted, fontSize: font.size.sm, lineHeight: 19 }}
        >
          {item.description}
        </Text>
      </View>
      <Icon name="chevronRight" size={18} color={colors.textSubtle} />
    </PressableScale>
  );
}

const styles = StyleSheet.create({
  brandRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  brandDot: { width: 8, height: 8, borderRadius: 4 },
  overline: { fontSize: 11, fontWeight: '700', letterSpacing: 1.6 },
  search: {
    flexDirection: 'row',
    alignItems: 'center',
    height: 48,
    paddingHorizontal: 14,
    borderWidth: StyleSheet.hairlineWidth,
  },
  sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', paddingHorizontal: 4 },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: StyleSheet.hairlineWidth,
    minHeight: 76,
  },
  glyph: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center' },
});
