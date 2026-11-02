import { fireEvent, render, screen } from '@testing-library/react-native';

import { KinetikProvider } from '../../shared/tokens/theme';
import { BalanceStack } from './balance-stack';

const ACCOUNTS = [
  { id: 'travel', balance: 6240.18, digits: '2048', network: 'NOVA' },
  { id: 'daily', balance: 18904.6, digits: '6190', network: 'ORBIT' },
];

const stack = (props: { onSelect?: (id: string) => void; selected?: string } = {}) => (
  <KinetikProvider reduceMotion="always">
    <BalanceStack label="Savings Vault" status="Earning" accounts={ACCOUNTS} {...props} />
  </KinetikProvider>
);

describe('BalanceStack', () => {
  it('starts on the last account and reads the balance as one line', async () => {
    await render(stack());
    expect(screen.getByLabelText('Savings Vault, $18,904.60, Earning')).toBeOnTheScreen();
    expect(screen.getByRole('button', { name: 'ORBIT card ending 6190' })).toBeSelected();
  });

  it('pulls a tapped card to the front', async () => {
    const onSelect = jest.fn();
    await render(stack({ onSelect }));
    await fireEvent.press(screen.getByRole('button', { name: 'NOVA card ending 2048' }));
    expect(onSelect).toHaveBeenCalledWith('travel');
    expect(screen.getByLabelText('Savings Vault, $6,240.18, Earning')).toBeOnTheScreen();
    expect(screen.getByRole('button', { name: 'NOVA card ending 2048' })).toBeSelected();
  });

  it('follows a controlled selection and shows the cents apart', async () => {
    await render(stack({ selected: 'travel' }));
    expect(screen.getByLabelText('Savings Vault, $6,240.18, Earning')).toBeOnTheScreen();
    expect(screen.getByText('.18', { includeHiddenElements: true })).toBeOnTheScreen();
  });
});
