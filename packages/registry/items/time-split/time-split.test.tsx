import { fireEvent, render, screen } from '@testing-library/react-native';

import { KinetikProvider } from '../../shared/tokens/theme';
import { rimSegments, TimeSplit } from './time-split';

const ITEMS = [
  { label: 'Coding', minutes: 150 },
  { label: 'Reading', minutes: 61 },
  { label: 'Music', minutes: 65 },
];

const card = (items = ITEMS) => (
  <KinetikProvider reduceMotion="always">
    <TimeSplit title="Studio Hours" items={items} />
  </KinetikProvider>
);

describe('rimSegments', () => {
  it('splits the rim by share and leaves gaps', () => {
    const [a, b] = rimSegments([1, 1], 100);
    expect(a![0]).toBeCloseTo(0.035);
    expect(a![1]).toBeCloseTo(0.465);
    expect(b![0]).toBeCloseTo(0.535);
    expect(b![1]).toBeCloseTo(0.965);
  });

  it('survives zeros and negative numbers', () => {
    const [a, b] = rimSegments([0, -5], 100);
    expect(a![1]).toBeGreaterThanOrEqual(a![0]);
    expect(b![1]).toBeGreaterThanOrEqual(b![0]);
  });
});

describe('TimeSplit', () => {
  it('shows the total and reads every item', async () => {
    await render(card());
    expect(
      screen.getByLabelText(
        'Studio Hours: 4 hours 36 minutes. Coding 2 hours 30 minutes, Reading 1 hour 1 minute, Music 1 hour 5 minutes.',
      ),
    ).toBeOnTheScreen();
    for (const text of ['04', '36', 'Hours', 'Minutes', 'Coding', 'Music']) {
      expect(screen.getByText(text, { includeHiddenElements: true })).toBeOnTheScreen();
    }
  });

  it('draws its rim once measured and takes new numbers', async () => {
    const view = await render(card());
    await fireEvent(screen.getByLabelText(/^Studio Hours/), 'layout', {
      nativeEvent: { layout: { width: 320, height: 300 } },
    });
    await view.rerender(card([{ label: 'Coding', minutes: 45 }]));
    expect(screen.getByText('45', { includeHiddenElements: true })).toBeOnTheScreen();
  });
});
