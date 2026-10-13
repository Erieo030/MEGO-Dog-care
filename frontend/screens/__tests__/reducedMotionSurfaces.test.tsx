Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true });
import React from 'react';
import { act, create, type ReactTestRenderer } from 'react-test-renderer';
import LoginScreen from '../LoginScreen';
import SupplementalNotesField from '../../components/SupplementalNotesField';
let mockReduced = true;
let mockAppStateChange: (state: string) => void;
const mockStart = jest.fn();
const mockStop = jest.fn();
const mockTiming: jest.Mock = jest.fn(() => ({ start: mockStart, stop: mockStop }));
jest.mock('../../hooks/usePressFeedback', () => ({ useReducedMotion: () => mockReduced }));
jest.mock('../../assets/artwork/auth/login-dog-v1.webp', () => 1);
jest.mock('../../assets/artwork/auth/login-paw-v1.webp', () => 1);
jest.mock('react-native', () => ({
  Text: 'Text',
  TextInput: 'Input',
  TouchableOpacity: 'Button',
  View: 'View',
  ScrollView: 'Scroll',
  Modal: 'Modal',
  Pressable: 'Button',
  KeyboardAvoidingView: 'KeyboardView',
  Platform: { OS: 'ios' },
  Alert: { alert: jest.fn() },
  Keyboard: { addListener: () => ({ remove: jest.fn() }), dismiss: jest.fn() },
  AppState: {
    currentState: 'active',
    addEventListener: (_event: string, callback: (state: string) => void) => {
      mockAppStateChange = callback;
      return { remove: jest.fn() };
    },
  },
  StyleSheet: { create: (x: object) => x },
  Animated: {
    Value: class {
      setValue() {}
      stopAnimation() {}
      interpolate() {
        return 0;
      }
    },
    View: 'AnimatedView',
    Image: 'AnimatedImage',
    add: () => 0,
    timing: (...args: unknown[]) => mockTiming(...args),
    loop: () => ({ start: mockStart, stop: mockStop }),
    sequence: () => ({ start: mockStart, stop: mockStop }),
  },
}));
jest.mock('react-native-safe-area-context', () => ({
  SafeAreaView: 'Safe',
  useSafeAreaInsets: () => ({ bottom: 0 }),
}));
jest.mock('@expo/vector-icons', () => ({ Ionicons: 'Icon' }));
let screen: ReactTestRenderer;
beforeEach(() => {
  jest.clearAllMocks();
  mockReduced = true;
});
afterEach(async () => {
  if (screen) await act(async () => screen.unmount());
});
test('reduced-motion login renders a static illustration without starting loops', async () => {
  await act(async () => {
    screen = create(<LoginScreen onLoginSuccess={jest.fn()} onGoToRegister={jest.fn()} />);
  });
  expect(mockTiming).not.toHaveBeenCalled();
  const dog = screen.root.find(
    (node) =>
      node.type === ('AnimatedImage' as never) && node.props.accessibilityLabel === '友善狗狗插畫',
  );
  expect(dog.props.style.at(-1)).toMatchObject({ opacity: 1, transform: [] });
});
test('ordinary login animation stops when the app moves to the background', async () => {
  mockReduced = false;
  await act(async () => {
    screen = create(<LoginScreen onLoginSuccess={jest.fn()} onGoToRegister={jest.fn()} />);
  });
  expect(mockStart).toHaveBeenCalled();
  await act(async () => mockAppStateChange('background'));
  expect(mockStop).toHaveBeenCalled();
});
test('reduced-motion notes open immediately without spatial entrance', async () => {
  await act(async () => {
    screen = create(<SupplementalNotesField value="" onChange={jest.fn()} />);
  });
  const open = screen.root.find(
    (node) => node.type === ('Button' as never) && node.props.accessibilityLabel === '編輯補充備註',
  );
  await act(async () => open.props.onPress());
  expect(mockTiming).not.toHaveBeenCalled();
  const card = screen.root
    .findAllByType('AnimatedView' as never)
    .find((node) => Array.isArray(node.props.style) && node.props.style.at(-1).transform)!;
  expect(card.props.style.at(-1)).toMatchObject({ opacity: 1, transform: [] });
});
