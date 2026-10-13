import { useEffect, useRef, useState } from 'react';
import { Pressable, StyleSheet, Text, View, type StyleProp, type ViewStyle } from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withTiming,
} from 'react-native-reanimated';

import { useHaptic } from '../../shared/hooks/use-haptic';
import { useReduceMotion } from '../../shared/hooks/use-reduce-motion';
import { spring, timing } from '../../shared/motion/motion';
import { useKinetikTheme } from '../../shared/tokens/theme';

export type TreeNode = {
  id: string;
  label: string;
  /** A short note on the right, e.g. a size or a count. */
  detail?: string;
  children?: readonly TreeNode[];
};

export type TreeViewProps = {
  data: readonly TreeNode[];
  /** Branches open at first. */
  defaultExpanded?: readonly string[];
  /** The highlighted node. */
  selected?: string;
  /** Called for a press on any node; branches also open or close. */
  onSelect?: (node: TreeNode) => void;
  /** A tick when a branch opens or closes. Defaults to true. */
  haptics?: boolean;
  testID?: string;
  style?: StyleProp<ViewStyle>;
};

const ROW = 44;
const INDENT = 20;

/**
 * Nested folders and items. A branch opens by growing to its measured height
 * while its rows drift in, the chevron turns a quarter, and a thin guide line
 * marks each level. Children are only built the first time a branch opens.
 */
export function TreeView({
  data,
  defaultExpanded = [],
  selected,
  onSelect,
  haptics = true,
  testID,
  style,
}: TreeViewProps) {
  const reduced = useReduceMotion();
  const haptic = useHaptic(haptics);
  const [open, setOpen] = useState<ReadonlySet<string>>(() => new Set(defaultExpanded));

  const toggle = (node: TreeNode) => {
    if (node.children?.length) {
      haptic('tick');
      setOpen((prev) => {
        const next = new Set(prev);
        if (next.has(node.id)) next.delete(node.id);
        else next.add(node.id);
        return next;
      });
    }
    onSelect?.(node);
  };

  return (
    <View testID={testID} style={style}>
      {data.map((node) => (
        <Branch
          key={node.id}
          node={node}
          depth={0}
          open={open}
          selected={selected}
          reduced={reduced}
          onPress={toggle}
        />
      ))}
    </View>
  );
}

type BranchProps = {
  node: TreeNode;
  depth: number;
  open: ReadonlySet<string>;
  selected: string | undefined;
  reduced: boolean;
  onPress: (node: TreeNode) => void;
};

function Branch({ node, depth, open, selected, reduced, onPress }: BranchProps) {
  const { colors, font, radius } = useKinetikTheme();
  const kids = node.children ?? [];
  const parent = kids.length > 0;
  const expanded = parent && open.has(node.id);
  // Children are built the first time the branch opens, then kept for closing.
  const [built, setBuilt] = useState(expanded);
  if (expanded && !built) setBuilt(true);
  const [measured, setMeasured] = useState(0);

  const turn = useSharedValue(expanded ? 1 : 0);
  const height = useSharedValue(0);
  // The first known height is applied at once; later changes spring.
  const placed = useRef(false);
  useEffect(() => {
    turn.set(withSpring(expanded ? 1 : 0, spring('snappy', reduced)));
  }, [expanded, reduced, turn]);
  useEffect(() => {
    if (measured === 0) return;
    const target = expanded ? measured : 0;
    height.set(!placed.current || reduced ? target : withSpring(target, spring('smooth')));
    placed.current = true;
  }, [expanded, measured, reduced, height]);

  const box = useAnimatedStyle(() => ({ height: height.get() }));
  const fade = useAnimatedStyle(() => ({
    opacity: withTiming(expanded ? 1 : 0, timing('quick', reduced)),
    transform: [{ translateY: withSpring(expanded ? 0 : -6, spring('smooth', reduced)) }],
  }));
  const chevron = useAnimatedStyle(() => ({ transform: [{ rotate: `${turn.get() * 90}deg` }] }));
  const isSelected = selected === node.id;

  return (
    <View>
      <Pressable
        onPress={() => onPress(node)}
        accessibilityRole="button"
        accessibilityLabel={[node.label, node.detail].filter(Boolean).join(', ')}
        accessibilityState={{
          expanded: parent ? expanded : undefined,
          selected: isSelected,
        }}
        style={({ pressed }) => [
          styles.row,
          {
            paddingLeft: 8 + depth * INDENT,
            borderRadius: radius.sm,
            backgroundColor: isSelected
              ? colors.azureSoft
              : pressed
                ? colors.surfaceSunken
                : undefined,
          },
        ]}
      >
        <View style={styles.glyph}>
          {parent ? (
            <Animated.View style={[styles.chevron, chevron]}>
              <View style={[styles.stroke, styles.up, { backgroundColor: colors.textMuted }]} />
              <View style={[styles.stroke, styles.down, { backgroundColor: colors.textMuted }]} />
            </Animated.View>
          ) : (
            <View style={[styles.leaf, { backgroundColor: colors.textSubtle }]} />
          )}
        </View>
        <Text
          numberOfLines={1}
          style={[
            styles.label,
            {
              color: isSelected ? colors.azure : colors.text,
              fontSize: font.size.md,
              fontWeight: parent ? font.weight.medium : font.weight.regular,
            },
          ]}
        >
          {node.label}
        </Text>
        {node.detail ? (
          <Text
            style={{
              color: colors.textSubtle,
              fontSize: font.size.xs,
              fontVariant: ['tabular-nums'],
            }}
          >
            {node.detail}
          </Text>
        ) : null}
      </Pressable>
      {parent && built ? (
        <Animated.View
          style={[styles.box, box]}
          accessibilityElementsHidden={!expanded}
          importantForAccessibility={expanded ? 'auto' : 'no-hide-descendants'}
        >
          {/* Laid out on its own, so a closed (zero-height) box never squeezes it before it is measured. */}
          <Animated.View
            style={[styles.content, fade]}
            onLayout={(e) => {
              const h = Math.round(e.nativeEvent.layout.height);
              if (h !== measured) setMeasured(h);
            }}
          >
            <View
              pointerEvents="none"
              style={[
                styles.guide,
                { left: 8 + depth * INDENT + 9, backgroundColor: colors.border },
              ]}
            />
            {kids.map((child) => (
              <Branch
                key={child.id}
                node={child}
                depth={depth + 1}
                open={open}
                selected={selected}
                reduced={reduced}
                onPress={onPress}
              />
            ))}
          </Animated.View>
        </Animated.View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  row: { height: ROW, flexDirection: 'row', alignItems: 'center', gap: 8, paddingRight: 12 },
  glyph: { width: 18, height: 18, alignItems: 'center', justifyContent: 'center' },
  chevron: { width: 14, height: 14 },
  stroke: { position: 'absolute', width: 7, height: 1.8, borderRadius: 1, left: 4.5 },
  up: { top: 4.6, transform: [{ rotate: '45deg' }] },
  down: { top: 8.6, transform: [{ rotate: '-45deg' }] },
  leaf: { width: 5, height: 5, borderRadius: 2.5 },
  label: { flex: 1 },
  box: { overflow: 'hidden' },
  content: { position: 'absolute', top: 0, left: 0, right: 0 },
  guide: { position: 'absolute', top: 4, bottom: 4, width: StyleSheet.hairlineWidth * 2 },
});
