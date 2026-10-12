import { render, screen } from '@testing-library/react-native';

import { MarkerHighlight } from './marker-highlight';

const text = 'Plan trips together and keep every booking in one place.';

describe('MarkerHighlight', () => {
  it('reads as one piece of text', async () => {
    await render(<MarkerHighlight text={text} highlights={['together', 'one place']} />);
    expect(screen.getByLabelText(text)).toBeOnTheScreen();
  });

  it('marks the words of each phrase and keeps phrases joined across spaces', async () => {
    await render(<MarkerHighlight text={text} highlights={['every booking', 'missing']} />);
    // Inside a phrase the space stays with the word; at its end it is set apart.
    expect(screen.getByText('every ', { includeHiddenElements: true })).toBeOnTheScreen();
    expect(screen.getByText('booking', { includeHiddenElements: true })).toBeOnTheScreen();
    // Unmarked words carry their own space.
    expect(screen.getByText('Plan ', { includeHiddenElements: true })).toBeOnTheScreen();
  });
});
