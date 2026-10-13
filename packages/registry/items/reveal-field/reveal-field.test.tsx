import { fireEvent, render, screen } from '@testing-library/react-native';
import { useState } from 'react';

import { RevealField } from './reveal-field';

function Harness() {
  const [value, setValue] = useState('');
  return <RevealField value={value} onChangeText={setValue} />;
}

describe('RevealField', () => {
  it('starts hidden and names the field and the eye', async () => {
    await render(<Harness />);
    expect(screen.getByLabelText('Password')).toHaveProp('secureTextEntry', true);
    expect(screen.getByRole('button', { name: 'Show password' })).toBeOnTheScreen();
  });

  it('shows and hides the text from the eye', async () => {
    await render(<Harness />);
    await fireEvent.changeText(screen.getByLabelText('Password'), 'correct horse');
    await fireEvent.press(screen.getByRole('button', { name: 'Show password' }));
    expect(screen.getByLabelText('Password')).toHaveProp('secureTextEntry', false);
    expect(screen.getByLabelText('Password')).toHaveProp('value', 'correct horse');
    await fireEvent.press(screen.getByRole('button', { name: 'Hide password' }));
    expect(screen.getByLabelText('Password')).toHaveProp('secureTextEntry', true);
  });
});
