jest.mock('@react-navigation/native', () => ({ useNavigation: () => ({ goBack: jest.fn() }) }));
Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true });
import React from 'react';
import { act, create, type ReactTestRenderer } from 'react-test-renderer';
import MedicalVisitFormScreen from '../MedicalVisitFormScreen';
import { createMedicalVisit } from '../../services/medicalVisitService';
const mockScrollTo = jest.fn();
const mockPet = { id: 'p1', name: '小米' };
const mockNavigation = { navigate: jest.fn(), goBack: jest.fn(), setParams: jest.fn() };
jest.mock('react-native', () => ({
  Alert: { alert: jest.fn() },
  Switch: 'Switch',
  Text: 'Text',
  TextInput: 'Input',
  TouchableOpacity: 'Button',
  Pressable: 'Button',
  View: 'View',
  StyleSheet: { create: (styles: object) => styles },
}));
jest.mock('react-native-safe-area-context', () => ({ SafeAreaView: 'SafeAreaView' }));
jest.mock('@expo/vector-icons', () => ({ Ionicons: 'Icon' }));
jest.mock('../../contexts/AuthContext', () => ({ useAuth: () => ({ session: { userId: 'u1' } }) }));
jest.mock('../../contexts/PetContext', () => ({
  usePet: () => ({ selectedPet: mockPet, pets: [mockPet] }),
}));
jest.mock('../../components/navigation/useTabContentBottomPadding', () => ({
  useTabContentBottomPadding: () => 96,
}));
jest.mock('../../components/AppButton', () => ({ AppButton: 'AppButton' }));
jest.mock('../../components/AttachmentPicker', () => 'AttachmentPicker');
jest.mock('../../components/SupplementalNotesField', () => 'Notes');
jest.mock('../../components/DatePickerField', () => 'DatePicker');
jest.mock('../../components/KeyboardAwareScrollView', () => {
  const react = jest.requireActual('react');
  return react.forwardRef((props: { children: React.ReactNode }, ref: React.Ref<unknown>) => {
    react.useImperativeHandle(ref, () => ({ scrollTo: mockScrollTo }));
    return react.createElement('ScrollView', props, props.children);
  });
});
jest.mock('../../services/medicalVisitService', () => ({
  createMedicalVisit: jest.fn(),
  updateMedicalVisit: jest.fn(),
}));
jest.mock('../../services/notificationService', () => ({
  reconcileAccountNotifications: jest.fn().mockResolvedValue(undefined),
}));
let screen: ReactTestRenderer;
const submit = () => screen.root.findByType('AppButton' as never).props.onPress();
beforeEach(() => {
  jest.clearAllMocks();
  global.requestAnimationFrame = (callback) => {
    callback(0);
    return 0;
  };
});
afterEach(async () => {
  if (screen) await act(async () => screen.unmount());
});
async function mount() {
  await act(async () => {
    screen = create(
      <MedicalVisitFormScreen
        navigation={mockNavigation as never}
        route={{ params: {} } as never}
      />,
    );
  });
}
test('invalid reason displays an inline error and scrolls to that field without submitting', async () => {
  await mount();
  const positioned = screen.root.findAll(
    (node) => node.type === ('View' as never) && node.props.onLayout,
  );
  positioned[1].props.onLayout({ nativeEvent: { layout: { y: 180 } } });
  await act(async () => submit());
  expect(
    screen.root
      .findAll(
        (node) => node.type === ('Text' as never) && node.props.accessibilityRole === 'alert',
      )
      .map((node) => node.props.children),
  ).toContain('請填寫看診原因');
  expect(mockScrollTo).toHaveBeenCalledWith({ y: 164, animated: false });
  expect(createMedicalVisit).not.toHaveBeenCalled();
});
test('correcting the reason clears validation errors and saves', async () => {
  await mount();
  await act(async () => submit());
  const input = screen.root.find(
    (node) =>
      node.type === ('Input' as never) && node.props.accessibilityLabel === '看診原因（必填）',
  );
  await act(async () => input.props.onChangeText('例行檢查'));
  await act(async () => submit());
  expect(createMedicalVisit).toHaveBeenCalledWith(
    'u1',
    'p1',
    expect.objectContaining({ reason: '例行檢查' }),
  );
  expect(
    screen.root.findAll(
      (node) => node.type === ('Text' as never) && node.props.accessibilityRole === 'alert',
    ),
  ).toHaveLength(0);
});

jest.mock('../../hooks/useFormUnsavedChangesGuard', () => ({
  useFormUnsavedChangesGuard: () => ({ markSaved: jest.fn() }),
}));
