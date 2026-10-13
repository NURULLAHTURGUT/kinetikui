import { act, fireEvent, render, screen } from '@testing-library/react-native';

import { ReadMore } from './read-more';

const TEXT =
  'A small house at the edge of the lake, with a deck over the water and a wood stove for the cold mornings. ' +
  'Kayaks and a rowing boat are yours to use, and the trail to the ridge starts at the gate.';

/** Gives the text a measured height, as layout would on a device. */
async function layoutText(height: number) {
  await act(async () => {
    fireEvent(screen.getByText(TEXT), 'layout', {
      nativeEvent: { layout: { x: 0, y: 0, width: 320, height } },
    });
  });
}

describe('ReadMore', () => {
  it('offers Read more only when the text is longer than the fold', async () => {
    await render(<ReadMore lines={3}>{TEXT}</ReadMore>);
    // 3 lines of 25 pt is 75 pt; 60 pt of text fits.
    await layoutText(60);
    expect(screen.queryByRole('button', { name: 'Read more' })).toBeNull();
    await layoutText(200);
    expect(screen.getByRole('button', { name: 'Read more' })).toBeOnTheScreen();
  });

  it('expands and folds again', async () => {
    const onExpandedChange = jest.fn();
    await render(<ReadMore onExpandedChange={onExpandedChange}>{TEXT}</ReadMore>);
    await layoutText(200);
    await fireEvent.press(screen.getByRole('button', { name: 'Read more' }));
    expect(onExpandedChange).toHaveBeenLastCalledWith(true);
    const less = screen.getByRole('button', { name: 'Show less' });
    expect(less).toBeExpanded();
    await fireEvent.press(less);
    expect(screen.getByRole('button', { name: 'Read more' })).toBeCollapsed();
  });

  it('takes custom labels', async () => {
    await render(
      <ReadMore moreLabel="More about the house" lessLabel="Less">
        {TEXT}
      </ReadMore>,
    );
    await layoutText(200);
    expect(screen.getByRole('button', { name: 'More about the house' })).toBeOnTheScreen();
  });
});
