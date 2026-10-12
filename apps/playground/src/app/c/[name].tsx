import { defaultValues } from '@kinetik/registry/demo-kit/types';
import { categories, demos } from '@kinetik/registry/demos.generated';
import { useHaptic } from '@kinetik/registry/shared/hooks/use-haptic';
import { useKinetikTheme } from '@kinetik/registry/shared/tokens/theme';
import * as Clipboard from 'expo-clipboard';
import { router, useLocalSearchParams, useNavigation } from 'expo-router';
import { useEffect, useState } from 'react';
import { Platform, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { ControlPanel } from '../../ui/controls';
import { Icon } from '../../ui/icon';
import { PrefsBar } from '../../ui/prefs-bar';
import { PressableScale } from '../../ui/pressable-scale';

const mono = Platform.select({ ios: 'Menlo', android: 'monospace', default: 'monospace' });

export default function ComponentScreen() {
  const { name } = useLocalSearchParams<{ name: string }>();
  const entry = demos.find((d) => d.name === name);
  const theme = useKinetikTheme();
  const { colors, space, font, radius } = theme;
  const insets = useSafeAreaInsets();
  const haptic = useHaptic();
  const [values, setValues] = useState<Record<string, unknown>>(() =>
    entry ? defaultValues(entry.controls) : {},
  );
  const [copied, setCopied] = useState(false);
  const [demoKey, setDemoKey] = useState(0);
  // Mount the demo once the push transition has finished, so intro animations
  // (cascades, scrambles, counters) play where the user can see them.
  const navigation = useNavigation();
  const [ready, setReady] = useState(false);
  useEffect(() => {
    const unsubscribe = navigation.addListener('transitionEnd' as never, () => setReady(true));
    const fallback = setTimeout(() => setReady(true), 600);
    return () => {
      unsubscribe();
      clearTimeout(fallback);
    };
  }, [navigation]);

  useEffect(() => {
    if (!copied) return;
    const t = setTimeout(() => setCopied(false), 1600);
    return () => clearTimeout(t);
  }, [copied]);

  if (!entry) {
    return (
      <View style={[styles.center, { paddingTop: insets.top, gap: space[3] }]}>
        <Text style={{ color: colors.text, fontSize: font.size.xl, fontWeight: font.weight.bold }}>
          Not found
        </Text>
        <Text style={{ color: colors.textMuted }}>No component named “{name}”.</Text>
        <PressableScale
          accessibilityRole="button"
          onPress={() => router.replace('/')}
          style={{ padding: space[3] }}
        >
          <Text style={{ color: colors.ember, fontWeight: font.weight.semibold }}>
            Back to catalog
          </Text>
        </PressableScale>
      </View>
    );
  }

  const { Demo } = entry;
  const command = `npx kinetik-ui add ${entry.name}`;
  const hasControls = Object.keys(entry.controls).length > 0;

  const card = {
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderRadius: radius.lg,
    borderWidth: StyleSheet.hairlineWidth,
    padding: space[5],
  } as const;

  return (
    <View style={{ flex: 1 }}>
      <View
        style={[
          styles.topBar,
          { paddingTop: insets.top + space[2], paddingHorizontal: space[4], gap: space[3] },
        ]}
      >
        <PressableScale
          accessibilityRole="button"
          accessibilityLabel="Back"
          hitSlop={6}
          onPress={() => (router.canGoBack() ? router.back() : router.replace('/'))}
          style={[
            styles.iconButton,
            { backgroundColor: colors.surface, borderColor: colors.border },
          ]}
        >
          <Icon name="chevronLeft" size={20} color={colors.text} />
        </PressableScale>
        <View style={{ flex: 1 }}>
          <Text style={[styles.overline, { color: colors.textSubtle }]}>
            {categories[entry.category].toUpperCase()}
          </Text>
          <Text
            accessibilityRole="header"
            numberOfLines={1}
            style={{ color: colors.text, fontSize: font.size.lg, fontWeight: font.weight.bold }}
          >
            {entry.title}
          </Text>
        </View>
        <PressableScale
          accessibilityRole="button"
          accessibilityLabel="Restart demo"
          hitSlop={6}
          onPress={() => {
            haptic('tap');
            setDemoKey((k) => k + 1);
          }}
          style={[
            styles.iconButton,
            { backgroundColor: colors.surface, borderColor: colors.border },
          ]}
        >
          <Icon name="reset" size={18} color={colors.text} />
        </PressableScale>
      </View>

      <ScrollView
        contentContainerStyle={{
          padding: space[4],
          paddingBottom: insets.bottom + space[10],
          gap: space[4],
        }}
        keyboardShouldPersistTaps="handled"
      >
        <View
          style={[
            styles.stage,
            {
              backgroundColor: colors.surfaceSunken,
              borderRadius: radius.xl,
              padding: space[5],
              borderColor: colors.border,
            },
          ]}
        >
          {ready ? <Demo key={demoKey} {...values} /> : null}
        </View>

        <PrefsBar />

        {hasControls && (
          <View style={[card, { gap: space[4] }]}>
            <View style={styles.cardHeader}>
              <Text style={[styles.overline, { color: colors.textSubtle }]}>CONTROLS</Text>
              <PressableScale
                accessibilityRole="button"
                accessibilityLabel="Reset controls"
                style={styles.reset}
                onPress={() => {
                  haptic('tap');
                  setValues(defaultValues(entry.controls));
                }}
              >
                <Text
                  style={{
                    color: colors.ember,
                    fontSize: font.size.sm,
                    fontWeight: font.weight.semibold,
                  }}
                >
                  Reset
                </Text>
              </PressableScale>
            </View>
            <ControlPanel
              controls={entry.controls}
              values={values}
              onChange={(key, value) => setValues((v) => ({ ...v, [key]: value }))}
            />
          </View>
        )}

        <View style={[card, { gap: space[3] }]}>
          <Text style={[styles.overline, { color: colors.textSubtle }]}>INSTALL</Text>
          <View
            style={[
              styles.command,
              {
                backgroundColor: colors.surfaceSunken,
                borderRadius: radius.md,
                paddingLeft: space[4],
              },
            ]}
          >
            <Text
              selectable
              numberOfLines={1}
              adjustsFontSizeToFit
              minimumFontScale={0.6}
              style={{ flex: 1, color: colors.text, fontFamily: mono, fontSize: font.size.sm }}
            >
              <Text style={{ color: colors.textSubtle }}>$ </Text>
              {command}
            </Text>
            <PressableScale
              accessibilityRole="button"
              accessibilityLabel={copied ? 'Copied' : 'Copy install command'}
              onPress={async () => {
                await Clipboard.setStringAsync(command);
                haptic('success');
                setCopied(true);
              }}
              style={styles.copy}
            >
              <Icon
                name={copied ? 'check' : 'copy'}
                size={18}
                color={copied ? colors.success : colors.textMuted}
              />
            </PressableScale>
          </View>
          <Text style={{ color: colors.textMuted, fontSize: font.size.sm, lineHeight: 20 }}>
            {entry.description}
          </Text>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  reset: { minHeight: 44, minWidth: 44, alignItems: 'flex-end', justifyContent: 'center' },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  topBar: { flexDirection: 'row', alignItems: 'center', paddingBottom: 8 },
  iconButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: StyleSheet.hairlineWidth,
  },
  overline: { fontSize: 11, fontWeight: '700', letterSpacing: 1.6 },
  stage: { minHeight: 320, justifyContent: 'center', borderWidth: StyleSheet.hairlineWidth },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  command: { flexDirection: 'row', alignItems: 'center', height: 48 },
  copy: { width: 48, height: 48, alignItems: 'center', justifyContent: 'center' },
});
