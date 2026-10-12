Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true });
import React from 'react';
import { act, create, type ReactTestRenderer } from 'react-test-renderer';
import DatePickerField from '../DatePickerField';
import { Alert } from 'react-native';
import { taipeiDateKey, formatTaipeiTime } from '../../utils/taipeiDate';
jest.mock('react-native', () => ({
  Alert: { alert: jest.fn() },
  Modal: 'Modal',
  ScrollView: 'ScrollView',
  Text: 'Text',
  TouchableOpacity: 'Button',
  View: 'View',
  StyleSheet: { create: (styles: object) => styles },
}));
jest.mock('@expo/vector-icons', () => ({ Ionicons: 'Icon' }));
let screen: ReactTestRenderer;
const onChange = jest.fn();
const button = (label: string) =>
  screen.root.find(
    (node) => node.type === ('Button' as never) && node.props.accessibilityLabel === label,
  );
async function mount(
  mode: 'date' | 'datetime' | 'time',
  value: Date,
  minimumDate?: Date,
  maximumDate?: Date,
) {
  await act(async () => {
    screen = create(
      <DatePickerField
        label="日期"
        mode={mode}
        value={value}
        minimumDate={minimumDate}
        maximumDate={maximumDate}
        onChange={onChange}
      />,
    );
  });
  const field = screen.root.find(
    (node) => node.type === ('Button' as never) && node.props.accessibilityHint,
  );
  await act(async () => {
    field.props.onPress();
    jest.runOnlyPendingTimers();
  });
}
beforeEach(() => {
  jest.useFakeTimers();
  jest.clearAllMocks();
});
afterEach(async () => {
  if (screen) await act(async () => screen.unmount());
  jest.useRealTimers();
});
test('calendar clamps the initial value, labels full dates and announces selected state', async () => {
  const minimum = new Date('2026-10-03T15:00:00+08:00');
  await mount('date', new Date('2026-10-01T12:00:00+08:00'), minimum);
  expect(button('2026 年 10 月 3 日').props.accessibilityState.selected).toBe(true);
  expect(button('2026 年 10 月 2 日').props.accessibilityState.disabled).toBe(true);
  await act(async () => button('確認日期').props.onPress());
  expect(taipeiDateKey(onChange.mock.calls[0][0])).toBe('2026-10-03');
});
test('minutes move by five and support quarter-hour shortcuts', async () => {
  await mount('time', new Date('2026-10-03T12:07:00+08:00'));
  await act(async () => button('增加五分鐘').props.onPress());
  await act(async () => button('確認時間').props.onPress());
  expect(formatTaipeiTime(onChange.mock.calls[0][0])).toBe('12:12');
});
test('quarter-hour choice is confirmed explicitly', async () => {
  await mount('time', new Date('2026-10-03T12:07:00+08:00'));
  await act(async () => button('設為 45 分鐘').props.onPress());
  await act(async () => button('確認時間').props.onPress());
  expect(formatTaipeiTime(onChange.mock.calls[0][0])).toBe('12:45');
});
test('final datetime confirmation refuses an out-of-range time', async () => {
  const minimum = new Date('2026-10-03T15:00:00+08:00');
  await mount('datetime', minimum, minimum);
  await act(async () => button('確認日期').props.onPress());
  await act(async () => button('減少一小時').props.onPress());
  await act(async () => button('確認時間').props.onPress());
  expect(onChange).not.toHaveBeenCalled();
  expect(Alert.alert).toHaveBeenCalledWith('時間超出範圍', expect.any(String));
});

test('birthdays before 2000 display and confirm without being reset to today', async () => {
  await mount('date', new Date('1999-03-10T12:00:00+08:00'));
  expect(button('1999 年 3 月 10 日').props.accessibilityState.selected).toBe(true);
  expect(onChange).not.toHaveBeenCalled();
  await act(async () => button('確認日期').props.onPress());
  expect(taipeiDateKey(onChange.mock.calls[0][0])).toBe('1999-03-10');
});

test('time selection preserves 02:30 even when it is a device daylight-saving gap', async () => {
  await mount('time', new Date('2026-03-08T02:30:00+08:00'));
  await act(async () => button('確認時間').props.onPress());
  expect(formatTaipeiTime(onChange.mock.calls[0][0])).toBe('02:30');
});

test('changing a calendar draft and cancelling does not populate the field', async () => {
  await mount('date', new Date('1999-03-10T12:00:00+08:00'));
  await act(async () => button('1999 年 3 月 11 日').props.onPress());
  await act(async () => button('取消選擇').props.onPress());
  expect(onChange).not.toHaveBeenCalled();
  const modal = screen.root.find((node) => node.type === ('Modal' as never));
  expect(modal.props.visible).toBe(false);
});

test('datetime display and confirmation use Taipei time at a UTC date boundary', async () => {
  await mount('datetime', new Date('2026-09-30T16:30:00Z'));
  expect(button('2026 年 10 月 1 日').props.accessibilityState.selected).toBe(true);
  await act(async () => button('確認日期').props.onPress());
  await act(async () => button('確認時間').props.onPress());
  expect(onChange.mock.calls[0][0].toISOString()).toBe('2026-09-30T16:30:00.000Z');
});
