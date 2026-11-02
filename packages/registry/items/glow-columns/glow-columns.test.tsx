import { render, screen } from '@testing-library/react-native';

import { KinetikProvider } from '../../shared/tokens/theme';
import { GlowColumns, levelColor } from './glow-columns';

const card = (
  <KinetikProvider reduceMotion="always">
    <GlowColumns
      values={[0, 0, 1, 2, 4, 6, 7, 8, 8, 7, 5, 3, 2, 1, 1, 0, 0, 0]}
      current={5}
      max={10}
      level="MODERATE"
      name="UVI"
      labels={['12', '14', '16', '18', '20', '22']}
    />
  </KinetikProvider>
);

describe('GlowColumns', () => {
  it('reads as one label', async () => {
    await render(card);
    expect(screen.getByLabelText('UVI 6, MODERATE')).toBeOnTheScreen();
  });
});

describe('levelColor', () => {
  it('moves from low to high', () => {
    expect(levelColor(0.1)).toContain('138');
    expect(levelColor(0.5)).toContain('52');
    expect(levelColor(0.9)).toContain('28');
  });
});
