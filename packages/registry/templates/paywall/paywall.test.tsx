import { act, fireEvent, render, screen } from '@testing-library/react-native';

import { Paywall } from './paywall';

const press = (fn: () => void) =>
  act(async () => {
    fn();
  });

describe('Paywall', () => {
  it('pre-selects the badged plan and switches plans', async () => {
    await render(<Paywall onPurchase={jest.fn()} />);
    expect(screen.getByRole('radio', { name: /Yearly/ })).toBeChecked();
    expect(screen.getByLabelText('$3.33 per month')).toBeOnTheScreen();
    await press(() => fireEvent.press(screen.getByRole('radio', { name: /Monthly/ })));
    expect(screen.getByRole('radio', { name: /Monthly/ })).toBeChecked();
    expect(screen.getByLabelText('$5.99 per month')).toBeOnTheScreen();
    expect(screen.getByRole('button', { name: 'Subscribe for $5.99' })).toBeOnTheScreen();
  });

  it('purchases the selected plan', async () => {
    const onPurchase = jest.fn(() => Promise.resolve());
    await render(<Paywall onPurchase={onPurchase} />);
    await press(() =>
      fireEvent.press(screen.getByRole('button', { name: 'Start 7-day free trial' })),
    );
    expect(onPurchase).toHaveBeenCalledWith(expect.objectContaining({ id: 'yearly' }));
    expect(screen.getByRole('button', { name: 'You’re in' })).toBeOnTheScreen();
  });

  it('returns to idle when the purchase fails', async () => {
    const onPurchase = jest.fn(() => Promise.reject(new Error('cancelled')));
    await render(<Paywall onPurchase={onPurchase} />);
    await press(() =>
      fireEvent.press(screen.getByRole('button', { name: 'Start 7-day free trial' })),
    );
    expect(screen.getByRole('button', { name: 'Start 7-day free trial' })).toBeEnabled();
  });

  it('shows only the links it has handlers for', async () => {
    const onClose = jest.fn();
    await render(<Paywall onPurchase={jest.fn()} onClose={onClose} onTerms={jest.fn()} />);
    expect(screen.getByRole('link', { name: 'Terms' })).toBeOnTheScreen();
    expect(screen.queryByRole('link', { name: 'Privacy' })).toBeNull();
    await press(() => fireEvent.press(screen.getByRole('button', { name: 'Close' })));
    expect(onClose).toHaveBeenCalled();
  });
});
