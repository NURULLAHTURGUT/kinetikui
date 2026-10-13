import { fireEvent, render, screen } from '@testing-library/react-native';
import { useState } from 'react';

import { CodeField } from './code-field';

function Harness({ onComplete }: { onComplete?: (code: string) => void }) {
  const [code, setCode] = useState('');
  return <CodeField value={code} onChangeText={setCode} onComplete={onComplete} length={4} />;
}

describe('CodeField', () => {
  it('names its input for screen readers', async () => {
    await render(<Harness />);
    expect(screen.getByLabelText('Verification code')).toBeOnTheScreen();
  });

  it('keeps digits only and shows them in the cells', async () => {
    await render(<Harness />);
    await fireEvent.changeText(screen.getByLabelText('Verification code'), '4a2');
    expect(screen.getByText('4', { includeHiddenElements: true })).toBeOnTheScreen();
    expect(screen.getByText('2', { includeHiddenElements: true })).toBeOnTheScreen();
    expect(screen.getByLabelText('Verification code').props.value).toBe('42');
  });

  it('completes once, when the last digit lands, and trims pasted codes', async () => {
    const onComplete = jest.fn();
    await render(<Harness onComplete={onComplete} />);
    await fireEvent.changeText(screen.getByLabelText('Verification code'), '123456');
    expect(onComplete).toHaveBeenCalledTimes(1);
    expect(onComplete).toHaveBeenCalledWith('1234');
  });

  it('hides digits when secure', async () => {
    await render(<CodeField value="12" onChangeText={() => {}} secure />);
    expect(screen.queryByText('1', { includeHiddenElements: true })).toBeNull();
  });
});
