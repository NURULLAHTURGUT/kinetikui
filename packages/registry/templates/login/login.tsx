import { useState, type ReactNode } from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import Animated, { FadeIn, FadeInDown } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { PressJelly } from '../../items/press-jelly/press-jelly';
import { RevealField } from '../../items/reveal-field/reveal-field';
import { WordCascade } from '../../items/word-cascade/word-cascade';
import { durations, easings } from '../../shared/motion/motion';
import { useReduceMotion } from '../../shared/hooks/use-reduce-motion';
import { useKinetikTheme } from '../../shared/tokens/theme';
import { minTouchTarget } from '../../shared/tokens/tokens';

export type LoginProvider = {
  id: string;
  /** Button label, e.g. "Continue with Apple". */
  label: string;
  /** Icon before the label, in the text colour. */
  icon?: ReactNode;
  onPress: () => void;
};

export type LoginCredentials = { email: string; password: string };

export type LoginProps = {
  /** Sign in. Return a promise for a spinner; reject with an Error to show its message. */
  onLogin: (credentials: LoginCredentials) => Promise<void> | void;
  onForgotPassword?: () => void;
  /** Shows "Don't have an account? Sign up" at the bottom. */
  onSignUp?: () => void;
  /** Buttons under the form, e.g. Apple and Google. */
  providers?: readonly LoginProvider[];
  title?: string;
  subtitle?: string;
  /** Replaces the mark at the top. */
  logo?: ReactNode;
};

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/**
 * An email and password sign-in: the title rises in, the form settles into
 * place row by row, the button holds a spinner while you wait and a failed
 * attempt explains itself above it.
 */
export function Login({
  onLogin,
  onForgotPassword,
  onSignUp,
  providers = [],
  title = 'Welcome back',
  subtitle = 'Log in to pick up where you left off.',
  logo,
}: LoginProps) {
  const { colors, space, font, radius } = useKinetikTheme();
  const insets = useSafeAreaInsets();
  const reduced = useReduceMotion();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [tried, setTried] = useState(false);
  const [state, setState] = useState<'idle' | 'busy' | 'done'>('idle');
  const [failure, setFailure] = useState<string | null>(null);
  const [focused, setFocused] = useState(false);

  const emailError = tried && !EMAIL.test(email.trim()) ? 'Enter a valid email address' : undefined;
  const passwordError = tried && password.length === 0 ? 'Enter your password' : undefined;

  const submit = async () => {
    setTried(true);
    setFailure(null);
    if (!EMAIL.test(email.trim()) || password.length === 0) return;
    setState('busy');
    try {
      await onLogin({ email: email.trim(), password });
      setState('done');
    } catch (e) {
      setState('idle');
      setFailure(e instanceof Error && e.message ? e.message : 'Those details did not match.');
    }
  };

  // Each block settles in a beat after the one above it.
  const enter = (step: number) =>
    reduced
      ? undefined
      : FadeInDown.delay(120 + step * 70)
          .duration(durations.slow)
          .easing(easings.standard);

  const label = (text: string) => (
    <Text style={{ color: colors.text, fontSize: font.size.sm, fontWeight: font.weight.medium }}>
      {text}
    </Text>
  );

  return (
    <KeyboardAvoidingView
      style={[styles.fill, { backgroundColor: colors.background }]}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView
        style={styles.fill}
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={{
          flexGrow: 1,
          paddingTop: insets.top + space[10],
          paddingBottom: insets.bottom + space[4],
          paddingHorizontal: space[6],
          gap: space[6],
        }}
      >
        <View style={{ gap: space[4] }}>
          <Animated.View entering={enter(0)}>
            {logo ?? (
              <View
                style={[styles.mark, { backgroundColor: colors.text, borderRadius: radius.md }]}
              >
                <View style={[styles.markDot, { backgroundColor: colors.background }]} />
              </View>
            )}
          </Animated.View>
          <View style={{ gap: space[2] }}>
            <WordCascade
              text={title}
              delay={reduced ? 0 : 80}
              style={{
                color: colors.text,
                fontSize: font.size['2xl'],
                fontWeight: font.weight.bold,
                letterSpacing: font.tracking.tight,
              }}
            />
            <Animated.Text
              entering={enter(1)}
              style={{ color: colors.textMuted, fontSize: font.size.md, lineHeight: 22 }}
            >
              {subtitle}
            </Animated.Text>
          </View>
        </View>

        <Animated.View entering={enter(2)} style={{ gap: space[4] }}>
          <View style={{ gap: space[2] }}>
            {label('Email')}
            <TextInput
              value={email}
              onChangeText={setEmail}
              accessibilityLabel="Email"
              placeholder="you@example.com"
              placeholderTextColor={colors.textSubtle}
              keyboardType="email-address"
              autoCapitalize="none"
              autoCorrect={false}
              autoComplete="email"
              textContentType="emailAddress"
              returnKeyType="next"
              onFocus={() => setFocused(true)}
              onBlur={() => setFocused(false)}
              editable={state !== 'busy'}
              selectionColor={colors.azure}
              cursorColor={colors.azure}
              style={[
                styles.input,
                {
                  color: colors.text,
                  fontSize: font.size.md,
                  backgroundColor: colors.surface,
                  borderColor: emailError
                    ? colors.danger
                    : focused
                      ? colors.azure
                      : colors.borderStrong,
                  borderRadius: radius.md,
                  paddingHorizontal: space[4],
                },
              ]}
            />
            {emailError ? (
              <Animated.Text
                entering={reduced ? undefined : FadeIn.duration(durations.base)}
                accessibilityLiveRegion="polite"
                style={{ color: colors.danger, fontSize: font.size.xs }}
              >
                {emailError}
              </Animated.Text>
            ) : null}
          </View>
          <View style={{ gap: space[2] }}>
            <RevealField
              value={password}
              onChangeText={setPassword}
              editable={state !== 'busy'}
              autoComplete="current-password"
              textContentType="password"
              onSubmitEditing={submit}
              returnKeyType="go"
            />
            {passwordError ? (
              <Animated.Text
                entering={reduced ? undefined : FadeIn.duration(durations.base)}
                accessibilityLiveRegion="polite"
                style={{ color: colors.danger, fontSize: font.size.xs }}
              >
                {passwordError}
              </Animated.Text>
            ) : null}
          </View>
          {onForgotPassword ? (
            <Pressable
              accessibilityRole="link"
              onPress={onForgotPassword}
              style={[styles.link, styles.end]}
            >
              <Text
                style={{
                  color: colors.textMuted,
                  fontSize: font.size.sm,
                  fontWeight: font.weight.medium,
                }}
              >
                Forgot password?
              </Text>
            </Pressable>
          ) : null}
        </Animated.View>

        <Animated.View entering={enter(3)} style={{ gap: space[3] }}>
          {failure ? (
            <Animated.View
              entering={reduced ? undefined : FadeInDown.duration(durations.base)}
              accessible
              accessibilityRole="alert"
              accessibilityLiveRegion="assertive"
              style={[
                styles.alert,
                {
                  backgroundColor: colors.surface,
                  borderColor: colors.danger,
                  borderRadius: radius.md,
                  padding: space[3],
                  gap: space[2],
                },
              ]}
            >
              <View style={[styles.alertDot, { backgroundColor: colors.danger }]} />
              <Text style={[styles.fill, { color: colors.text, fontSize: font.size.sm }]}>
                {failure}
              </Text>
            </Animated.View>
          ) : null}
          <PressJelly
            block
            size="lg"
            variant={state === 'done' ? 'surface' : 'ember'}
            loading={state === 'busy'}
            onPress={state === 'idle' ? submit : undefined}
          >
            {state === 'done' ? 'Logged in' : 'Log in'}
          </PressJelly>
        </Animated.View>

        {providers.length > 0 ? (
          <Animated.View entering={enter(4)} style={{ gap: space[3] }}>
            <View style={[styles.row, { gap: space[3] }]}>
              <View style={[styles.rule, { backgroundColor: colors.border }]} />
              <Text style={{ color: colors.textSubtle, fontSize: font.size.xs }}>or</Text>
              <View style={[styles.rule, { backgroundColor: colors.border }]} />
            </View>
            {providers.map((p) => (
              <PressJelly
                key={p.id}
                block
                variant="surface"
                leading={p.icon}
                disabled={state === 'busy'}
                onPress={p.onPress}
              >
                {p.label}
              </PressJelly>
            ))}
          </Animated.View>
        ) : null}

        {onSignUp ? (
          <Animated.View entering={enter(5)} style={[styles.row, styles.footer]}>
            <Text style={{ color: colors.textMuted, fontSize: font.size.sm }}>
              Don’t have an account?
            </Text>
            <Pressable accessibilityRole="link" onPress={onSignUp} style={styles.link}>
              <Text
                style={{
                  color: colors.text,
                  fontSize: font.size.sm,
                  fontWeight: font.weight.semibold,
                  textDecorationLine: 'underline',
                }}
              >
                Sign up
              </Text>
            </Pressable>
          </Animated.View>
        ) : null}
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  fill: { flex: 1 },
  mark: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center' },
  markDot: { width: 16, height: 16, borderRadius: 8, marginLeft: 10 },
  input: { minHeight: 52, borderWidth: 1 },
  link: { minHeight: minTouchTarget, justifyContent: 'center', paddingHorizontal: 4 },
  end: { alignSelf: 'flex-end', marginTop: -8 },
  alert: { flexDirection: 'row', alignItems: 'center', borderWidth: 1 },
  alertDot: { width: 8, height: 8, borderRadius: 4 },
  row: { flexDirection: 'row', alignItems: 'center' },
  rule: { flex: 1, height: StyleSheet.hairlineWidth },
  footer: { justifyContent: 'center', marginTop: 'auto', gap: 2 },
});
