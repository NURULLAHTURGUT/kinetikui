import { render, screen } from '@testing-library/react-native';

import { KinetikProvider } from '../../shared/tokens/theme';
import { OrbitRadar, craftAngle } from './orbit-radar';

const card = (
  <KinetikProvider reduceMotion="always">
    <OrbitRadar name="LUNA-2" minutes={23} progress={0.58} />
  </KinetikProvider>
);

describe('OrbitRadar', () => {
  it('reads as one label', async () => {
    await render(card);
    expect(screen.getByLabelText('LUNA-2. ARRIVES in 23 minutes')).toBeOnTheScreen();
  });
});

describe('craftAngle', () => {
  it('climbs to the top and clamps', () => {
    expect(craftAngle(1)).toBe(0);
    expect(craftAngle(0)).toBe(-82);
    expect(craftAngle(5)).toBe(0);
  });
});
