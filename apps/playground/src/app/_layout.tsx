import { KinetikProvider, useKinetikTheme } from '@kinetik/registry/shared/tokens/theme';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import * as SystemUI from 'expo-system-ui';
import { useEffect } from 'react';
import { LogBox } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { PrefsProvider, usePrefs } from '../state/prefs';

// Reanimated warns in development whenever the system reduce-motion setting is
// on. Kinetik handles reduced motion itself, and the playground is often run
// with it on to check those versions.
LogBox.ignoreLogs(['[Reanimated] Reduced motion setting is enabled']);

export default function RootLayout() {
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <PrefsProvider>
          <ThemedRoot />
        </PrefsProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}

function ThemedRoot() {
  const { scheme, reduceMotion, haptics } = usePrefs();
  return (
    <KinetikProvider
      scheme={scheme}
      reduceMotion={reduceMotion ? 'always' : 'system'}
      haptics={haptics}
    >
      <Navigator />
    </KinetikProvider>
  );
}

function Navigator() {
  const { colors, scheme } = useKinetikTheme();

  useEffect(() => {
    SystemUI.setBackgroundColorAsync(colors.background).catch(() => {});
  }, [colors.background]);

  return (
    <>
      <StatusBar style={scheme === 'dark' ? 'light' : 'dark'} />
      <Stack
        screenOptions={{
          headerShown: false,
          contentStyle: { backgroundColor: colors.background },
          animation: 'slide_from_right',
        }}
      />
    </>
  );
}
