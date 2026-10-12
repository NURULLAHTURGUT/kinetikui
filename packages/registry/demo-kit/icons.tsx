import { View } from 'react-native';
import Svg, { Path } from 'react-native-svg';

/**
 * Icons for the demos, from Tabler Icons (MIT, https://tabler.io/icons):
 * 24 pt outline paths drawn with react-native-svg, so they render the same on
 * a phone and on the docs site. Demos are documentation; components never
 * depend on this file. Use your app's own icon set.
 */
const paths = {
  home: [
    'M5 12l-2 0l9 -9l9 9l-2 0',
    'M5 12v7a2 2 0 0 0 2 2h10a2 2 0 0 0 2 -2v-7',
    'M9 21v-6a2 2 0 0 1 2 -2h2a2 2 0 0 1 2 2v6',
  ],
  search: ['M3 10a7 7 0 1 0 14 0a7 7 0 1 0 -14 0', 'M21 21l-6 -6'],
  create: [
    'M12 3c7.2 0 9 1.8 9 9c0 7.2 -1.8 9 -9 9c-7.2 0 -9 -1.8 -9 -9c0 -7.2 1.8 -9 9 -9',
    'M15 12h-6',
    'M12 9v6',
  ],
  inbox: [
    'M4 6a2 2 0 0 1 2 -2h12a2 2 0 0 1 2 2v12a2 2 0 0 1 -2 2h-12a2 2 0 0 1 -2 -2l0 -12',
    'M4 13h3l3 3h4l3 -3h3',
  ],
  user: ['M8 7a4 4 0 1 0 8 0a4 4 0 0 0 -8 0', 'M6 21v-2a4 4 0 0 1 4 -4h4a4 4 0 0 1 4 4v2'],
  volumeHigh: [
    'M15 8a5 5 0 0 1 0 8',
    'M17.7 5a9 9 0 0 1 0 14',
    'M6 15h-2a1 1 0 0 1 -1 -1v-4a1 1 0 0 1 1 -1h2l3.5 -4.5a.8 .8 0 0 1 1.5 .5v14a.8 .8 0 0 1 -1.5 .5l-3.5 -4.5',
  ],
  volumeLow: [
    'M15 8a5 5 0 0 1 0 8',
    'M6 15h-2a1 1 0 0 1 -1 -1v-4a1 1 0 0 1 1 -1h2l3.5 -4.5a.8 .8 0 0 1 1.5 .5v14a.8 .8 0 0 1 -1.5 .5l-3.5 -4.5',
  ],
  sunLow: [
    'M8 12a4 4 0 1 0 8 0a4 4 0 1 0 -8 0',
    'M4 12h.01',
    'M12 4v.01',
    'M20 12h.01',
    'M12 20v.01',
    'M6.31 6.31l-.01 -.01',
    'M17.71 6.31l-.01 -.01',
    'M17.7 17.7l.01 .01',
    'M6.3 17.7l.01 .01',
  ],
  sunHigh: [
    'M14.828 14.828a4 4 0 1 0 -5.656 -5.656a4 4 0 0 0 5.656 5.656',
    'M6.343 17.657l-1.414 1.414',
    'M6.343 6.343l-1.414 -1.414',
    'M17.657 6.343l1.414 -1.414',
    'M17.657 17.657l1.414 1.414',
    'M4 12h-2',
    'M12 4v-2',
    'M20 12h2',
    'M12 20v2',
  ],
  close: ['M18 6l-12 12', 'M6 6l12 12'],
  heart: ['M19.5 12.572l-7.5 7.428l-7.5 -7.428a5 5 0 1 1 7.5 -6.566a5 5 0 1 1 7.5 6.572'],
  userPlus: [
    'M8 7a4 4 0 1 0 8 0a4 4 0 0 0 -8 0',
    'M16 19h6',
    'M19 16v6',
    'M6 21v-2a4 4 0 0 1 4 -4h4',
  ],
  clock: ['M3 12a9 9 0 1 0 18 0a9 9 0 0 0 -18 0', 'M12 7v5l3 3'],
  message: [
    'M3 20l1.3 -3.9c-2.324 -3.437 -1.426 -7.872 2.1 -10.374c3.526 -2.501 8.59 -2.296 11.845 .48c3.255 2.777 3.695 7.266 1.029 10.501c-2.666 3.235 -7.615 4.215 -11.574 2.293l-4.7 1',
  ],
  link: [
    'M9 15l6 -6',
    'M11 6l.463 -.536a5 5 0 0 1 7.071 7.072l-.534 .464',
    'M13 18l-.397 .534a5.068 5.068 0 0 1 -7.127 0a4.972 4.972 0 0 1 0 -7.071l.524 -.463',
  ],
  savePhoto: [
    'M15 8h.01',
    'M12.5 21h-6.5a3 3 0 0 1 -3 -3v-12a3 3 0 0 1 3 -3h12a3 3 0 0 1 3 3v6.5',
    'M3 16l5 -5c.928 -.893 2.072 -.893 3 0l4 4',
    'M14 14l1 -1c.653 -.629 1.413 -.815 2.13 -.559',
    'M19 16v6',
    'M22 19l-3 3l-3 -3',
  ],
  print: [
    'M17 17h2a2 2 0 0 0 2 -2v-4a2 2 0 0 0 -2 -2h-14a2 2 0 0 0 -2 2v4a2 2 0 0 0 2 2h2',
    'M17 9v-4a2 2 0 0 0 -2 -2h-6a2 2 0 0 0 -2 2v4',
    'M7 15a2 2 0 0 1 2 -2h6a2 2 0 0 1 2 2v4a2 2 0 0 1 -2 2h-6a2 2 0 0 1 -2 -2l0 -4',
  ],
  addCircle: ['M3 12a9 9 0 1 0 18 0a9 9 0 0 0 -18 0', 'M9 12h6', 'M12 9v6'],
  arrowRight: ['M5 12l14 0', 'M13 18l6 -6', 'M13 6l6 6'],
  wifi: [
    'M12 18l.01 0',
    'M9.172 15.172a4 4 0 0 1 5.656 0',
    'M6.343 12.343a8 8 0 0 1 11.314 0',
    'M3.515 9.515c4.686 -4.687 12.284 -4.687 17 0',
  ],
  textSize: ['M3 7v-2h13v2', 'M10 5v14', 'M12 19h-4', 'M15 13v-1h6v1', 'M18 12v7', 'M17 19h2'],
  trash: [
    'M4 7l16 0',
    'M10 11l0 6',
    'M14 11l0 6',
    'M5 7l1 12a2 2 0 0 0 2 2h8a2 2 0 0 0 2 -2l1 -12',
    'M9 7v-3a1 1 0 0 1 1 -1h4a1 1 0 0 1 1 1v3',
  ],
  send: [
    'M10 14l11 -11',
    'M21 3l-6.5 18a.55 .55 0 0 1 -1 0l-3.5 -7l-7 -3.5a.55 .55 0 0 1 0 -1l18 -6.5',
  ],
  sparkles: [
    'M16 18a2 2 0 0 1 2 2a2 2 0 0 1 2 -2a2 2 0 0 1 -2 -2a2 2 0 0 1 -2 2m0 -12a2 2 0 0 1 2 2a2 2 0 0 1 2 -2a2 2 0 0 1 -2 -2a2 2 0 0 1 -2 2m-7 12a6 6 0 0 1 6 -6a6 6 0 0 1 -6 -6a6 6 0 0 1 -6 6a6 6 0 0 1 6 6',
  ],
  camera: [
    'M5 7h1a2 2 0 0 0 2 -2a1 1 0 0 1 1 -1h6a1 1 0 0 1 1 1a2 2 0 0 0 2 2h1a2 2 0 0 1 2 2v9a2 2 0 0 1 -2 2h-14a2 2 0 0 1 -2 -2v-9a2 2 0 0 1 2 -2',
    'M9 13a3 3 0 1 0 6 0a3 3 0 0 0 -6 0',
  ],
  pencil: ['M4 20h4l10.5 -10.5a2.828 2.828 0 1 0 -4 -4l-10.5 10.5v4', 'M13.5 6.5l4 4'],
  microphone: [
    'M9 2m0 3a3 3 0 0 1 3 -3h0a3 3 0 0 1 3 3v5a3 3 0 0 1 -3 3h0a3 3 0 0 1 -3 -3z',
    'M5 10a7 7 0 0 0 14 0',
    'M8 21l8 0',
    'M12 17l0 4',
  ],
  scan: [
    'M4 7v-1a2 2 0 0 1 2 -2h2',
    'M4 17v1a2 2 0 0 0 2 2h2',
    'M16 4h2a2 2 0 0 1 2 2v1',
    'M16 20h2a2 2 0 0 0 2 -2v-1',
    'M5 12l14 0',
  ],
  bookmark: ['M18 7v14l-6 -4l-6 4v-14a4 4 0 0 1 4 -4h4a4 4 0 0 1 4 4z'],
  share: [
    'M6 12m-3 0a3 3 0 1 0 6 0a3 3 0 1 0 -6 0',
    'M18 6m-3 0a3 3 0 1 0 6 0a3 3 0 1 0 -6 0',
    'M18 18m-3 0a3 3 0 1 0 6 0a3 3 0 1 0 -6 0',
    'M8.7 10.7l6.6 -3.4',
    'M8.7 13.3l6.6 3.4',
  ],
  bolt: ['M13 3l0 7l6 0l-8 11l0 -7l-6 0l8 -11'],
  calendar: [
    'M4 7a2 2 0 0 1 2 -2h12a2 2 0 0 1 2 2v12a2 2 0 0 1 -2 2h-12a2 2 0 0 1 -2 -2v-12z',
    'M16 3v4',
    'M8 3v4',
    'M4 11h16',
  ],
  mapPin: [
    'M9 11a3 3 0 1 0 6 0a3 3 0 0 0 -6 0',
    'M17.657 16.657l-4.243 4.243a2 2 0 0 1 -2.827 0l-4.244 -4.243a8 8 0 1 1 11.314 0z',
  ],
  photo: [
    'M15 8h.01',
    'M3 6a3 3 0 0 1 3 -3h12a3 3 0 0 1 3 3v12a3 3 0 0 1 -3 3h-12a3 3 0 0 1 -3 -3v-12z',
    'M3 16l5 -5c.928 -.893 2.072 -.893 3 0l5 5',
    'M14 14l1 -1c.928 -.893 2.072 -.893 3 0l3 3',
  ],
  note: [
    'M13 20l7 -7',
    'M13 20v-6a1 1 0 0 1 1 -1h6v-7a2 2 0 0 0 -2 -2h-12a2 2 0 0 0 -2 2v12a2 2 0 0 0 2 2h7',
  ],
  compass: ['M8 16l2 -6l6 -2l-2 6l-6 2', 'M12 12m-9 0a9 9 0 1 0 18 0a9 9 0 1 0 -18 0'],
} satisfies Record<string, string[]>;

export type DemoIconName = keyof typeof paths;

export function DemoIcon({
  name,
  color,
  size = 22,
  strokeWidth = 1.75,
}: {
  name: DemoIconName;
  color: string;
  size?: number;
  strokeWidth?: number;
}) {
  return (
    // Decorative: the control that holds the icon carries the label.
    <View aria-hidden pointerEvents="none">
      <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
        {paths[name].map((d) => (
          <Path
            key={d}
            d={d}
            stroke={color}
            strokeWidth={strokeWidth}
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        ))}
      </Svg>
    </View>
  );
}
