import { useState } from 'react';
import { Text, View } from 'react-native';

import { photo } from '../../demo-kit/photos';
import { defineControls } from '../../demo-kit/types';
import { useKinetikTheme } from '../../shared/tokens/theme';
import { VinylPlayer } from './vinyl-player';

export const controls = defineControls({});

// Made-up songs over landscape photos.
const TRACKS = [
  {
    id: 'a',
    title: 'Blue Hour',
    artist: 'The Paper Lanterns',
    cover: photo('blueHour'),
    duration: 214,
  },
  {
    id: 'b',
    title: 'Pastel Tide',
    artist: 'Mara Ellis',
    cover: photo('pastelTide'),
    duration: 192,
  },
  { id: 'c', title: 'Night Peak', artist: 'Northbound', cover: photo('nightPeak'), duration: 238 },
];

export default function VinylPlayerDemo() {
  const { colors, font, space } = useKinetikTheme();
  const [muted, setMuted] = useState(false);
  return (
    <View style={{ width: '100%', maxWidth: 440, alignSelf: 'center', gap: space[3] }}>
      <VinylPlayer tracks={TRACKS} onMutedChange={setMuted} />
      <Text style={{ color: colors.textSubtle, fontSize: font.size.sm, textAlign: 'center' }}>
        {muted ? 'Muted' : 'Press play to spin the record'}
      </Text>
    </View>
  );
}
