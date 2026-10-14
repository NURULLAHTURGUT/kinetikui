import { act, fireEvent, render, screen } from '@testing-library/react-native';

import { QuestionDeck } from './question-deck';

const QUESTIONS = [
  {
    id: 'how',
    title: 'How would you like to make change happen?',
    options: ['D.I.Y.', 'Contractor'],
  },
  { id: 'when', title: 'When would you like to start?', options: ['Soon', 'Later'] },
];

const press = (role: 'button' | 'radio', name: string) =>
  act(async () => {
    fireEvent.press(screen.getByRole(role, { name }));
  });

describe('QuestionDeck', () => {
  it('waits for an answer before moving on', async () => {
    await render(<QuestionDeck questions={QUESTIONS} onComplete={jest.fn()} />);
    expect(screen.getByLabelText('Questions')).toHaveAccessibilityValue({
      text: 'Question 1 of 2',
    });
    expect(screen.getByRole('button', { name: 'Next' })).toBeDisabled();
    await press('radio', 'Contractor');
    expect(screen.getByRole('radio', { name: 'Contractor' })).toBeChecked();
    await press('button', 'Next');
    expect(screen.getByText('When would you like to start?')).toBeOnTheScreen();
  });

  it('goes back keeping the answer and finishes with every answer', async () => {
    const onComplete = jest.fn();
    await render(<QuestionDeck questions={QUESTIONS} onComplete={onComplete} />);
    await press('radio', 'D.I.Y.');
    await press('button', 'Next');
    await press('button', 'Back');
    expect(screen.getByRole('radio', { name: 'D.I.Y.' })).toBeChecked();
    await press('button', 'Next');
    await press('radio', 'Later');
    await press('button', 'Finish');
    expect(onComplete).toHaveBeenCalledWith({ how: 'D.I.Y.', when: 'Later' });
  });

  it('closes when asked', async () => {
    const onClose = jest.fn();
    await render(<QuestionDeck questions={QUESTIONS} onComplete={jest.fn()} onClose={onClose} />);
    await press('button', 'Close');
    expect(onClose).toHaveBeenCalled();
  });
});
