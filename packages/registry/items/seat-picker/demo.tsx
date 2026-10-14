import { useState } from 'react';
import { View } from 'react-native';

import { defineControls, type ControlValues } from '../../demo-kit/types';
import { SeatPicker } from './seat-picker';

export const controls = defineControls({
  haptics: { type: 'boolean', label: 'Haptics', default: true },
});

export default function SeatPickerDemo({ haptics }: ControlValues<typeof controls>) {
  const [seats, setSeats] = useState(1);
  return (
    <View style={{ width: '100%', maxWidth: 380, alignSelf: 'center' }}>
      <SeatPicker
        value={seats}
        onChange={setSeats}
        max={5}
        caption="Add seats now and upgrade later if you need more."
        action={{ label: 'Upgrade', onPress: () => setSeats(5) }}
        onInfo={() => {}}
        haptics={haptics}
      />
    </View>
  );
}
