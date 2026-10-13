import { fireEvent, render, screen } from '@testing-library/react-native';
import { useState } from 'react';

import { PasswordMeter, passwordStrength } from './password-meter';

function Harness() {
  const [value, setValue] = useState('');
  return <PasswordMeter label="New password" value={value} onChangeText={setValue} />;
}

describe('passwordStrength', () => {
  it('scores the share of rules met on a 0 to 4 scale', () => {
    expect(passwordStrength('')).toBe(0);
    expect(passwordStrength('abc')).toBe(0);
    expect(passwordStrength('abcdefgh')).toBe(1);
    expect(passwordStrength('Abcdefgh')).toBe(2);
    expect(passwordStrength('Abcdefg1')).toBe(3);
    expect(passwordStrength('Abcdef1!')).toBe(4);
  });

  it('takes custom rules', () => {
    expect(passwordStrength('aaaa', [{ label: 'Four', test: (p) => p.length >= 4 }])).toBe(4);
  });
});

describe('PasswordMeter', () => {
  it('names the field and hides the password until asked', async () => {
    await render(<Harness />);
    const input = screen.getByLabelText('New password');
    expect(input.props.secureTextEntry).toBe(true);
    await fireEvent.press(screen.getByRole('button', { name: 'Show password' }));
    expect(screen.getByLabelText('New password').props.secureTextEntry).toBe(false);
    expect(screen.getByRole('button', { name: 'Hide password' })).toBeOnTheScreen();
  });

  it('rates the password and ticks off rules as they are met', async () => {
    await render(<Harness />);
    expect(screen.getByLabelText('A number: not met')).toBeOnTheScreen();
    await fireEvent.changeText(screen.getByLabelText('New password'), 'Sunrise7');
    expect(screen.getByText('Good')).toBeOnTheScreen();
    expect(screen.getByLabelText('A number: met')).toBeOnTheScreen();
    expect(screen.getByLabelText('A symbol: not met')).toBeOnTheScreen();
    await fireEvent.changeText(screen.getByLabelText('New password'), 'Sunrise7!');
    expect(screen.getByText('Strong')).toBeOnTheScreen();
  });
});
