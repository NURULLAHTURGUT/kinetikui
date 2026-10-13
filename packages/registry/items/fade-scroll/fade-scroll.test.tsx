import { render, screen } from '@testing-library/react-native';
import { Text } from 'react-native';

import { KinetikProvider } from '../../shared/tokens/theme';
import { FadeScroll } from './fade-scroll';

describe('FadeScroll', () => {
  it('renders its content in a named scroll view', async () => {
    await render(
      <FadeScroll accessibilityLabel="Terms" style={{ height: 200 }}>
        <Text>First clause</Text>
        <Text>Last clause</Text>
      </FadeScroll>,
    );
    expect(screen.getByLabelText('Terms')).toBeOnTheScreen();
    expect(screen.getByText('Last clause')).toBeOnTheScreen();
  });

  it('scrolls sideways when horizontal', async () => {
    await render(
      <FadeScroll horizontal accessibilityLabel="Tags">
        <Text>One</Text>
      </FadeScroll>,
    );
    expect(screen.getByLabelText('Tags')).toHaveProp('horizontal', true);
  });

  it('keeps the native indicator with reduced motion', async () => {
    await render(
      <KinetikProvider reduceMotion="always">
        <FadeScroll accessibilityLabel="Notes">
          <Text>Note</Text>
        </FadeScroll>
      </KinetikProvider>,
    );
    expect(screen.getByLabelText('Notes')).toHaveProp('showsVerticalScrollIndicator', true);
  });
});
