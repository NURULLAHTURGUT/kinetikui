import { fireEvent, render, screen } from '@testing-library/react-native';

import { KinetikProvider } from '../../shared/tokens/theme';
import { StepsBar, compactCount } from './steps-bar';

const card = (
  <KinetikProvider reduceMotion="always">
    <StepsBar steps={6317} distance="4.2 KM" climb="9 FLOORS" />
  </KinetikProvider>
);

describe('StepsBar', () => {
  it('reads as one label', async () => {
    await render(card);
    expect(screen.getByLabelText('6,317 STEPS, 4.2 KM, 9 FLOORS')).toBeOnTheScreen();
  });

  it('draws once measured', async () => {
    await render(card);
    await fireEvent(
      screen.getByTestId('steps-bar-track', { includeHiddenElements: true }),
      'layout',
      {
        nativeEvent: { layout: { width: 280, height: 100 } },
      },
    );
    expect(screen.getByLabelText('6,317 STEPS, 4.2 KM, 9 FLOORS')).toBeOnTheScreen();
  });
});

describe('compactCount', () => {
  it('shortens thousands', () => {
    expect(compactCount(0)).toBe('0');
    expect(compactCount(5000)).toBe('5K');
    expect(compactCount(2500)).toBe('2.5K');
  });
});
