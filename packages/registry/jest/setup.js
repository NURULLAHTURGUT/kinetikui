/* global jest */
require('react-native-gesture-handler/jestSetup');
// Skia's own jestSetup is replaced by the extended mock below.

// Skia's mock predates useTexture; extend it with a no-op texture hook.
jest.mock('@shopify/react-native-skia', () => {
  jest.mock('@shopify/react-native-skia/lib/commonjs/Platform', () => {
    const Noop = () => undefined;
    return {
      OS: 'web',
      PixelRatio: 1,
      requireNativeComponent: Noop,
      resolveAsset: Noop,
      findNodeHandle: Noop,
      NativeModules: Noop,
      View: Noop,
    };
  });
  jest.mock('@shopify/react-native-skia/lib/commonjs/skia/core/Font', () => ({
    useFont: () => null,
    matchFont: () => null,
    listFontFamilies: () => [],
    useFonts: () => null,
  }));
  const base = require('@shopify/react-native-skia/lib/module/mock').Mock(global.CanvasKit);
  const empty = {
    value: null,
    get: () => null,
    set: () => {},
    addListener: () => {},
    removeListener: () => {},
    modify: () => {},
  };
  return {
    ...base,
    useTexture: () => empty,
    usePictureAsTexture: () => empty,
    useImageAsTexture: () => empty,
  };
});

jest.mock('expo-haptics', () => ({
  selectionAsync: jest.fn(() => Promise.resolve()),
  impactAsync: jest.fn(() => Promise.resolve()),
  notificationAsync: jest.fn(() => Promise.resolve()),
  ImpactFeedbackStyle: { Light: 'light', Medium: 'medium', Heavy: 'heavy' },
  NotificationFeedbackType: { Success: 'success', Warning: 'warning', Error: 'error' },
}));

jest.mock(
  'react-native-safe-area-context',
  () => require('react-native-safe-area-context/jest/mock').default,
);
