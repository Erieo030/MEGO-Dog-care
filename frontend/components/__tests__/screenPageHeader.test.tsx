Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true });
import React from 'react';
import { act, create, type ReactTestRenderer } from 'react-test-renderer';
import { ScreenPageHeader, ScreenPageState } from '../ScreenPageHeader';
const mockGoBack = jest.fn();
jest.mock('@react-navigation/native', () => ({ useNavigation: () => ({ goBack: mockGoBack }) }));
jest.mock('react-native', () => ({
  Text: 'Text',
  View: 'View',
  Pressable: 'Button',
  StyleSheet: { create: (styles: object) => styles },
}));
jest.mock('react-native-safe-area-context', () => ({ SafeAreaView: 'SafeAreaView' }));
jest.mock('@expo/vector-icons', () => ({ Ionicons: 'Icon' }));
let screen: ReactTestRenderer;
beforeEach(() => jest.clearAllMocks());
afterEach(async () => {
  if (screen) await act(async () => screen.unmount());
});
test('page header exposes a labeled 44-unit back button and delegates navigation', async () => {
  await act(async () => {
    screen = create(<ScreenPageHeader title="就醫紀錄" />);
  });
  const back = screen.root.findByType('Button' as never);
  expect(back.props.accessibilityRole).toBe('button');
  expect(back.props.accessibilityLabel).toBe('返回上一頁');
  const style = back.props.style({ pressed: false });
  expect(style).toEqual(
    expect.arrayContaining([expect.objectContaining({ width: 44, minHeight: 44 })]),
  );
  await act(async () => back.props.onPress());
  expect(mockGoBack).toHaveBeenCalledTimes(1);
});
test.each(['載入中', '載入失敗', '找不到紀錄'])(
  'state %s retains top safe area and visible back action',
  async (state) => {
    await act(async () => {
      screen = create(
        <ScreenPageState title="疫苗紀錄">
          <>{state}</>
        </ScreenPageState>,
      );
    });
    expect(screen.root.findByType('SafeAreaView' as never).props.edges).toEqual([
      'top',
      'left',
      'right',
    ]);
    await act(async () => screen.root.findByType('Button' as never).props.onPress());
    expect(mockGoBack).toHaveBeenCalledTimes(1);
  },
);
