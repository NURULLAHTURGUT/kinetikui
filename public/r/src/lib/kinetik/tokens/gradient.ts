import { Platform, type ViewStyle } from 'react-native';

/**
 * A CSS `linear-gradient(...)` background that works on native (New
 * Architecture `experimental_backgroundImage`) and on the web
 * (`backgroundImage`, passed through by react-native-web).
 *
 * Kept out of tokens.ts so the tokens stay plain data that Node tooling can read.
 */
export function gradient(css: string): ViewStyle {
  return (
    Platform.OS === 'web' ? { backgroundImage: css } : { experimental_backgroundImage: css }
  ) as ViewStyle;
}
