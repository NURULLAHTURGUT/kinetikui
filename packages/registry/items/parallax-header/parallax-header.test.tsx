import { render, screen } from '@testing-library/react-native';
import { Text } from 'react-native';

import { ParallaxHeader } from './parallax-header';

describe('ParallaxHeader', () => {
  it('renders the title as a header with the content below', async () => {
    await render(
      <ParallaxHeader title="Album" subtitle="Artist" header={<Text>Artwork</Text>}>
        <Text>Track one</Text>
      </ParallaxHeader>,
    );
    expect(screen.getByRole('header', { name: 'Album' })).toBeOnTheScreen();
    expect(screen.getByText('Artist')).toBeOnTheScreen();
    expect(screen.getByText('Track one')).toBeOnTheScreen();
  });

  it('keeps decorative artwork and the bar copy of the title away from screen readers', async () => {
    await render(
      <ParallaxHeader title="Album" header={<Text>Artwork</Text>}>
        <Text>Track</Text>
      </ParallaxHeader>,
    );
    expect(screen.queryByText('Artwork')).toBeNull();
    expect(screen.getAllByText('Album')).toHaveLength(1);
  });

  it('renders a bar accessory', async () => {
    await render(
      <ParallaxHeader title="Album" header={null} barAccessory={<Text>Share</Text>} topInset={0}>
        <Text>Track</Text>
      </ParallaxHeader>,
    );
    expect(screen.getByText('Share')).toBeOnTheScreen();
  });
});
