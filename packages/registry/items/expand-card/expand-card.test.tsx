import { render, screen } from '@testing-library/react-native';
import { Text } from 'react-native';

import { activate, tapGesture } from '../../jest/helpers';
import { ExpandCard } from './expand-card';

const image = { uri: 'https://example.com/a.jpg' };

describe('ExpandCard', () => {
  it('starts closed with the body hidden from screen readers', async () => {
    await render(
      <ExpandCard image={image} title="The Bedroom" subtitle="Van Gogh">
        <Text>Painted in Arles</Text>
      </ExpandCard>,
    );
    expect(screen.getByRole('button', { name: 'The Bedroom, Van Gogh' })).toBeCollapsed();
    expect(screen.queryByText('Painted in Arles')).toBeNull();
  });

  it('opens on tap and reports it', async () => {
    const onExpandedChange = jest.fn();
    await render(
      <ExpandCard image={image} title="The Bedroom" onExpandedChange={onExpandedChange}>
        <Text>Painted in Arles</Text>
      </ExpandCard>,
    );
    await tapGesture('expand-card');
    expect(onExpandedChange).toHaveBeenCalledWith(true);
    expect(screen.getByRole('button')).toBeExpanded();
    expect(screen.getByText('Painted in Arles')).toBeOnTheScreen();
  });

  it('follows the controlled value and the activate action', async () => {
    const onExpandedChange = jest.fn();
    await render(
      <ExpandCard image={image} title="The Bedroom" expanded onExpandedChange={onExpandedChange} />,
    );
    expect(screen.getByRole('button')).toBeExpanded();
    await activate(screen.getByRole('button'));
    expect(onExpandedChange).toHaveBeenCalledWith(false);
  });
});
