import { Platform, type ImageURISource } from 'react-native';

/**
 * Landscape photos from Unsplash, free to use under the Unsplash License,
 * used as demo imagery. 500 px wide JPEGs served from the docs site
 * (`/photos`), so demos stay light. Demos are documentation; components never
 * depend on this file. Photographers and links: THIRD_PARTY_NOTICES.md.
 */
export const photos = {
  stillWater: { file: 'still-water', title: 'Still Water', place: 'India', aspect: 500 / 888 },
  cloudForest: { file: 'cloud-forest', title: 'Cloud Forest', place: 'Vietnam', aspect: 500 / 333 },
  lastLight: {
    file: 'last-light',
    title: 'Last Light',
    place: 'Mountain valley',
    aspect: 500 / 333,
  },
  whiteSands: { file: 'white-sands', title: 'White Sands', place: 'New Mexico', aspect: 500 / 342 },
  morningHaze: {
    file: 'morning-haze',
    title: 'Morning Haze',
    place: 'Malang, Indonesia',
    aspect: 500 / 333,
  },
  lonePalm: { file: 'lone-palm', title: 'Lone Palm', place: 'Fiji', aspect: 500 / 667 },
  nightPeak: { file: 'night-peak', title: 'Night Peak', place: 'New Zealand', aspect: 500 / 335 },
  huacachina: { file: 'huacachina', title: 'Huacachina', place: 'Peru', aspect: 500 / 333 },
  pastelTide: { file: 'pastel-tide', title: 'Pastel Tide', place: 'Open sea', aspect: 500 / 329 },
  mistLake: { file: 'mist-lake', title: 'Mist Lake', place: 'Canada', aspect: 500 / 333 },
  highlandLake: {
    file: 'highland-lake',
    title: 'Highland Lake',
    place: 'Lakeside',
    aspect: 500 / 312,
  },
  snowRidge: { file: 'snow-ridge', title: 'Snow Ridge', place: 'Colorado', aspect: 500 / 333 },
  blueHour: { file: 'blue-hour', title: 'Blue Hour', place: 'Hills', aspect: 500 / 313 },
} as const;

export type PhotoKey = keyof typeof photos;

const ORIGIN = 'https://kinetik-ui.dev';

/** Image source for a photo: same-origin on the docs site, absolute in the app. */
export function photo(key: PhotoKey): ImageURISource {
  const path = `/photos/${photos[key].file}.jpg`;
  return { uri: Platform.OS === 'web' ? path : `${ORIGIN}${path}` };
}
