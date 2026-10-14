import { act, fireEvent, render, screen } from '@testing-library/react-native';
import type { ReactElement } from 'react';

import { Paywall } from './paywall';

const layout = { nativeEvent: { layout: { x: 0, y: 0, width: 390, height: 800 } } };

const show = async (ui: ReactElement) => {
  await render(ui);
  await fireEvent(screen.getByTestId('paywall'), 'layout', layout);
};

describe('Paywall', () => {
  it('prices each plan per month and shows the saving', async () => {
    await show(<Paywall onPurchase={jest.fn()} autoAdvance={0} />);
    expect(
      screen.getByLabelText('$2.00 per month, $23.99 billed annually, 60% off'),
    ).toBeOnTheScreen();
    expect(screen.getByLabelText('$4.99 per month, $4.99 billed monthly')).toBeOnTheScreen();
  });

  it('buys the plan whose button was pressed', async () => {
    const onPurchase = jest.fn(() => Promise.resolve());
    await show(<Paywall onPurchase={onPurchase} autoAdvance={0} />);
    await act(async () => {
      fireEvent.press(screen.getByRole('button', { name: 'Subscribe for $4.99' }));
    });
    expect(onPurchase).toHaveBeenCalledWith(expect.objectContaining({ id: 'monthly' }));
    expect(screen.getByRole('button', { name: 'You’re all set' })).toBeOnTheScreen();
  });

  it('stays put when the purchase is cancelled', async () => {
    const onPurchase = jest.fn(() => Promise.reject(new Error('cancelled')));
    await show(<Paywall onPurchase={onPurchase} autoAdvance={0} />);
    await act(async () => {
      fireEvent.press(screen.getByRole('button', { name: 'Start trial for 3 days' }));
    });
    expect(screen.getByRole('button', { name: 'Start trial for 3 days' })).toBeEnabled();
  });

  it('exposes one feature at a time and only the links it has handlers for', async () => {
    const onClose = jest.fn();
    await show(
      <Paywall onPurchase={jest.fn()} onClose={onClose} onTerms={jest.fn()} autoAdvance={0} />,
    );
    expect(screen.getByText('Widgets that move')).toBeOnTheScreen();
    expect(screen.queryByText('Every theme unlocked')).toBeNull();
    expect(screen.getByRole('link', { name: 'Terms' })).toBeOnTheScreen();
    expect(screen.queryByRole('link', { name: 'Privacy' })).toBeNull();
    await fireEvent.press(screen.getByRole('button', { name: 'Close' }));
    expect(onClose).toHaveBeenCalled();
  });
});
