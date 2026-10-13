import { fireEvent, render, screen } from '@testing-library/react-native';
import { useState } from 'react';

import { TagField } from './tag-field';

function Harness({ onChange, maxTags }: { onChange?: jest.Mock; maxTags?: number }) {
  const [tags, setTags] = useState(['design', 'motion']);
  return (
    <TagField
      label="Topics"
      value={tags}
      maxTags={maxTags}
      validate={(t) => t.length <= 12}
      onChange={(next) => {
        setTags(next);
        onChange?.(next);
      }}
    />
  );
}

const field = () => screen.getByLabelText('Topics');

describe('TagField', () => {
  it('lists the tags in the field hint and names each remove button', async () => {
    await render(<Harness />);
    expect(field()).toHaveProp('accessibilityHint', '2 tags: design, motion');
    expect(screen.getByRole('button', { name: 'Remove motion' })).toBeOnTheScreen();
  });

  it('adds a tag on Return and on a comma', async () => {
    const onChange = jest.fn();
    await render(<Harness onChange={onChange} />);
    await fireEvent.changeText(field(), 'react ');
    await fireEvent(field(), 'submitEditing');
    expect(onChange).toHaveBeenLastCalledWith(['design', 'motion', 'react']);
    await fireEvent.changeText(field(), 'native,');
    expect(onChange).toHaveBeenLastCalledWith(['design', 'motion', 'react', 'native']);
    expect(field()).toHaveProp('value', '');
  });

  it('skips duplicates and refuses tags that fail validation', async () => {
    const onChange = jest.fn();
    await render(<Harness onChange={onChange} />);
    await fireEvent.changeText(field(), 'Design,');
    await fireEvent.changeText(field(), 'a-very-long-topic,');
    expect(onChange).not.toHaveBeenCalled();
    expect(field()).toHaveProp('value', 'a-very-long-topic');
  });

  it('removes with the button, or with two Backspaces in the empty field', async () => {
    const onChange = jest.fn();
    await render(<Harness onChange={onChange} />);
    await fireEvent.press(screen.getByRole('button', { name: 'Remove design' }));
    expect(onChange).toHaveBeenLastCalledWith(['motion']);
    await fireEvent(field(), 'keyPress', { nativeEvent: { key: 'Backspace' } });
    expect(onChange).toHaveBeenCalledTimes(1);
    await fireEvent(field(), 'keyPress', { nativeEvent: { key: 'Backspace' } });
    expect(onChange).toHaveBeenLastCalledWith([]);
  });

  it('stops taking tags at the limit', async () => {
    await render(<Harness maxTags={2} />);
    expect(screen.getByText('2/2')).toBeOnTheScreen();
    expect(field()).toHaveProp('editable', false);
  });
});
