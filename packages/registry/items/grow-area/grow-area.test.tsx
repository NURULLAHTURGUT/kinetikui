import { fireEvent, render, screen } from '@testing-library/react-native';
import { useState } from 'react';

import { GrowArea } from './grow-area';

function Harness({ initial = '' }: { initial?: string }) {
  const [value, setValue] = useState(initial);
  return <GrowArea label="Bio" value={value} onChangeText={setValue} maxLength={40} />;
}

describe('GrowArea', () => {
  it('is a multi-line field named by its label', async () => {
    await render(<Harness />);
    const field = screen.getByLabelText('Bio');
    expect(field).toHaveProp('multiline', true);
    expect(field).toHaveProp('maxLength', 40);
  });

  it('counts the characters left and shows the number near the limit', async () => {
    await render(<Harness />);
    expect(screen.getByLabelText('40 characters left')).toBeOnTheScreen();
    expect(screen.queryByText('40')).toBeNull();
    await fireEvent.changeText(screen.getByLabelText('Bio'), 'Designs quiet, careful things.');
    expect(screen.getByLabelText('10 characters left')).toBeOnTheScreen();
    expect(screen.getByText('10', { includeHiddenElements: true })).toBeTruthy();
  });

  it('grows with its content and only scrolls past the last line', async () => {
    await render(<Harness initial="Hello" />);
    const field = screen.getByLabelText('Bio');
    expect(field).toHaveProp('scrollEnabled', false);
    await fireEvent(field, 'contentSizeChange', {
      nativeEvent: { contentSize: { width: 300, height: 22 * 12 } },
    });
    expect(screen.getByLabelText('Bio')).toHaveProp('scrollEnabled', true);
  });
});
