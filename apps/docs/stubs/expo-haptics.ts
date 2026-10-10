// Haptics do nothing on the web. Kinetik's useHaptic already skips them there;
// this stub keeps expo-haptics' native module code out of the browser bundle.
const resolved = () => Promise.resolve();
export const selectionAsync = resolved;
export const impactAsync = resolved;
export const notificationAsync = resolved;
export const ImpactFeedbackStyle = { Light: 'light', Medium: 'medium', Heavy: 'heavy' } as const;
export const NotificationFeedbackType = {
  Success: 'success',
  Warning: 'warning',
  Error: 'error',
} as const;
