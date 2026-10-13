import { act, fireEvent, render, screen } from '@testing-library/react-native';
import { Text } from 'react-native';

import { ScrollTabs } from './scroll-tabs';

const TABS = [
  { key: 'all', title: 'All', content: <Text>Everything</Text> },
  { key: 'photos', title: 'Photos', content: <Text>Your photos</Text> },
  { key: 'videos', title: 'Videos', content: <Text>Your videos</Text> },
];

async function layout() {
  await act(async () => {
    fireEvent(screen.getByTestId('tabs-pages-box'), 'layout', {
      nativeEvent: { layout: { x: 0, y: 0, width: 360, height: 400 } },
    });
  });
}

describe('ScrollTabs', () => {
  it('is a tab list with the first tab selected', async () => {
    await render(<ScrollTabs testID="tabs" tabs={TABS} />);
    expect(screen.getByRole('tab', { name: 'All' })).toHaveProp(
      'accessibilityState',
      expect.objectContaining({ selected: true }),
    );
    expect(screen.getByRole('tab', { name: 'Videos' })).toBeOnTheScreen();
  });

  it('selects a tab on press and shows only its page to screen readers', async () => {
    const onIndexChange = jest.fn();
    await render(<ScrollTabs testID="tabs" tabs={TABS} onIndexChange={onIndexChange} />);
    await layout();
    await fireEvent.press(screen.getByRole('tab', { name: 'Photos' }));
    expect(onIndexChange).toHaveBeenCalledWith(1);
    expect(screen.getByRole('tab', { name: 'Photos' })).toHaveProp(
      'accessibilityState',
      expect.objectContaining({ selected: true }),
    );
    expect(screen.getByText('Your photos')).toBeOnTheScreen();
    expect(screen.queryByText('Everything')).toBeNull();
  });

  it('settles on the page a swipe ends on', async () => {
    const onIndexChange = jest.fn();
    await render(<ScrollTabs testID="tabs" tabs={TABS} onIndexChange={onIndexChange} />);
    await layout();
    await fireEvent(screen.getByTestId('tabs-pages'), 'momentumScrollEnd', {
      nativeEvent: { contentOffset: { x: 720, y: 0 } },
    });
    expect(onIndexChange).toHaveBeenCalledWith(2);
  });
});
