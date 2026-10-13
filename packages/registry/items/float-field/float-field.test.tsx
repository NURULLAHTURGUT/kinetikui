import { fireEvent, render, screen } from '@testing-library/react-native';
import { useState } from 'react';
import { AccessibilityInfo } from 'react-native';

import { FloatField } from './float-field';

function Harness({ error }: { error?: string }) {
  const [value, setValue] = useState('');
  return (
    <FloatField
      label="Email"
      hint="We never share it."
      error={error}
      value={value}
      onChangeText={setValue}
    />
  );
}

describe('FloatField', () => {
  it('is a text field named by its label, with the hint as its hint', async () => {
    await render(<Harness />);
    const field = screen.getByLabelText('Email');
    expect(field).toHaveProp('accessibilityHint', 'We never share it.');
    expect(screen.getByText('We never share it.', { includeHiddenElements: true })).toBeTruthy();
  });

  it('takes typing and focus', async () => {
    await render(<Harness />);
    const field = screen.getByLabelText('Email');
    await fireEvent(field, 'focus');
    await fireEvent.changeText(field, 'ada@example.com');
    await fireEvent(field, 'blur');
    expect(field).toHaveProp('value', 'ada@example.com');
  });

  it('replaces the hint with the error and announces it', async () => {
    const announce = jest.spyOn(AccessibilityInfo, 'announceForAccessibility');
    await render(<Harness error="Enter a valid email." />);
    expect(screen.getByLabelText('Email')).toHaveProp('accessibilityHint', 'Enter a valid email.');
    expect(screen.queryByText('We never share it.', { includeHiddenElements: true })).toBeNull();
    expect(announce).toHaveBeenCalledWith('Enter a valid email.');
  });
});
