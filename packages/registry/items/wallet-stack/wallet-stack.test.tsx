import { act, fireEvent, render, screen } from '@testing-library/react-native';

import { WalletStack } from './wallet-stack';

const CARDS = [
  { id: 'a', name: 'Kinetik Travel', last4: '4421' },
  { id: 'b', name: 'Kinetik Black', last4: '2048' },
];

const layout = { nativeEvent: { layout: { x: 0, y: 0, width: 340, height: 360 } } };

describe('WalletStack', () => {
  it('reads the title and balance on the pocket', async () => {
    await render(<WalletStack cards={CARDS} balance={4018} />);
    expect(screen.getByRole('button', { name: 'Wallet, Total balance $4,018.00' })).toBeCollapsed();
  });

  it('opens to make the cards tappable', async () => {
    const onCardPress = jest.fn();
    const { root } = await render(
      <WalletStack cards={CARDS} balance={10} onCardPress={onCardPress} />,
    );
    await act(async () => {
      fireEvent(root!, 'layout', layout);
    });
    expect(screen.queryByRole('button', { name: 'Kinetik Black ending 2048' })).toBeNull();
    await act(async () => {
      fireEvent.press(screen.getByRole('button', { name: /^Wallet/ }));
    });
    expect(screen.getByRole('button', { name: /^Wallet/ })).toBeExpanded();
    await act(async () => {
      fireEvent.press(screen.getByRole('button', { name: 'Kinetik Black ending 2048' }));
    });
    expect(onCardPress).toHaveBeenCalledWith(expect.objectContaining({ id: 'b' }));
  });
});
