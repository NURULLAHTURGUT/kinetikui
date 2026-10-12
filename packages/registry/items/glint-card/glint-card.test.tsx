import { render, screen } from '@testing-library/react-native';
import { Text } from 'react-native';
import { State } from 'react-native-gesture-handler';
import { fireGestureHandler, getByGestureTestId } from 'react-native-gesture-handler/jest-utils';

import { KinetikProvider } from '../../shared/tokens/theme';
import { GlintCard } from './glint-card';

const mockTiltSensor = jest.fn((_props: unknown) => null);
jest.mock('../../shared/hooks/use-tilt', () => {
  const actual = jest.requireActual('../../shared/hooks/use-tilt');
  return { ...actual, TiltSensor: (props: unknown) => mockTiltSensor(props) };
});

beforeEach(() => mockTiltSensor.mockClear());

describe('GlintCard', () => {
  it('renders its content and exposes the accessibility label', async () => {
    await render(
      <GlintCard accessibilityLabel="Night pass" accessibilityRole="summary">
        <Text>Gate 4</Text>
      </GlintCard>,
    );
    expect(screen.getByText('Gate 4')).toBeOnTheScreen();
    expect(screen.getByLabelText('Night pass')).toBeOnTheScreen();
  });

  it('starts the tilt sensor only when tilt drives the light', async () => {
    const { rerender } = await render(<GlintCard />);
    expect(mockTiltSensor).toHaveBeenCalled();

    mockTiltSensor.mockClear();
    await rerender(<GlintCard source="touch" />);
    expect(mockTiltSensor).not.toHaveBeenCalled();
  });

  it('does no sensor work when paused, with reduceEffects, or under reduced motion', async () => {
    await render(<GlintCard active={false} />);
    await render(<GlintCard reduceEffects />);
    await render(
      <KinetikProvider reduceMotion="always">
        <GlintCard />
      </KinetikProvider>,
    );
    expect(mockTiltSensor).not.toHaveBeenCalled();
  });

  it('tracks touches without throwing', async () => {
    await render(<GlintCard testID="card" />);
    const gesture = getByGestureTestId('glint-card-touch');
    expect(() =>
      fireGestureHandler(gesture, [
        { state: State.BEGAN, x: 10, y: 10 },
        { state: State.ACTIVE, x: 60, y: 40 },
        { state: State.END, x: 60, y: 40 },
      ]),
    ).not.toThrow();
  });
});
