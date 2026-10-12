Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true });
import React from 'react';
import { act, create, type ReactTestRenderer } from 'react-test-renderer';
import MonthPicker from '../MonthPicker';
import FilterChip from '../FilterChip';
import { SettingsHomeRow } from '../../features/settings/components/SettingsHomeRows';
jest.mock('react-native', () => ({
  Modal: 'Modal',
  Pressable: 'Button',
  ScrollView: 'ScrollView',
  TouchableOpacity: 'Button',
  Text: 'Text',
  View: 'View',
  StyleSheet: { create: (styles: object) => styles },
  Animated: { Value: class {}, View: 'AnimatedView', spring: () => ({ start: jest.fn() }) },
}));
jest.mock('@expo/vector-icons', () => ({ Ionicons: 'Icon' }));
jest.mock('../AuthenticatedPetAvatar', () => 'Avatar');
let screen: ReactTestRenderer;
const label = (value: string) =>
  screen.root.find(
    (node) => node.type === ('Button' as never) && node.props.accessibilityLabel === value,
  );
afterEach(async () => {
  if (screen) await act(async () => screen.unmount());
});
test('shared month picker selects a stable year-month and closes', async () => {
  const onChange = jest.fn();
  const onClose = jest.fn();
  await act(async () => {
    screen = create(<MonthPicker visible month="2026-10" onChange={onChange} onClose={onClose} />);
  });
  expect(label('選擇 2026 年 10 月').props.accessibilityState.selected).toBe(true);
  await act(async () => label('選擇 2026 年 3 月').props.onPress());
  expect(onChange).toHaveBeenCalledWith('2026-03');
  expect(onClose).toHaveBeenCalledTimes(1);
});
test('shared filter reports its selection and invokes the filter action', async () => {
  const onPress = jest.fn();
  await act(async () => {
    screen = create(<FilterChip label="體重" selected onPress={onPress} />);
  });
  expect(label('體重').props.accessibilityState.selected).toBe(true);
  label('體重').props.onPress();
  expect(onPress).toHaveBeenCalledTimes(1);
});
test('long setting descriptions are rendered without a line truncation limit', async () => {
  await act(async () => {
    screen = create(
      <SettingsHomeRow
        title="手機權限與提醒"
        description="通知、相簿、相機與定位"
        onPress={jest.fn()}
      />,
    );
  });
  const text = screen.root.find(
    (node) => node.type === ('Text' as never) && node.props.children === '通知、相簿、相機與定位',
  );
  expect(text.props.numberOfLines).toBeUndefined();
  expect(label('手機權限與提醒，通知、相簿、相機與定位')).toBeTruthy();
});
