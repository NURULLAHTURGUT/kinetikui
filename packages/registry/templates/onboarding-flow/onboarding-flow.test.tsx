import { act, fireEvent, render, screen } from '@testing-library/react-native';
import { Text } from 'react-native';

import { OnboardingFlow } from './onboarding-flow';

const slides = [
  { key: 'a', title: 'First idea', body: 'One', visual: <Text>Visual A</Text> },
  { key: 'b', title: 'Second idea', body: 'Two' },
];

const press = (fn: () => void) =>
  act(async () => {
    fn();
  });

async function renderFlow(props: Partial<Parameters<typeof OnboardingFlow>[0]> = {}) {
  const onFinish = jest.fn();
  const utils = await render(<OnboardingFlow onFinish={onFinish} slides={slides} {...props} />);
  // Pages render once the container has a width.
  await press(() =>
    fireEvent(screen.getByTestId('onboarding-root'), 'layout', {
      nativeEvent: { layout: { width: 390, height: 800, x: 0, y: 0 } },
    }),
  );
  return { onFinish, ...utils };
}

describe('OnboardingFlow', () => {
  it('shows the slides and progress', async () => {
    await renderFlow();
    expect(screen.getByText('Visual A')).toBeOnTheScreen();
    expect(screen.getByLabelText('Step 1 of 2')).toBeOnTheScreen();
  });

  it('advances, then finishes from the last slide', async () => {
    const { onFinish } = await renderFlow();
    await press(() => fireEvent.press(screen.getByRole('button', { name: 'Continue' })));
    expect(screen.getByLabelText('Step 2 of 2')).toBeOnTheScreen();
    expect(onFinish).not.toHaveBeenCalled();
    await press(() => fireEvent.press(screen.getByRole('button', { name: 'Get started' })));
    expect(onFinish).toHaveBeenCalledTimes(1);
  });

  it('skips with onSkip, falling back to onFinish', async () => {
    const onSkip = jest.fn();
    await renderFlow({ onSkip });
    await press(() => fireEvent.press(screen.getByRole('button', { name: 'Skip introduction' })));
    expect(onSkip).toHaveBeenCalledTimes(1);
  });
});
