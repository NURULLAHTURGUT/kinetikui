import { render, screen } from '@testing-library/react-native';
import { Text } from 'react-native';

import { runtimeEffect } from '../../shared/shaders/sksl';
import { KinetikProvider } from '../../shared/tokens/theme';
import { AuroraVeil } from './aurora-veil';
import { AURORA_SHADER } from './aurora-veil.shader';

describe('AuroraVeil', () => {
  it('compiles its shader', () => {
    expect(() => runtimeEffect(AURORA_SHADER)).not.toThrow();
  });

  it('renders children above the aurora', async () => {
    await render(
      <AuroraVeil>
        <Text>Headline</Text>
      </AuroraVeil>,
    );
    expect(screen.getByText('Headline')).toBeOnTheScreen();
  });

  it('renders as a still frame under reduced motion and with custom colours', async () => {
    await render(
      <KinetikProvider reduceMotion="always">
        <AuroraVeil colors={['#112233', '#445566', '#778899']} intensity={2} frameRate={30}>
          <Text>Still</Text>
        </AuroraVeil>
      </KinetikProvider>,
    );
    expect(screen.getByText('Still')).toBeOnTheScreen();
  });
});
