import { useEffect, useState, type ReactNode } from 'react';
import {
  Keyboard,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import Animated, {
  FadeIn,
  FadeOut,
  SlideInRight,
  SlideOutLeft,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { CodeField, type CodeFieldStatus } from '../../items/code-field/code-field';
import { PressJelly } from '../../items/press-jelly/press-jelly';
import { WordCascade } from '../../items/word-cascade/word-cascade';
import { durations, easings, spring, timing } from '../../shared/motion/motion';
import { useReduceMotion } from '../../shared/hooks/use-reduce-motion';
import { useKinetikTheme } from '../../shared/tokens/theme';
import { minTouchTarget } from '../../shared/tokens/tokens';

export type AuthProps = {
  /** Send a one-time code to the address. Reject with an Error to show its message. */
  onSendCode: (email: string) => Promise<void> | void;
  /** Check the code. Reject when it is wrong; the field shakes and clears. */
  onVerify: (email: string, code: string) => Promise<void> | void;
  /** Called by the button on the final step. */
  onDone: () => void;
  /** Digits in the code. Defaults to 6. */
  codeLength?: number;
  /** Seconds before the code can be sent again. Defaults to 30. */
  resendAfter?: number;
  /** Prefills the address. */
  initialEmail?: string;
};

type Step = 'email' | 'code' | 'done';

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/**
 * Passwordless sign-in in three steps that slide into each other: an email,
 * a one-time code with a resend countdown, and a check that pops in once
 * you are through.
 */
export function Auth({
  onSendCode,
  onVerify,
  onDone,
  codeLength = 6,
  resendAfter = 30,
  initialEmail = '',
}: AuthProps) {
  const { colors, space } = useKinetikTheme();
  const insets = useSafeAreaInsets();
  const reduced = useReduceMotion();
  const [step, setStep] = useState<Step>('email');
  const [back, setBack] = useState(false);
  const [email, setEmail] = useState(initialEmail);

  const enter = reduced
    ? FadeIn.duration(durations.quick)
    : back
      ? FadeIn.duration(durations.base).easing(easings.standard)
      : SlideInRight.duration(durations.slow).easing(easings.standard);
  const exit = reduced
    ? FadeOut.duration(durations.quick)
    : back
      ? FadeOut.duration(durations.quick)
      : SlideOutLeft.duration(durations.base).easing(easings.exit);

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
          paddingTop: insets.top + space[6],
          paddingBottom: insets.bottom + space[4],
          paddingHorizontal: space[6],
        }}
      >
        <Animated.View key={step} entering={enter} exiting={exit} style={styles.fill}>
          {step === 'email' ? (
            <EmailStep
              email={email}
              onChange={setEmail}
              onSend={async (address) => {
                await onSendCode(address);
                setEmail(address);
                setBack(false);
                setStep('code');
              }}
            />
          ) : step === 'code' ? (
            <CodeStep
              email={email}
              length={codeLength}
              resendAfter={resendAfter}
              onResend={() => onSendCode(email)}
              onVerify={(code) => onVerify(email, code)}
              onVerified={() => {
                Keyboard.dismiss();
                setBack(false);
                setStep('done');
              }}
              onChangeEmail={() => {
                setBack(true);
                setStep('email');
              }}
            />
          ) : (
            <DoneStep onDone={onDone} />
          )}
        </Animated.View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

function Heading({ title, body }: { title: string; body: ReactNode }) {
  const { colors, space, font } = useKinetikTheme();
  return (
    <View style={{ gap: space[2] }}>
      <WordCascade
        text={title}
        delay={120}
        style={{
          color: colors.text,
          fontSize: font.size['2xl'],
          fontWeight: font.weight.bold,
          letterSpacing: font.tracking.tight,
        }}
      />
      <Text style={{ color: colors.textMuted, fontSize: font.size.md, lineHeight: 22 }}>
        {body}
      </Text>
    </View>
  );
}

/** A round badge with an envelope drawn from two views. */
function Envelope() {
  const { colors, radius } = useKinetikTheme();
  return (
    <View
      aria-hidden
      style={[styles.badge, { backgroundColor: colors.surface, borderColor: colors.border }]}
    >
      <View style={[styles.letter, { borderColor: colors.text, borderRadius: radius.xs }]}>
        <View style={[styles.flap, { borderColor: colors.text }]} />
      </View>
    </View>
  );
}

function EmailStep({
  email,
  onChange,
  onSend,
}: {
  email: string;
  onChange: (email: string) => void;
  onSend: (email: string) => Promise<void>;
}) {
  const { colors, space, font, radius } = useKinetikTheme();
  const [busy, setBusy] = useState(false);
  const [focused, setFocused] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const send = async () => {
    const address = email.trim();
    if (!EMAIL.test(address)) {
      setError('Enter a valid email address');
      return;
    }
    setError(null);
    setBusy(true);
    try {
      await onSend(address);
    } catch (e) {
      setError(e instanceof Error && e.message ? e.message : 'We could not send a code.');
      setBusy(false);
    }
  };

  return (
    <View style={[styles.fill, { gap: space[6] }]}>
      <Envelope />
      <Heading
        title="Sign in with a code"
        body="We’ll email you a one-time code. No password to remember."
      />
      <View style={{ gap: space[2] }}>
        <Text
          style={{ color: colors.text, fontSize: font.size.sm, fontWeight: font.weight.medium }}
        >
          Email
        </Text>
        <TextInput
          value={email}
          onChangeText={(text) => {
            onChange(text);
            if (error) setError(null);
          }}
          accessibilityLabel="Email"
          placeholder="you@example.com"
          placeholderTextColor={colors.textSubtle}
          keyboardType="email-address"
          autoCapitalize="none"
          autoCorrect={false}
          autoComplete="email"
          textContentType="emailAddress"
          returnKeyType="send"
          onSubmitEditing={send}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
          editable={!busy}
          selectionColor={colors.azure}
          cursorColor={colors.azure}
          style={[
            styles.input,
            {
              color: colors.text,
              fontSize: font.size.md,
              backgroundColor: colors.surface,
              borderColor: error ? colors.danger : focused ? colors.azure : colors.borderStrong,
              borderRadius: radius.md,
              paddingHorizontal: space[4],
            },
          ]}
        />
        {error ? (
          <Text
            accessibilityLiveRegion="polite"
            style={{ color: colors.danger, fontSize: font.size.xs }}
          >
            {error}
          </Text>
        ) : null}
      </View>
      <PressJelly block size="lg" loading={busy} onPress={busy ? undefined : send}>
        Send code
      </PressJelly>
    </View>
  );
}

function CodeStep({
  email,
  length,
  resendAfter,
  onResend,
  onVerify,
  onVerified,
  onChangeEmail,
}: {
  email: string;
  length: number;
  resendAfter: number;
  onResend: () => Promise<void> | void;
  onVerify: (code: string) => Promise<void> | void;
  onVerified: () => void;
  onChangeEmail: () => void;
}) {
  const { colors, space, font } = useKinetikTheme();
  const [code, setCode] = useState('');
  const [status, setStatus] = useState<CodeFieldStatus>('idle');
  const [checking, setChecking] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [left, setLeft] = useState(resendAfter);

  // One tick per second while the resend link is locked.
  useEffect(() => {
    if (left <= 0) return;
    const id = setTimeout(() => setLeft((s) => s - 1), 1000);
    return () => clearTimeout(id);
  }, [left]);

  const verify = async (value: string) => {
    setChecking(true);
    setMessage(null);
    try {
      await onVerify(value);
      setStatus('success');
      // Let the success wave run along the digits before moving on.
      setTimeout(onVerified, 650);
    } catch {
      setStatus('error');
      setMessage('That code didn’t match. Try again.');
      setTimeout(() => setCode(''), 450);
    } finally {
      setChecking(false);
    }
  };

  const resend = async () => {
    setMessage(null);
    setLeft(resendAfter);
    try {
      await onResend();
      setMessage('A new code is on its way.');
    } catch {
      setLeft(0);
      setMessage('We could not send a new code.');
    }
  };

  const clock = `${Math.floor(left / 60)}:${String(left % 60).padStart(2, '0')}`;

  return (
    <View style={[styles.fill, { gap: space[6] }]}>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Change email"
        onPress={onChangeEmail}
        style={styles.backLink}
      >
        <Text
          style={{
            color: colors.textMuted,
            fontSize: font.size.sm,
            fontWeight: font.weight.medium,
          }}
        >
          ‹ Change email
        </Text>
      </Pressable>
      <Heading
        title="Check your inbox"
        body={
          <>
            Enter the code we sent to{' '}
            <Text style={{ color: colors.text, fontWeight: font.weight.semibold }}>{email}</Text>
          </>
        }
      />
      <View style={{ gap: space[3] }}>
        <CodeField
          value={code}
          onChangeText={(value) => {
            setCode(value);
            if (status === 'error') setStatus('idle');
          }}
          onComplete={verify}
          length={length}
          status={status}
          disabled={checking || status === 'success'}
          autoFocus
        />
        <Text
          accessibilityLiveRegion="polite"
          style={{
            minHeight: 18,
            color: status === 'error' ? colors.danger : colors.textMuted,
            fontSize: font.size.xs,
          }}
        >
          {checking ? 'Checking…' : (message ?? '')}
        </Text>
      </View>
      {left > 0 ? (
        <Text
          accessibilityLabel={`You can resend the code in ${left} seconds`}
          style={[styles.resend, { color: colors.textSubtle, fontSize: font.size.sm }]}
        >
          Resend code in {clock}
        </Text>
      ) : (
        <Pressable accessibilityRole="button" onPress={resend} style={styles.resend}>
          <Text
            style={{
              color: colors.text,
              fontSize: font.size.sm,
              fontWeight: font.weight.semibold,
              textDecorationLine: 'underline',
            }}
          >
            Resend code
          </Text>
        </Pressable>
      )}
    </View>
  );
}

/** A check that pops into a filled circle while a ring breathes out once behind it. */
function DoneStep({ onDone }: { onDone: () => void }) {
  const { colors, space, font } = useKinetikTheme();
  const reduced = useReduceMotion();
  const pop = useSharedValue(reduced ? 1 : 0);
  const ring = useSharedValue(reduced ? 1 : 0);

  useEffect(() => {
    if (reduced) return;
    pop.set(withDelay(160, withSpring(1, spring('bouncy'))));
    ring.set(withDelay(260, withTiming(1, { ...timing('slow'), duration: 900 })));
  }, [reduced, pop, ring]);

  const badge = useAnimatedStyle(() => ({ transform: [{ scale: pop.get() }] }));
  const tick = useAnimatedStyle(() => ({
    opacity: Math.min(1, Math.max(0, pop.get() * 2 - 0.8)),
    transform: [{ rotate: '-45deg' }, { scale: 0.6 + pop.get() * 0.4 }],
  }));
  const halo = useAnimatedStyle(() => ({
    opacity: reduced ? 0 : (1 - ring.get()) * 0.6,
    transform: [{ scale: 1 + ring.get() * 0.9 }],
  }));

  return (
    <View style={[styles.fill, styles.done, { gap: space[6] }]}>
      <View style={styles.doneArt}>
        <Animated.View style={[styles.halo, { borderColor: colors.success }, halo]} />
        <Animated.View style={[styles.doneBadge, { backgroundColor: colors.success }, badge]}>
          <Animated.View style={[styles.tick, { borderColor: colors.background }, tick]} />
        </Animated.View>
      </View>
      <View style={{ gap: space[2], alignItems: 'center' }}>
        <Text
          accessibilityRole="header"
          style={{
            color: colors.text,
            fontSize: font.size['2xl'],
            fontWeight: font.weight.bold,
            letterSpacing: font.tracking.tight,
          }}
        >
          You’re in
        </Text>
        <Text
          style={{
            color: colors.textMuted,
            fontSize: font.size.md,
            lineHeight: 22,
            textAlign: 'center',
          }}
        >
          Your email is verified. Next time it takes a single code.
        </Text>
      </View>
      <PressJelly block size="lg" onPress={onDone} style={styles.doneButton}>
        Continue
      </PressJelly>
    </View>
  );
}

const styles = StyleSheet.create({
  fill: { flex: 1 },
  input: { minHeight: 52, borderWidth: 1 },
  badge: {
    width: 56,
    height: 56,
    borderRadius: 28,
    borderWidth: StyleSheet.hairlineWidth,
    alignItems: 'center',
    justifyContent: 'center',
  },
  letter: { width: 24, height: 18, borderWidth: 1.75, overflow: 'hidden', alignItems: 'center' },
  flap: {
    width: 16,
    height: 16,
    marginTop: -10,
    borderWidth: 1.75,
    transform: [{ rotate: '45deg' }],
  },
  backLink: { minHeight: minTouchTarget, justifyContent: 'center', alignSelf: 'flex-start' },
  resend: {
    minHeight: minTouchTarget,
    alignSelf: 'center',
    justifyContent: 'center',
    textAlignVertical: 'center',
  },
  done: { alignItems: 'center', justifyContent: 'center' },
  doneArt: { width: 120, height: 120, alignItems: 'center', justifyContent: 'center' },
  halo: { position: 'absolute', width: 96, height: 96, borderRadius: 48, borderWidth: 2 },
  doneBadge: {
    width: 96,
    height: 96,
    borderRadius: 48,
    alignItems: 'center',
    justifyContent: 'center',
  },
  tick: {
    width: 34,
    height: 18,
    marginTop: -8,
    borderLeftWidth: 5,
    borderBottomWidth: 5,
    borderRadius: 2,
  },
  doneButton: { alignSelf: 'stretch' },
});
