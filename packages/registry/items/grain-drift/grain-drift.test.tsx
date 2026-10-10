import { render, screen } from '@testing-library/react-native';
import { Text } from 'react-native';

import { runtimeEffect } from '../../shared/shaders/sksl';
import { GrainDrift } from './grain-drift';
import { GRAIN_SHADER } from './grain-drift.shader';

describe('GrainDrift', () => {
  it('compiles its shader', () => {
    expect(() => runtimeEffect(GRAIN_SHADER)).not.toThrow();
  });

  it('renders children above the gradient', async () => {
    await render(
      <GrainDrift grain={0}>
        <Text>Now playing</Text>
      </GrainDrift>,
    );
    expect(screen.getByText('Now playing')).toBeOnTheScreen();
  });

  it('accepts its own palette and a paused state', async () => {
    await render(
      <GrainDrift colors={['#000000', '#111111', '#222222', '#333333']} active={false}>
        <Text>Paused</Text>
      </GrainDrift>,
    );
    expect(screen.getByText('Paused')).toBeOnTheScreen();
  });
});
