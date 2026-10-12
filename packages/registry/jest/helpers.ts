import { act, fireEvent } from '@testing-library/react-native';
import { State } from 'react-native-gesture-handler';
import { fireGestureHandler, getByGestureTestId } from 'react-native-gesture-handler/jest-utils';

/** Lets callbacks scheduled with scheduleOnRN run. */
export async function flush() {
  await act(async () => {
    await new Promise((resolve) => setTimeout(resolve, 0));
  });
}

/** Runs a complete tap on the gesture with the given test ID. */
export async function tapGesture(testId: string, at = { x: 10, y: 10 }) {
  await act(async () => {
    fireGestureHandler(getByGestureTestId(testId), [
      { state: State.BEGAN, ...at },
      { state: State.ACTIVE, ...at },
      { state: State.END, ...at },
    ]);
  });
  await flush();
}

/** Triggers the screen-reader "activate" action on an element. */
export async function activate(element: Parameters<typeof fireEvent>[0]) {
  await act(async () => {
    fireEvent(element, 'accessibilityAction', { nativeEvent: { actionName: 'activate' } });
  });
}
