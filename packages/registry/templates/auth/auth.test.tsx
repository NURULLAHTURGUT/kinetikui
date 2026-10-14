import { act, fireEvent, render, screen } from '@testing-library/react-native';

import { Auth } from './auth';

const sendCode = async (email: string) => {
  await fireEvent.changeText(screen.getByLabelText('Email'), email);
  await act(async () => {
    fireEvent.press(screen.getByRole('button', { name: 'Send code' }));
  });
};

const enterCode = (code: string) =>
  act(async () => {
    fireEvent.changeText(screen.getByLabelText('Verification code'), code);
  });

describe('Auth', () => {
  beforeEach(() => jest.useFakeTimers());
  afterEach(() => jest.useRealTimers());

  it('rejects an invalid address without sending', async () => {
    const onSendCode = jest.fn();
    await render(<Auth onSendCode={onSendCode} onVerify={jest.fn()} onDone={jest.fn()} />);
    await sendCode('ada@');
    expect(onSendCode).not.toHaveBeenCalled();
    expect(screen.getByText('Enter a valid email address')).toBeOnTheScreen();
  });

  it('sends a code, verifies it and finishes', async () => {
    const onSendCode = jest.fn(() => Promise.resolve());
    const onVerify = jest.fn(() => Promise.resolve());
    const onDone = jest.fn();
    await render(<Auth onSendCode={onSendCode} onVerify={onVerify} onDone={onDone} />);
    await sendCode(' ada@example.com ');
    expect(onSendCode).toHaveBeenCalledWith('ada@example.com');
    expect(screen.getByText('ada@example.com')).toBeOnTheScreen();
    await enterCode('123456');
    expect(onVerify).toHaveBeenCalledWith('ada@example.com', '123456');
    await act(async () => {
      jest.advanceTimersByTime(700);
    });
    await fireEvent.press(screen.getByRole('button', { name: 'Continue' }));
    expect(onDone).toHaveBeenCalled();
  });

  it('says so when the code is wrong and stays on the step', async () => {
    const onVerify = jest.fn(() => Promise.reject(new Error('wrong')));
    await render(
      <Auth
        initialEmail="ada@example.com"
        onSendCode={jest.fn()}
        onVerify={onVerify}
        onDone={jest.fn()}
      />,
    );
    await sendCode('ada@example.com');
    await enterCode('000000');
    expect(screen.getByText('That code didn’t match. Try again.')).toBeOnTheScreen();
    expect(screen.queryByRole('button', { name: 'Continue' })).toBeNull();
  });

  it('unlocks resend after the countdown', async () => {
    const onSendCode = jest.fn(() => Promise.resolve());
    await render(
      <Auth onSendCode={onSendCode} onVerify={jest.fn()} onDone={jest.fn()} resendAfter={3} />,
    );
    await sendCode('ada@example.com');
    expect(screen.getByLabelText('You can resend the code in 3 seconds')).toBeOnTheScreen();
    for (let i = 0; i < 3; i += 1) {
      await act(async () => {
        jest.advanceTimersByTime(1000);
      });
    }
    await act(async () => {
      fireEvent.press(screen.getByRole('button', { name: 'Resend code' }));
    });
    expect(onSendCode).toHaveBeenCalledTimes(2);
    expect(screen.getByText('A new code is on its way.')).toBeOnTheScreen();
  });

  it('goes back to change the address', async () => {
    await render(<Auth onSendCode={jest.fn()} onVerify={jest.fn()} onDone={jest.fn()} />);
    await sendCode('ada@example.com');
    await fireEvent.press(screen.getByRole('button', { name: 'Change email' }));
    expect(screen.getByLabelText('Email')).toHaveDisplayValue('ada@example.com');
  });
});
