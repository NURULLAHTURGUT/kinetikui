import { fireEvent, render, screen } from '@testing-library/react-native';

import { KinetikProvider } from '../../shared/tokens/theme';
import { OrderStages, knobOffset } from './order-stages';

const card = (
  <KinetikProvider reduceMotion="always">
    <OrderStages
      stages={[
        { label: 'COOKING', icon: 'cook' },
        { label: 'PACKING', icon: 'pack' },
        { label: 'ON THE WAY', icon: 'ride' },
        { label: 'DELIVERED', icon: 'check' },
      ]}
      current={0}
      minutesLeft={21}
      order="Nº 27"
    />
  </KinetikProvider>
);

describe('OrderStages', () => {
  it('reads as one label', async () => {
    await render(card);
    expect(screen.getByLabelText('21 minutes left. COOKING. Nº 27')).toBeOnTheScreen();
  });

  it('draws once measured', async () => {
    await render(card);
    await fireEvent(
      screen.getByTestId('order-stages-track', { includeHiddenElements: true }),
      'layout',
      {
        nativeEvent: { layout: { width: 280, height: 100 } },
      },
    );
    expect(screen.getByLabelText('21 minutes left. COOKING. Nº 27')).toBeOnTheScreen();
  });
});

describe('knobOffset', () => {
  it('leaves room for the chips still to come', () => {
    expect(knobOffset(300, 3, 2)).toBe(261);
    expect(knobOffset(300, 3, 0)).toBe(183);
  });
  it('never goes negative', () => {
    expect(knobOffset(10, 4, 0)).toBe(0);
  });
});
