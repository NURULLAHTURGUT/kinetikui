import { act, fireEvent, render, screen } from '@testing-library/react-native';

import { BoardingPass, barcodeBars, type BoardingPassProps } from './boarding-pass';

const PASS: BoardingPassProps = {
  airline: 'Northwind',
  flight: 'KN 1321',
  from: { code: 'CDG', city: 'Paris', time: '14:30' },
  to: { code: 'JFK', city: 'New York', time: '17:45' },
  duration: '8h 15m',
  passenger: 'Olivia Bennett',
  details: [
    { label: 'Gate', value: 'B12' },
    { label: 'Seat', value: '12A' },
  ],
};

describe('barcodeBars', () => {
  it('draws the same pattern for the same code', () => {
    expect(barcodeBars('AG7890')).toEqual(barcodeBars('AG7890'));
    expect(barcodeBars('AG7890')).not.toEqual(barcodeBars('ZZ0001'));
  });
});

describe('BoardingPass', () => {
  it('reads the pass as one summary', async () => {
    await render(<BoardingPass {...PASS} />);
    expect(
      screen.getByLabelText(
        'Boarding pass, Kinetik Air. Northwind flight KN 1321. Paris CDG 14:30 to New York JFK 17:45, 8h 15m. Passenger name Olivia Bennett. Gate B12, Seat 12A',
      ),
    ).toBeOnTheScreen();
  });

  it('scans once, then reads as boarded', async () => {
    const onScan = jest.fn();
    await render(<BoardingPass {...PASS} onScan={onScan} />);
    await act(async () => {
      fireEvent.press(screen.getByRole('button', { name: 'Barcode' }));
    });
    expect(onScan).toHaveBeenCalledTimes(1);
    const stub = screen.getByRole('button', { name: 'Boarded' });
    expect(stub).toBeDisabled();
  });

  it('has no button without onScan', async () => {
    await render(<BoardingPass {...PASS} />);
    expect(screen.queryByRole('button')).toBeNull();
  });
});
