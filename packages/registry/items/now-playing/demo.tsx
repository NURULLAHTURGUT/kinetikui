import { View } from 'react-native';

import { photo } from '../../demo-kit/photos';
import { defineControls } from '../../demo-kit/types';
import { NowPlaying } from './now-playing';

export const controls = defineControls({});

// Made-up pieces over landscape photos.
const TRACKS = [
  {
    id: 'a',
    title: 'Nocturne',
    subtitle: 'Sonata No. 2 in D minor',
    cover: photo('lastLight'),
    duration: 223,
  },
  {
    id: 'b',
    title: 'Tidewater',
    subtitle: 'Études for Strings, II',
    cover: photo('stillWater'),
    duration: 187,
  },
  {
    id: 'c',
    title: 'Highland',
    subtitle: 'Suite in G major',
    cover: photo('highlandLake'),
    duration: 251,
  },
];

export default function NowPlayingDemo() {
  return (
    <View style={{ width: '100%', maxWidth: 460, alignSelf: 'center' }}>
      <NowPlaying tracks={TRACKS} />
    </View>
  );
}
