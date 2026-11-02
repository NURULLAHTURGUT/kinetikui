import { fireEvent, render, screen } from '@testing-library/react-native';

import { KinetikProvider } from '../../shared/tokens/theme';
import { MonthBars, monthDelta } from './month-bars';

const card = (
  <KinetikProvider reduceMotion="always">
    <MonthBars
      months={[
        { label: 'MAY', value: 1840.5 },
        { label: 'JUN', value: 2410.2 },
        { label: 'JUL', value: 1975.75 },
        { label: 'AUG', value: 2120 },
        { label: 'SEP', value: 2187.19 },
        { label: 'OCT', value: 2316.3 },
      ]}
    />
  </KinetikProvider>
);

describe('MonthBars', () => {
  it('reads as one label', async () => {
    await render(card);
    expect(screen.getByLabelText('OCT: $2,316.30, +129.11')).toBeOnTheScreen();
  });
});

describe('monthDelta', () => {
  const months = [
    { label: 'MAY', value: 1840.5 },
    { label: 'JUN', value: 2410.2 },
    { label: 'JUL', value: 1975.75 },
    { label: 'AUG', value: 2120 },
    { label: 'SEP', value: 2187.19 },
    { label: 'OCT', value: 2316.3 },
  ];
  it('compares with the month before', () => {
    expect(monthDelta(months, 5)).toEqual({ sign: '+', amount: '129.11' });
    expect(monthDelta(months, 2).sign).toBe('\u2212');
    expect(monthDelta(months, 0)).toEqual({ sign: '+', amount: '0.00' });
  });
});

describe('picking a month', () => {
  it('moves the figure and calls back', async () => {
    const onSelect = jest.fn();
    await render(
      <KinetikProvider reduceMotion="always">
        <MonthBars
          months={[
            { label: 'MAY', value: 1840.5 },
            { label: 'JUN', value: 2410.2 },
            { label: 'JUL', value: 1975.75 },
            { label: 'AUG', value: 2120 },
            { label: 'SEP', value: 2187.19 },
            { label: 'OCT', value: 2316.3 },
          ]}
          onSelect={onSelect}
        />
      </KinetikProvider>,
    );
    await fireEvent.press(screen.getByRole('button', { name: 'JUN, 2410.2' }));
    expect(onSelect).toHaveBeenCalledWith(1);
    expect(screen.getByRole('button', { name: 'JUN, 2410.2' })).toBeSelected();
    expect(screen.getByLabelText('JUN: $2,410.20, +569.70')).toBeOnTheScreen();
  });
});
