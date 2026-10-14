import { act, fireEvent, render, screen } from '@testing-library/react-native';

import { VitalArcs } from './vital-arcs';

const PROPS = {
  title: 'Today',
  metrics: [
    { value: '7h 2m', label: 'Sleep time', change: { text: '12%', up: true } },
    { value: '56 bpm', label: 'Avg. heart rate' },
  ],
  rings: [
    { value: 31, label: 'Activity' },
    { value: 84, label: 'Workouts' },
    { value: 53, label: 'Rest' },
  ],
  score: 16,
  scoreLabel: 'PAI',
};

describe('VitalArcs', () => {
  it('reads each metric as one line', async () => {
    await render(<VitalArcs {...PROPS} />);
    expect(screen.getByRole('header', { name: 'Today' })).toBeOnTheScreen();
    expect(screen.getByLabelText('Sleep time: 7h 2m, up 12%')).toBeOnTheScreen();
    expect(screen.getByLabelText('Avg. heart rate: 56 bpm')).toBeOnTheScreen();
  });

  it('reads the arcs and the score once laid out', async () => {
    const view = await render(<VitalArcs {...PROPS} />);
    await act(async () => {
      fireEvent(view.root!, 'layout', { nativeEvent: { layout: { width: 400, height: 204 } } });
    });
    expect(screen.getByLabelText('16 PAI. Activity 31, Workouts 84, Rest 53')).toBeOnTheScreen();
  });
});
