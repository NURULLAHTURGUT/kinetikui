import { useState } from 'react';
import { Image, StyleSheet, Text, View } from 'react-native';

import { DemoIcon } from '../../demo-kit/icons';
import { photo } from '../../demo-kit/photos';
import { defineControls, type ControlValues } from '../../demo-kit/types';
import { useKinetikTheme } from '../../shared/tokens/theme';
import { FoldPanel } from './fold-panel';

export const controls = defineControls({
  single: { type: 'boolean', label: 'One at a time', default: true },
});

type Key = 'checkin' | 'route' | 'rules';

export default function FoldPanelDemo({ single }: ControlValues<typeof controls>) {
  const { colors, font, space, radius } = useKinetikTheme();
  const [open, setOpen] = useState<Set<Key>>(() => new Set(['route']));

  const bind = (key: Key) => ({
    open: open.has(key),
    onOpenChange: (next: boolean) =>
      setOpen((current) => {
        const out = new Set(single ? [] : current);
        if (next) out.add(key);
        else out.delete(key);
        return out;
      }),
  });
  const body = { color: colors.textMuted, fontSize: font.size.sm, lineHeight: 21 };

  return (
    <View style={{ gap: space[2] }}>
      <FoldPanel
        title="Check-in"
        subtitle="Friday from 3 pm"
        leading={<DemoIcon name="calendar" color={colors.azure} size={20} />}
        {...bind('checkin')}
      >
        <Text style={body}>
          Self check-in with a lockbox by the door. The code arrives the evening before. Check-out
          is at 11 am on Sunday.
        </Text>
      </FoldPanel>
      <FoldPanel
        title="Getting there"
        subtitle="40 minutes from the station"
        leading={<DemoIcon name="mapPin" color={colors.azure} size={20} />}
        {...bind('route')}
      >
        <View style={{ gap: space[3] }}>
          <Image
            source={photo('snowRidge')}
            style={[styles.picture, { borderRadius: radius.md }]}
            accessibilityLabel="The road up the ridge in winter"
          />
          <Text style={body}>
            The last kilometre is a gravel road. In winter, chains are needed after the bridge.
          </Text>
        </View>
      </FoldPanel>
      <FoldPanel
        title="House rules"
        subtitle="Quiet hours, pets, parking"
        leading={<DemoIcon name="bolt" color={colors.azure} size={20} />}
        {...bind('rules')}
      >
        <Text style={body}>
          Quiet hours from 10 pm. One small pet is welcome. Two cars fit in the drive.
        </Text>
      </FoldPanel>
    </View>
  );
}

const styles = StyleSheet.create({
  picture: { width: '100%', aspectRatio: 2.2 },
});
