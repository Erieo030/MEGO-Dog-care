Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true });
import React from 'react';
import { act, create } from 'react-test-renderer';
import { Alert, Linking } from 'react-native';
import { AIChatMessageBubble } from '../components/AIChatContent';
jest.mock('react-native', () => ({
  Alert: { alert: jest.fn() },
  Linking: { openURL: jest.fn().mockRejectedValue(new Error('unavailable')) },
  Text: 'Text',
  View: 'View',
  TouchableOpacity: 'Button',
  StyleSheet: { create: (styles: object) => styles },
}));
jest.mock('@expo/vector-icons', () => ({ Ionicons: 'Icon' }));
jest.mock('../components/AIChatMarkdown', () => ({ AIChatMarkdown: 'Markdown' }));
test('a failed reference link shows actionable feedback instead of disappearing silently', async () => {
  let screen: ReturnType<typeof create>;
  await act(async () => {
    screen = create(
      <AIChatMessageBubble
        item={
          {
            role: 'assistant',
            text: '照護資料',
            knowledgeSources: [
              {
                url: 'https://example.com/source',
                title: '來源',
                section: '照護',
                documentTitle: '資料',
              },
            ],
          } as never
        }
      />,
    );
  });
  const link = screen!.root.find(
    (node) => node.type === ('Button' as never) && node.props.accessibilityRole === 'link',
  );
  await act(async () => link.props.onPress());
  expect(Linking.openURL).toHaveBeenCalledWith('https://example.com/source');
  expect(Alert.alert).toHaveBeenCalledWith('無法開啟參考資料', '請稍後再試。');
  await act(async () => screen!.unmount());
});
