import { fireEvent, render, screen } from '@testing-library/react-native';

import { KinetikProvider } from '../../shared/tokens/theme';
import { ArrivalCard } from './arrival-card';

describe('ArrivalCard', () => {
  it('reads as one label', async () => {
    await render(
      <ArrivalCard code="NRT" city="TOKYO" time="3:25PM" status="ON SCHEDULE" tag="KN204" />,
    );
    expect(
      screen.getByLabelText('KN204. NRT, TOKYO. LANDS AT: 3:25PM. ON SCHEDULE'),
    ).toBeOnTheScreen();
  });

  it('leaves out what is not given and takes a custom label', async () => {
    await render(<ArrivalCard code="NRT" city="TOKYO" time="3:25PM" arriveLabel="Due" />);
    expect(screen.getByLabelText('NRT, TOKYO. Due 3:25PM')).toBeOnTheScreen();
  });

  it('draws the plane once measured, with reduced motion too', async () => {
    await render(
      <KinetikProvider reduceMotion="always">
        <ArrivalCard code="NRT" city="TOKYO" time="3:25PM" />
      </KinetikProvider>,
    );
    await fireEvent(screen.getByLabelText(/^NRT/), 'layout', {
      nativeEvent: { layout: { width: 240, height: 240 } },
    });
    expect(screen.getByTestId('arrival-plane', { includeHiddenElements: true })).toBeOnTheScreen();
  });
});
