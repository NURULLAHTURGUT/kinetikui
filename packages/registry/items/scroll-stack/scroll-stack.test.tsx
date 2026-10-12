import { render, screen } from '@testing-library/react-native';
import { Text } from 'react-native';

import { ScrollStack } from './scroll-stack';

describe('ScrollStack', () => {
  it('renders the header and every card in order', async () => {
    await render(
      <ScrollStack header={<Text>Chapters</Text>}>
        <Text>One</Text>
        <Text>Two</Text>
        <Text>Three</Text>
      </ScrollStack>,
    );
    expect(screen.getByText('Chapters')).toBeOnTheScreen();
    const texts = screen.getAllByText(/One|Two|Three/).map((t) => t.props.children);
    expect(texts).toEqual(['One', 'Two', 'Three']);
  });
});
