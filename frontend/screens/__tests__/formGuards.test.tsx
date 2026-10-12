Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true });
import React from 'react';
import { act, create, type ReactTestRenderer } from 'react-test-renderer';
import { Alert } from 'react-native';
import { guardTabNavigation } from '../../hooks/useUnsavedChangesGuard';
import MedicalVisitFormScreen from '../MedicalVisitFormScreen';
import StoolHealthEventScreen from '../StoolHealthEventScreen';
import VomitingHealthEventScreen from '../VomitingHealthEventScreen';
import ObservationHealthEventScreen from '../ObservationHealthEventScreen';
import CreateHealthEventScreen from '../CreateHealthEventScreen';
import HealthEventEditScreen from '../HealthEventEditScreen';
import PetFormScreen from '../PetFormScreen';
import { emptyPetData } from '../../types';
import WeightFormScreen from '../WeightFormScreen';
import CreateReminderScreen from '../CreateReminderScreen';
import PetMemorialScreen from '../../features/pets/screens/PetMemorialScreen';
import { LostPetSettingsScreen } from '../../features/pet-identity/screens/PetIdentityScreens';
import { VaccinationFormScreen } from '../../features/vaccinations/screens/VaccinationFormScreen';
import { DewormingFormScreen } from '../../features/dewormings/screens/DewormingFormScreen';
import { MedicationFormScreen } from '../../features/medications/screens/MedicationFormScreen';
let mockRoute: { params: object } = { params: {} };
const mockPet = { id: 'p1', name: '小米' };
const mockNavigation = {
  dispatch: jest.fn(),
  navigate: jest.fn(),
  goBack: jest.fn(),
  replace: jest.fn(),
  setParams: jest.fn(),
  popToTop: jest.fn(),
};
let mockFocus = 0;
jest.mock('react-native', () => ({
  ActivityIndicator: 'ActivityIndicator',
  Image: 'Image',
  ScrollView: 'ScrollView',
  KeyboardAvoidingView: 'KeyboardAvoidingView',
  Pressable: 'Button',
  Platform: { OS: 'ios' },
  Alert: { alert: jest.fn() },
  Switch: 'Switch',
  Text: 'Text',
  TextInput: 'Input',
  TouchableOpacity: 'Button',
  View: 'View',
  StyleSheet: { create: (styles: object) => styles, hairlineWidth: 1 },
}));
jest.mock('@react-navigation/native', () => {
  const react = jest.requireActual('react');
  return {
    useNavigation: () => mockNavigation,
    useRoute: () => mockRoute,
    usePreventRemove: jest.fn(),
    useFocusEffect: (callback: () => void) => react.useEffect(callback, [callback, mockFocus]),
  };
});
jest.mock('react-native-safe-area-context', () => ({ SafeAreaView: 'SafeAreaView' }));
jest.mock('@expo/vector-icons', () => ({ Ionicons: 'Icon' }));
jest.mock('../../contexts/AuthContext', () => ({ useAuth: () => ({ session: { userId: 'u1' } }) }));
jest.mock('../../contexts/PetContext', () => ({
  usePet: () => ({ selectedPet: mockPet, pets: [mockPet] }),
}));
jest.mock('../../components/navigation/useTabContentBottomPadding', () => ({
  useTabContentBottomPadding: () => 96,
}));
jest.mock('../../components/RecordActionButton', () => ({
  RecordActionButton: 'RecordActionButton',
}));
jest.mock('../../components/AuthenticatedPetAvatar', () => 'Avatar');
jest.mock('../../features/pets/components/PetAvatarPicker', () => 'AvatarPicker');
jest.mock('../../features/pets/components/PetFormTextField', () => 'PetField');
jest.mock('react-native-qrcode-svg', () => 'QRCode');
jest.mock('../../contexts/SettingsContext', () => ({
  useSettings: () => ({ settings: { defaultReminderTime: '08:00' } }),
}));
jest.mock('../../services/vaccinationService', () => ({
  createVaccination: jest.fn(),
  updateVaccination: jest.fn(),
}));
jest.mock('../../services/dewormingService', () => ({
  createDeworming: jest.fn(),
  updateDeworming: jest.fn(),
}));
jest.mock('../../services/medicationService', () => ({
  createMedication: jest.fn(),
  updateMedication: jest.fn(),
}));
jest.mock('../../services/weightService', () => ({
  createWeight: jest.fn(),
  updateWeight: jest.fn(),
}));
jest.mock('../../services/reminderService', () => ({
  createReminder: jest.fn(),
  updateReminder: jest.fn(),
}));
jest.mock('../../services/lostPetService', () => ({
  getLostProfile: jest.fn().mockResolvedValue({ profile: null }),
  saveLostProfile: jest.fn(),
}));
jest.mock('../../components/AppButton', () => ({ AppButton: 'AppButton' }));
jest.mock('../../components/AttachmentPicker', () => 'Attachments');
jest.mock('../../components/SupplementalNotesField', () => 'Notes');
jest.mock('../../components/DatePickerField', () => 'DatePicker');
jest.mock('../../components/KeyboardAwareScrollView', () => 'ScrollView');
jest.mock('../../services/medicalVisitService', () => ({
  createMedicalVisit: jest.fn(),
  updateMedicalVisit: jest.fn(),
}));
jest.mock('../../services/notificationService', () => ({
  reconcileAccountNotifications: jest.fn().mockResolvedValue(undefined),
}));
jest.mock('../../services/healthEventService', () => ({
  getHealthEvent: jest.fn().mockResolvedValue({
    id: 'event',
    petId: 'p1',
    type: 'other',
    summary: '紀錄',
    occurredAt: '2026-10-01T12:00:00Z',
    severity: 'mild',
    notes: '原備註',
    details: {},
    attachments: [],
  }),
}));
let screen: ReactTestRenderer;
const cases = [
  ['就醫', MedicalVisitFormScreen, {}],
  ['排便異常', StoolHealthEventScreen, {}],
  ['嘔吐', VomitingHealthEventScreen, {}],
  ['觀察異常', ObservationHealthEventScreen, { type: 'low_appetite' }],
  ['通用健康異常', CreateHealthEventScreen, { type: 'other', label: '其他' }],
  ['健康異常編輯', HealthEventEditScreen, { eventId: 'event' }],
  ['毛孩', PetFormScreen, {}],
  ['疫苗', VaccinationFormScreen, {}],
  ['驅蟲', DewormingFormScreen, {}],
  ['用藥', MedicationFormScreen, {}],
  ['體重', WeightFormScreen, {}],
  ['提醒', CreateReminderScreen, {}],
  ['紀念文字', PetMemorialScreen, {}],
  ['身份 QR 公開設定', LostPetSettingsScreen, {}],
] as const;
function choose(text: string) {
  const calls = (Alert.alert as jest.Mock).mock.calls;
  return calls
    .at(-1)[2]
    .find((item: { text: string }) => item.text === text)
    .onPress();
}
beforeEach(() => {
  jest.clearAllMocks();
  mockFocus = 0;
});
afterEach(async () => {
  if (screen) await act(async () => screen.unmount());
});
test.each(cases)(
  '%s form preserves edits until discard is confirmed',
  async (_name, Component, params) => {
    mockRoute = { params };
    await act(async () => {
      screen = create(
        React.createElement(Component as unknown as React.ComponentType<Record<string, unknown>>, {
          navigation: mockNavigation,
          route: { params },
          title: '毛孩',
          submitLabel: '儲存',
          onSubmit: jest.fn(),
        }),
      );
    });
    expect(guardTabNavigation(jest.fn())).toBe(false);
    if (Component === VomitingHealthEventScreen) {
      const expand = screen.root.find(
        (node) =>
          node.type === ('Button' as never) &&
          node.findAll(
            (child) => child.type === ('Text' as never) && child.props.children === '補充更多資訊',
          ).length > 0,
      );
      await act(async () => expand.props.onPress());
    }
    const editable = () =>
      Component === PetFormScreen
        ? screen.root
            .findAllByType('PetField' as never)
            .find((node) => node.props.field.key === 'allergies')!
        : Component === PetMemorialScreen
          ? screen.root.find(
              (node) =>
                node.type === ('Input' as never) &&
                node.props.accessibilityLabel === '想對牠說的話',
            )
          : screen.root.findAllByType('Notes' as never).at(-1)!;
    const original = editable().props.value;
    await act(async () =>
      (editable().props.onChange || editable().props.onChangeText)('尚未儲存的修改'),
    );
    const proceed = jest.fn();
    expect(guardTabNavigation(proceed)).toBe(true);
    expect(proceed).not.toHaveBeenCalled();
    await act(async () => choose('繼續編輯'));
    expect(editable().props.value).toBe('尚未儲存的修改');
    guardTabNavigation(proceed);
    await act(async () => choose('放棄變更'));
    expect(proceed).toHaveBeenCalledTimes(1);
    expect(editable().props.value).toBe(original);
  },
);

test.each([
  [
    '疫苗',
    VaccinationFormScreen,
    { vaccineName: '疫苗', administeredAt: '2026-10-01', notes: '上一筆備註' },
  ],
  [
    '驅蟲',
    DewormingFormScreen,
    { productName: '產品', administeredAt: '2026-10-01', notes: '上一筆備註' },
  ],
  [
    '用藥',
    MedicationFormScreen,
    { name: '藥袋名稱', startDate: '2026-10-01', reminderTimes: [], notes: '上一筆備註' },
  ],
] as const)(
  '%s copy forms do not become dirty merely from prefilled data',
  async (_name, Component, record) => {
    mockRoute = { params: { record, duplicate: true } };
    await act(async () => {
      screen = create(
        React.createElement(Component as React.ComponentType<Record<string, unknown>>),
      );
    });
    expect(guardTabNavigation(jest.fn())).toBe(false);
    expect(screen.root.findAllByType('Notes' as never).at(-1)!.props.value).toBe('上一筆備註');
  },
);

test.each([true, false])(
  'pet save result %s only clears the guard on actual success',
  async (success) => {
    const onSubmit = jest.fn().mockResolvedValue(success);
    const onSaved = jest.fn();
    await act(async () => {
      screen = create(
        <PetFormScreen
          title="毛孩"
          submitLabel="儲存"
          initialData={{
            ...emptyPetData,
            name: '小米',
            gender: 'female',
            breed: '柴犬',
            arrivalDate: '2024-01-01',
          }}
          onSubmit={onSubmit}
          onSaved={onSaved}
        />,
      );
    });
    const field = screen.root
      .findAllByType('PetField' as never)
      .find((node) => node.props.field.key === 'allergies')!;
    await act(async () => field.props.onChange('新備註'));
    await act(async () => screen.root.findByType('AppButton' as never).props.onPress());
    expect(onSubmit).toHaveBeenCalledTimes(1);
    expect(onSaved).toHaveBeenCalledTimes(success ? 1 : 0);
    const blocked = guardTabNavigation(jest.fn());
    expect(blocked).toBe(!success);
    if (blocked) await act(async () => choose('繼續編輯'));
  },
);
