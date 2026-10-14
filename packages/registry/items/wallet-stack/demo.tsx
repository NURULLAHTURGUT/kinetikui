import { useState } from 'react';
import { Text, View } from 'react-native';

import { defineControls } from '../../demo-kit/types';
import { useKinetikTheme } from '../../shared/tokens/theme';
import { WalletStack } from './wallet-stack';

export const controls = defineControls({});

export default function WalletStackDemo() {
  const { colors, font, space } = useKinetikTheme();
  const [picked, setPicked] = useState<string | null>(null);
  return (
    <View style={{ width: '100%', maxWidth: 380, alignSelf: 'center', gap: space[3] }}>
      <WalletStack
        balance={4018}
        cards={[
          { id: 'travel', name: 'Kinetik Travel', last4: '4421' },
          { id: 'everyday', name: 'Kinetik', last4: '0937' },
          { id: 'black', name: 'Kinetik Black', last4: '2048' },
        ]}
        onCardPress={(card) => setPicked(`${card.name} •••• ${card.last4}`)}
      />
      <Text style={{ color: colors.textMuted, fontSize: font.size.sm, textAlign: 'center' }}>
        {picked ?? 'Tap the wallet to fan out the cards'}
      </Text>
    </View>
  );
}
