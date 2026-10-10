import { render, screen } from '@testing-library/react-native';
import { Text } from 'react-native';

import { activate, tapGesture } from '../../jest/helpers';
import { FlipLedger } from './flip-ledger';

const faces = { front: <Text>Front face</Text>, back: <Text>Back face</Text> };

describe('FlipLedger', () => {
  it('labels the card and exposes only the visible face', async () => {
    await render(<FlipLedger {...faces} accessibilityLabel="Ledger" />);
    expect(screen.getByRole('button', { name: 'Ledger' })).toBeOnTheScreen();
    expect(screen.getByText('Front face')).toBeOnTheScreen();
    expect(screen.queryByText('Back face')).toBeNull();
    expect(screen.getByText('Back face', { includeHiddenElements: true })).toBeTruthy();
  });

  it('flips on tap when uncontrolled', async () => {
    const onFlippedChange = jest.fn();
    await render(
      <FlipLedger {...faces} accessibilityLabel="Ledger" onFlippedChange={onFlippedChange} />,
    );
    expect(screen.getByRole('button')).toBeCollapsed();
    await tapGesture('flip-ledger');
    expect(onFlippedChange).toHaveBeenCalledWith(true);
    expect(screen.getByRole('button')).toBeExpanded();
  });

  it('respects the controlled value', async () => {
    const onFlippedChange = jest.fn();
    await render(<FlipLedger {...faces} flipped={false} onFlippedChange={onFlippedChange} />);
    await tapGesture('flip-ledger');
    expect(onFlippedChange).toHaveBeenCalledWith(true);
    expect(screen.getByRole('button')).toBeCollapsed();
  });

  it('flips from the screen-reader activate action', async () => {
    const onFlippedChange = jest.fn();
    await render(<FlipLedger {...faces} onFlippedChange={onFlippedChange} />);
    await activate(screen.getByRole('button'));
    expect(onFlippedChange).toHaveBeenCalledWith(true);
  });

  it('is not a button when flipOnPress is off', async () => {
    await render(<FlipLedger {...faces} flipOnPress={false} />);
    expect(screen.queryByRole('button')).toBeNull();
  });
});
