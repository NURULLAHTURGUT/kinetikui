import { useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { DemoIcon, type DemoIconName } from '../../demo-kit/icons';
import { defineControls } from '../../demo-kit/types';
import { PressJelly } from '../../items/press-jelly/press-jelly';
import { useKinetikTheme } from '../../shared/tokens/theme';
import { Profile } from './profile';

export const controls = defineControls({});

export default function ProfileDemo() {
  const { colors, font, space } = useKinetikTheme();
  const [run, setRun] = useState(0);
  const [note, setNote] = useState<string | null>(null);
  const [notifications, setNotifications] = useState(true);
  const [digest, setDigest] = useState(false);

  const icon = (name: DemoIconName) => <DemoIcon name={name} color={colors.text} size={18} />;
  const open = (label: string) => () => setNote(label);

  if (note) {
    return (
      <View style={[styles.center, { backgroundColor: colors.background, gap: space[4] }]}>
        <Text style={{ color: colors.textMuted, fontSize: font.size.md }}>{note}</Text>
        <PressJelly
          variant="surface"
          onPress={() => {
            setNote(null);
            setRun((r) => r + 1);
          }}
        >
          Back to profile
        </PressJelly>
      </View>
    );
  }
  return (
    <Profile
      key={run}
      user={{ name: 'Ada Lovelace', handle: '@ada' }}
      stats={[
        { label: 'Posts', value: 128 },
        { label: 'Followers', value: 24817 },
        { label: 'Following', value: 312 },
      ]}
      plan={{ title: 'Kinetik Pro', detail: 'Renews on 3 March', onPress: open('Manage plan') }}
      onEdit={open('Edit profile')}
      onSignOut={open('Signed out')}
      sections={[
        {
          title: 'Account',
          rows: [
            {
              key: 'info',
              label: 'Personal info',
              icon: icon('user'),
              onPress: open('Personal info'),
            },
            {
              key: 'payment',
              label: 'Payment methods',
              icon: icon('card'),
              detail: 'Visa •• 42',
              onPress: open('Payment methods'),
            },
            {
              key: 'security',
              label: 'Password and security',
              icon: icon('lock'),
              onPress: open('Security'),
            },
          ],
        },
        {
          title: 'Preferences',
          rows: [
            {
              key: 'notifications',
              label: 'Notifications',
              icon: icon('bell'),
              toggle: { value: notifications, onValueChange: setNotifications },
            },
            {
              key: 'digest',
              label: 'Weekly email',
              icon: icon('mail'),
              toggle: { value: digest, onValueChange: setDigest },
            },
            {
              key: 'appearance',
              label: 'Appearance',
              icon: icon('sunHigh'),
              detail: 'System',
              onPress: open('Appearance'),
            },
          ],
        },
        {
          title: 'Support',
          rows: [
            { key: 'help', label: 'Help center', icon: icon('help'), onPress: open('Help center') },
          ],
        },
      ]}
    />
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
});
