import { act, fireEvent, render, screen } from '@testing-library/react-native';

import { Login } from './login';

const fill = async (email: string, password: string) => {
  await fireEvent.changeText(screen.getByLabelText('Email'), email);
  await fireEvent.changeText(screen.getByLabelText('Password'), password);
};

const logIn = () =>
  act(async () => {
    fireEvent.press(screen.getByRole('button', { name: 'Log in' }));
  });

describe('Login', () => {
  it('checks the fields before calling onLogin', async () => {
    const onLogin = jest.fn();
    await render(<Login onLogin={onLogin} />);
    await fill('not-an-email', '');
    await logIn();
    expect(onLogin).not.toHaveBeenCalled();
    expect(screen.getByText('Enter a valid email address')).toBeOnTheScreen();
    expect(screen.getByText('Enter your password')).toBeOnTheScreen();
  });

  it('signs in with trimmed details', async () => {
    const onLogin = jest.fn(() => Promise.resolve());
    await render(<Login onLogin={onLogin} />);
    await fill('  ada@example.com ', 'secret');
    await logIn();
    expect(onLogin).toHaveBeenCalledWith({ email: 'ada@example.com', password: 'secret' });
    expect(screen.getByRole('button', { name: 'Logged in' })).toBeOnTheScreen();
  });

  it('shows the error from a failed attempt', async () => {
    const onLogin = jest.fn(() => Promise.reject(new Error('Wrong password')));
    await render(<Login onLogin={onLogin} />);
    await fill('ada@example.com', 'nope');
    await logIn();
    expect(screen.getByRole('alert')).toHaveTextContent('Wrong password');
    expect(screen.getByRole('button', { name: 'Log in' })).toBeEnabled();
  });

  it('renders providers and links only when given', async () => {
    const apple = jest.fn();
    const onSignUp = jest.fn();
    const { rerender } = await render(<Login onLogin={jest.fn()} />);
    expect(screen.queryByText('or')).toBeNull();
    expect(screen.queryByRole('link', { name: 'Sign up' })).toBeNull();
    await rerender(
      <Login
        onLogin={jest.fn()}
        onSignUp={onSignUp}
        providers={[{ id: 'apple', label: 'Continue with Apple', onPress: apple }]}
      />,
    );
    await fireEvent.press(screen.getByRole('button', { name: 'Continue with Apple' }));
    await fireEvent.press(screen.getByRole('link', { name: 'Sign up' }));
    expect(apple).toHaveBeenCalled();
    expect(onSignUp).toHaveBeenCalled();
  });
});
