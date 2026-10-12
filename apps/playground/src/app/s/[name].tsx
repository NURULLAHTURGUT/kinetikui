import { demos } from '@kinetik/registry/demos.generated';
import { useKinetikTheme } from '@kinetik/registry/shared/tokens/theme';
import { Redirect, router, useLocalSearchParams } from 'expo-router';
import { StyleSheet, Text, View } from 'react-native';
import { SafeAreaInsetsContext, useSafeAreaInsets } from 'react-native-safe-area-context';

import { Icon } from '../../ui/icon';
import { PressableScale } from '../../ui/pressable-scale';

/** Screen templates run full-bleed under a slim bar, the way they would in an app. */
export default function ScreenTemplate() {
  const { name } = useLocalSearchParams<{ name: string }>();
  const entry = demos.find((d) => d.name === name && d.category === 'screen');
  const { colors, space, font } = useKinetikTheme();
  const insets = useSafeAreaInsets();

  if (!entry) return <Redirect href="/" />;
  const { Demo } = entry;

  return (
    <View style={[styles.fill, { backgroundColor: colors.background }]}>
      <View
        style={[
          styles.bar,
          {
            paddingTop: insets.top,
            paddingHorizontal: space[3],
            borderBottomColor: colors.border,
            backgroundColor: colors.background,
          },
        ]}
      >
        <PressableScale
          accessibilityRole="button"
          accessibilityLabel="Back to catalog"
          hitSlop={8}
          onPress={() => (router.canGoBack() ? router.back() : router.replace('/'))}
          style={styles.back}
        >
          <Icon name="chevronLeft" size={20} color={colors.text} />
        </PressableScale>
        <Text
          numberOfLines={1}
          style={{ color: colors.text, fontSize: font.size.md, fontWeight: font.weight.semibold }}
        >
          {entry.title}
        </Text>
        <Text style={{ color: colors.textSubtle, fontSize: font.size.xs, marginLeft: 'auto' }}>
          TEMPLATE
        </Text>
      </View>
      <SafeAreaInsetsContext.Provider value={{ ...insets, top: 0 }}>
        <View style={styles.fill}>
          <Demo />
        </View>
      </SafeAreaInsetsContext.Provider>
    </View>
  );
}

const styles = StyleSheet.create({
  fill: { flex: 1 },
  bar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    minHeight: 44,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  back: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center' },
});
