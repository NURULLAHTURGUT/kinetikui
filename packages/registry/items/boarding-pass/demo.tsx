import { useState } from 'react';
import { Text, View } from 'react-native';

import { defineControls } from '../../demo-kit/types';
import { useKinetikTheme } from '../../shared/tokens/theme';
import { BoardingPass } from './boarding-pass';

export const controls = defineControls({});

export default function BoardingPassDemo() {
  const { colors, font, space } = useKinetikTheme();
  // A new key prints a fresh pass after it has been scanned.
  const [round, setRound] = useState(0);
  const [boarded, setBoarded] = useState(false);
  return (
    <View style={{ width: '100%', maxWidth: 320, alignSelf: 'center', gap: space[3] }}>
      <BoardingPass
        key={round}
        airline="Northwind"
        flight="KN 1321"
        cabin="Premium"
        booking="AG7890"
        from={{ code: 'CDG', city: 'Paris', time: '14:30' }}
        to={{ code: 'JFK', city: 'New York', time: '17:45' }}
        duration="8h 15m"
        passenger="Olivia Bennett"
        details={[
          { label: 'Boarding', value: '14:00' },
          { label: 'Terminal', value: '2A' },
          { label: 'Gate', value: 'B12' },
          { label: 'Seat', value: '12A' },
        ]}
        onScan={() => setBoarded(true)}
      />
      <Text
        onPress={() => {
          setBoarded(false);
          setRound((r) => r + 1);
        }}
        style={{
          color: colors.textSubtle,
          fontSize: font.size.sm,
          textAlign: 'center',
          paddingVertical: space[3],
        }}
      >
        {boarded ? 'Tap here for a new pass' : 'Tap the barcode to board'}
      </Text>
    </View>
  );
}
