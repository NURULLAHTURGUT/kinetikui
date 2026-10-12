import Svg, { Path } from 'react-native-svg';

const paths = {
  chevronRight: 'M9.5 6l6 6-6 6',
  chevronLeft: 'M14.5 6l-6 6 6 6',
  search: 'M10.5 4a6.5 6.5 0 1 0 0 13a6.5 6.5 0 1 0 0-13z M20 20l-4.6-4.6',
  sun: 'M12 8a4 4 0 1 0 0 8a4 4 0 1 0 0-8z M12 2.5v2 M12 19.5v2 M5.3 5.3l1.4 1.4 M17.3 17.3l1.4 1.4 M2.5 12h2 M19.5 12h2 M5.3 18.7l1.4-1.4 M17.3 6.7l1.4-1.4',
  moon: 'M19.5 14.6A7.6 7.6 0 0 1 9.4 4.5a7.6 7.6 0 1 0 10.1 10.1z',
  system: 'M4 5.5h16v10H4z M9 19.5h6 M12 15.5v4',
  copy: 'M9 9h10v10H9z M15 9V5H5v10h4',
  check: 'M5 12.5l4.5 4.5L19 7',
  wave: 'M3 12c2.4-4.5 5.6-4.5 8 0s5.6 4.5 8 0',
  pause: 'M4 12h16',
  reset: 'M4.5 12a7.5 7.5 0 1 0 2.2-5.3 M4.5 4.5v4h4',
  close: 'M6.5 6.5l11 11 M17.5 6.5l-11 11',
  phone:
    'M8 2.5h8a1.5 1.5 0 0 1 1.5 1.5v16a1.5 1.5 0 0 1-1.5 1.5H8A1.5 1.5 0 0 1 6.5 20V4A1.5 1.5 0 0 1 8 2.5z M11 18h2',
  vibrate: 'M8 4h8v16H8z M4 9v6 M20 9v6',
  sliders: 'M4 7h10 M18 7h2 M4 17h4 M12 17h8 M16 5v4 M10 15v4',
} as const;

export type IconName = keyof typeof paths;

export function Icon({
  name,
  size = 20,
  color,
  strokeWidth = 1.8,
}: {
  name: IconName;
  size?: number;
  color: string;
  strokeWidth?: number;
}) {
  return (
    <Svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      accessibilityElementsHidden
      importantForAccessibility="no"
    >
      <Path
        d={paths[name]}
        stroke={color}
        strokeWidth={strokeWidth}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  );
}
