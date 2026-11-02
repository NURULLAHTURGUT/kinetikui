import { defineControls } from '../../demo-kit/types';
import { BalanceStack } from './balance-stack';

export const controls = defineControls({});

export default function BalanceStackDemo() {
  return (
    <BalanceStack
      label="Savings Vault"
      status="Earning"
      currency="€"
      accounts={[
        { id: 'travel', balance: 6240.18, digits: '2048', network: 'NOVA' },
        { id: 'daily', balance: 18904.6, digits: '6190', network: 'NOVA' },
      ]}
    />
  );
}
