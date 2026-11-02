import { render, screen } from '@testing-library/react-native';

import { KinetikProvider } from '../../shared/tokens/theme';
import { WeekCapsules, averageMinutes } from './week-capsules';

const card = (
  <KinetikProvider reduceMotion="always">
    <WeekCapsules
      days={[
        { label: 'F', minutes: 22 },
        { label: 'S', minutes: 34 },
        { label: 'S', minutes: 18 },
        { label: 'M', minutes: 41 },
        { label: 'T', minutes: 38 },
        { label: 'W', minutes: 45 },
        { label: 'T', minutes: 19 },
      ]}
      goal={30}
    />
  </KinetikProvider>
);

describe('WeekCapsules', () => {
  it('reads as one label', async () => {
    await render(card);
    expect(screen.getByLabelText('Today 19 of 30 MIN. Average 31.')).toBeOnTheScreen();
  });
});

describe('averageMinutes', () => {
  it('rounds the mean and survives an empty week', () => {
    expect(
      averageMinutes([
        { label: 'M', minutes: 10 },
        { label: 'T', minutes: 15 },
      ]),
    ).toBe(13);
    expect(averageMinutes([])).toBe(0);
  });
});
