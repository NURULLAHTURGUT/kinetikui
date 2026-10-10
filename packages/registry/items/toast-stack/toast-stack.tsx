import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import {
  AccessibilityInfo,
  Pressable,
  StyleSheet,
  Text,
  View,
  useWindowDimensions,
  type AccessibilityActionEvent,
} from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { scheduleOnRN } from 'react-native-worklets';

import { useHaptic, type HapticKind } from '../../shared/hooks/use-haptic';
import { useReduceMotion } from '../../shared/hooks/use-reduce-motion';
import { spring, timing } from '../../shared/motion/motion';
import { useKinetikTheme } from '../../shared/tokens/theme';
import { minTouchTarget } from '../../shared/tokens/tokens';

export type ToastTone = 'neutral' | 'success' | 'warning' | 'danger';

export type ToastOptions = {
  title: string;
  description?: string;
  /** Defaults to `neutral`. */
  tone?: ToastTone;
  /** Auto-dismiss after this many ms. `null` keeps it until dismissed. Defaults to the provider's duration. */
  duration?: number | null;
  /** One optional action, e.g. Undo. Pressing it dismisses the toast. */
  action?: { label: string; onPress: () => void };
};

type ToastRecord = ToastOptions & { id: number; leaving: boolean };

type ToastApi = {
  /** Shows a toast and returns its id. */
  show: (options: ToastOptions) => number;
  dismiss: (id: number) => void;
  dismissAll: () => void;
};

const ToastContext = createContext<ToastApi | null>(null);

/** Shows and dismisses toasts. Must be used inside a `ToastProvider`. */
export function useToast(): ToastApi {
  const api = useContext(ToastContext);
  if (!api) throw new Error('useToast must be used inside <ToastProvider>');
  return api;
}

export type ToastProviderProps = {
  children: ReactNode;
  /** Defaults to `top`. */
  placement?: 'top' | 'bottom';
  /** Default auto-dismiss time in ms. Defaults to 4000. */
  duration?: number;
  /** Toasts kept in the stack; older ones are dropped. Defaults to 3. */
  max?: number;
  /** Distance from the safe-area edge, in pt. Defaults to 8. */
  offset?: number;
  /** Plays a haptic for success, warning and danger toasts. Defaults to true. */
  haptics?: boolean;
  /** Keep clear of the status bar and home indicator. Turn off when the provider wraps a small region rather than the screen. Defaults to true. */
  safeArea?: boolean;
};

const PEEK = 10;
const GAP = 8;
const toneHaptic: Record<ToastTone, HapticKind | null> = {
  neutral: null,
  success: 'success',
  warning: 'warning',
  danger: 'error',
};

/**
 * Hosts a stack of toasts. New toasts slide in on top of the stack and older
 * ones tuck behind. Tap the stack to fan it out; swipe a toast sideways to
 * dismiss it. Timers pause while the stack is open.
 */
export function ToastProvider({
  children,
  placement = 'top',
  duration = 4000,
  max = 3,
  offset = 8,
  haptics = true,
  safeArea = true,
}: ToastProviderProps) {
  const haptic = useHaptic(haptics);
  const insets = useSafeAreaInsets();
  const { space } = useKinetikTheme();
  const [toasts, setToasts] = useState<ToastRecord[]>([]);
  const [expanded, setExpanded] = useState(false);
  const [heights, setHeights] = useState<Record<number, number>>({});
  const nextId = useRef(1);
  const timers = useRef(new Map<number, ReturnType<typeof setTimeout>>());

  const remove = useCallback((id: number) => {
    setToasts((all) => all.filter((t) => t.id !== id));
    setHeights(({ [id]: _, ...rest }) => rest);
  }, []);

  const dismiss = useCallback((id: number) => {
    const timer = timers.current.get(id);
    if (timer) clearTimeout(timer);
    timers.current.delete(id);
    setToasts((all) => all.map((t) => (t.id === id ? { ...t, leaving: true } : t)));
  }, []);

  const dismissAll = useCallback(() => {
    setExpanded(false);
    timers.current.forEach(clearTimeout);
    timers.current.clear();
    setToasts((all) => all.map((t) => ({ ...t, leaving: true })));
  }, []);

  const show = useCallback(
    (options: ToastOptions) => {
      const id = nextId.current++;
      setToasts((all) => {
        const next = [{ ...options, id, leaving: false }, ...all];
        // Drop the oldest beyond `max`, letting them animate out.
        return next.map((t, i) => (i >= max && !t.leaving ? { ...t, leaving: true } : t));
      });
      const kind = toneHaptic[options.tone ?? 'neutral'];
      if (kind) haptic(kind);
      AccessibilityInfo.announceForAccessibility(
        options.description ? `${options.title}. ${options.description}` : options.title,
      );
      return id;
    },
    [haptic, max],
  );

  const visible = toasts.filter((t) => !t.leaving);
  // A single toast has nothing to fan out.
  const open = expanded && visible.length > 1;

  // Timers run only while the stack is collapsed; opening it pauses them all.
  useEffect(() => {
    const map = timers.current;
    if (open) {
      map.forEach(clearTimeout);
      map.clear();
      return;
    }
    for (const t of toasts) {
      if (t.leaving || map.has(t.id)) continue;
      const ms = t.duration === undefined ? duration : t.duration;
      if (ms === null) continue;
      map.set(
        t.id,
        setTimeout(() => {
          map.delete(t.id);
          dismiss(t.id);
        }, ms),
      );
    }
  }, [toasts, open, duration, dismiss]);

  useEffect(() => {
    const map = timers.current;
    return () => map.forEach(clearTimeout);
  }, []);

  const api = useMemo(() => ({ show, dismiss, dismissAll }), [show, dismiss, dismissAll]);

  const edge = (safeArea ? (placement === 'top' ? insets.top : insets.bottom) : 0) + offset;
  const order = new Map(visible.map((t, i) => [t.id, i]));
  // Expanded offsets: each toast sits below (or above) the ones in front of it.
  const stackOffsets = new Map<number, number>();
  let acc = 0;
  for (const t of visible) {
    stackOffsets.set(t.id, acc);
    acc += (heights[t.id] ?? 64) + GAP;
  }
  // The host must cover the stack: Android does not deliver touches outside a parent's bounds.
  const front = visible[0] ? (heights[visible[0].id] ?? 64) : 0;
  const hostHeight = open
    ? Math.max(0, acc - GAP)
    : front + PEEK * Math.max(0, Math.min(visible.length, max) - 1);

  return (
    <ToastContext.Provider value={api}>
      {children}
      <View
        pointerEvents="box-none"
        style={[
          styles.host,
          placement === 'top' ? { top: edge } : { bottom: edge },
          { height: hostHeight },
        ]}
      >
        {/* Render oldest first so the newest paints on top. */}
        {[...toasts].reverse().map((t) => (
          <ToastItem
            key={t.id}
            toast={t}
            index={order.get(t.id) ?? max}
            count={visible.length}
            max={max}
            expanded={open}
            placement={placement}
            stackOffset={stackOffsets.get(t.id) ?? 0}
            frontHeight={front}
            naturalHeight={heights[t.id] ?? 0}
            inset={space[4]}
            onMeasure={(h) =>
              setHeights((all) =>
                Math.abs((all[t.id] ?? 0) - h) < 0.5 ? all : { ...all, [t.id]: h },
              )
            }
            onPressStack={() => setExpanded((e) => !e)}
            onDismiss={() => dismiss(t.id)}
            onGone={() => remove(t.id)}
          />
        ))}
      </View>
    </ToastContext.Provider>
  );
}

function ToastItem({
  toast,
  index,
  count,
  max,
  expanded,
  placement,
  stackOffset,
  frontHeight,
  naturalHeight,
  inset,
  onMeasure,
  onPressStack,
  onDismiss,
  onGone,
}: {
  toast: ToastRecord;
  index: number;
  count: number;
  max: number;
  expanded: boolean;
  placement: 'top' | 'bottom';
  stackOffset: number;
  frontHeight: number;
  naturalHeight: number;
  inset: number;
  onMeasure: (height: number) => void;
  onPressStack: () => void;
  onDismiss: () => void;
  onGone: () => void;
}) {
  const { colors, radius, font, space, shadow } = useKinetikTheme();
  const reduced = useReduceMotion();
  const { width: screen } = useWindowDimensions();
  const dir = placement === 'top' ? 1 : -1;
  const tone = toast.tone ?? 'neutral';
  const accent = {
    neutral: colors.textMuted,
    success: colors.success,
    warning: colors.warning,
    danger: colors.danger,
  }[tone];

  const y = useSharedValue(-dir * 48);
  const scale = useSharedValue(reduced ? 1 : 0.96);
  const opacity = useSharedValue(0);
  const dx = useSharedValue(0);
  // Cards tucked behind the front one shrink to its height and hide their
  // content, so only their edges peek out.
  const height = useSharedValue(0);
  const content = useSharedValue(1);

  // Collapsed: newer toasts in front, older ones peeking behind, scaled down.
  // Expanded: a list, each toast at its accumulated offset.
  useEffect(() => {
    const cfg = spring('smooth', reduced);
    if (toast.leaving) {
      opacity.set(
        withTiming(0, timing('quick', reduced, 'exit'), (done) => {
          'worklet';
          if (done) scheduleOnRN(onGone);
        }),
      );
      if (dx.get() === 0) y.set(withSpring(-dir * 24, cfg));
      return;
    }
    const tucked = !expanded && index > 0;
    if (naturalHeight > 0) {
      const target = tucked && frontHeight > 0 ? frontHeight : naturalHeight;
      height.set(height.get() === 0 ? target : withSpring(target, cfg));
    }
    content.set(withTiming(tucked ? 0 : 1, timing('quick', reduced)));
    const hidden = !expanded && index >= max;
    opacity.set(withTiming(hidden ? 0 : expanded ? 1 : 1 - index * 0.18, timing('base', reduced)));
    y.set(withSpring(dir * (expanded ? stackOffset : index * PEEK), cfg));
    scale.set(withSpring(expanded || reduced ? 1 : 1 - index * 0.05, cfg));
    // onGone is stable per toast for this purpose.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [toast.leaving, index, expanded, stackOffset, frontHeight, naturalHeight, max, dir, reduced]);

  const swipe = Gesture.Pan()
    .withTestId(`toast-${toast.id}`)
    .enabled(!toast.leaving && (index === 0 || expanded))
    .activeOffsetX([-12, 12])
    .failOffsetY([-12, 12])
    .onUpdate((e) => {
      dx.set(e.translationX);
    })
    .onEnd((e) => {
      const fling = Math.abs(e.velocityX) > 800;
      if (Math.abs(e.translationX) > screen * 0.3 || fling) {
        const to = Math.sign(e.translationX || e.velocityX) * screen;
        dx.set(
          withSpring(to, { ...spring('snappy', reduced, e.velocityX), overshootClamping: true }),
        );
        scheduleOnRN(onDismiss);
      } else {
        dx.set(withSpring(0, spring('bouncy', reduced)));
      }
    });

  const tap = Gesture.Tap()
    .withTestId(`toast-tap-${toast.id}`)
    .enabled(count > 1 && !toast.leaving)
    .onEnd((_e, success) => {
      if (success) scheduleOnRN(onPressStack);
    });

  const style = useAnimatedStyle(() => ({
    opacity: opacity.get() * (1 - Math.min(1, Math.abs(dx.get()) / (screen * 0.8))),
    // Keep the key present from the first frame; Reanimated ignores keys added later.
    maxHeight: height.get() > 0 ? height.get() : 10_000,
    transform: [{ translateY: y.get() }, { translateX: dx.get() }, { scale: scale.get() }],
  }));
  const contentStyle = useAnimatedStyle(() => ({ opacity: content.get() }));

  const onAccessibilityAction = (e: AccessibilityActionEvent) => {
    if (e.nativeEvent.actionName === 'dismiss' || e.nativeEvent.actionName === 'escape')
      onDismiss();
  };

  return (
    <GestureDetector gesture={Gesture.Exclusive(swipe, tap)}>
      <Animated.View
        collapsable={false}
        accessible
        accessibilityRole="alert"
        accessibilityLabel={
          toast.description ? `${toast.title}. ${toast.description}` : toast.title
        }
        accessibilityActions={[{ name: 'dismiss', label: 'Dismiss' }, { name: 'escape' }]}
        onAccessibilityAction={onAccessibilityAction}
        importantForAccessibility={index >= max && !expanded ? 'no-hide-descendants' : 'auto'}
        style={[
          styles.toast,
          placement === 'top' ? styles.anchorTop : styles.anchorBottom,
          {
            left: inset,
            right: inset,
            backgroundColor: colors.surfaceRaised,
            borderColor: colors.border,
            borderRadius: radius.lg,
            boxShadow: shadow.lg,
          },
          style,
        ]}
      >
        {/* Measured without the card's clamped height, so it reports the natural size. */}
        <Animated.View
          onLayout={(e) => onMeasure(e.nativeEvent.layout.height)}
          style={[styles.content, { padding: space[4], gap: space[3] }, contentStyle]}
        >
          <View
            style={[styles.dot, { backgroundColor: accent, boxShadow: `0px 0px 8px ${accent}` }]}
          />
          <View style={styles.texts}>
            <Text
              numberOfLines={2}
              style={{
                color: colors.text,
                fontSize: font.size.md,
                fontWeight: font.weight.semibold,
              }}
            >
              {toast.title}
            </Text>
            {toast.description ? (
              <Text
                numberOfLines={3}
                style={{
                  color: colors.textMuted,
                  fontSize: font.size.sm,
                  marginTop: 2,
                  lineHeight: 19,
                }}
              >
                {toast.description}
              </Text>
            ) : null}
          </View>
          {toast.action ? (
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={toast.action.label}
              hitSlop={8}
              onPress={() => {
                toast.action?.onPress();
                onDismiss();
              }}
              style={({ pressed }) => [
                styles.action,
                {
                  borderRadius: radius.pill,
                  backgroundColor: pressed ? colors.emberSoft : 'transparent',
                  paddingHorizontal: space[3],
                },
              ]}
            >
              <Text
                style={{
                  color: colors.ember,
                  fontSize: font.size.sm,
                  fontWeight: font.weight.bold,
                }}
              >
                {toast.action.label}
              </Text>
            </Pressable>
          ) : null}
        </Animated.View>
      </Animated.View>
    </GestureDetector>
  );
}

const styles = StyleSheet.create({
  host: { position: 'absolute', left: 0, right: 0 },
  toast: {
    position: 'absolute',
    borderWidth: StyleSheet.hairlineWidth,
    overflow: 'hidden',
  },
  content: { flexDirection: 'row', alignItems: 'center' },
  anchorTop: { top: 0 },
  anchorBottom: { bottom: 0 },
  dot: { width: 10, height: 10, borderRadius: 5 },
  texts: { flex: 1 },
  action: { minHeight: minTouchTarget, justifyContent: 'center' },
});
