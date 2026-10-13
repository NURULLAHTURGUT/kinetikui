import { fireEvent, render, screen } from '@testing-library/react-native';

import { AvatarStack, initials } from './avatar-stack';

const PEOPLE = [
  { id: '1', name: 'Ada Lovelace' },
  { id: '2', name: 'Grace Hopper' },
  { id: '3', name: 'Alan Turing' },
  { id: '4', name: 'Katherine Johnson' },
  { id: '5', name: 'Linus' },
  { id: '6', name: 'Margaret Hamilton' },
];

describe('initials', () => {
  it('takes the first and last initial', () => {
    expect(initials('Ada Lovelace')).toBe('AL');
    expect(initials('  linus ')).toBe('L');
    expect(initials('Mary Jane Watson')).toBe('MW');
  });
});

describe('AvatarStack', () => {
  it('reads everyone as one button and counts the rest', async () => {
    await render(<AvatarStack people={PEOPLE} max={3} maxOpen={4} />);
    expect(
      screen.getByRole('button', {
        name: '6 people: Ada Lovelace, Grace Hopper, Alan Turing, Katherine Johnson, Linus, Margaret Hamilton',
      }),
    ).toHaveProp('accessibilityState', { expanded: false });
    expect(screen.getByText('AL')).toBeOnTheScreen();
    expect(screen.getByText('+3')).toBeOnTheScreen();
    expect(screen.getByText('+2')).toBeOnTheScreen();
  });

  it('spreads out and stacks again on press', async () => {
    await render(<AvatarStack people={PEOPLE} />);
    const stack = screen.getByRole('button');
    await fireEvent.press(stack);
    expect(screen.getByRole('button')).toHaveProp('accessibilityState', { expanded: true });
    await fireEvent.press(screen.getByRole('button'));
    expect(screen.getByRole('button')).toHaveProp('accessibilityState', { expanded: false });
  });
});
