import { ScreenPageHeader, ScreenPageFrame } from '../../../components/ScreenPageHeader';
import { useFormUnsavedChangesGuard } from '../../../hooks/useFormUnsavedChangesGuard';
/**
 * 用途：新增、編輯與複製用藥療程。
 * 表單型別：../types.ts
 * API：../../../services/medicationService.ts
 */
import React, { useRef, useState } from 'react';
import { Alert, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import type { RouteProp } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { AppButton } from '../../../components/AppButton';
import { RecordActionButton } from '../../../components/RecordActionButton';
import SupplementalNotesField from '../../../components/SupplementalNotesField';
import { Colors } from '../../../constants/Colors';
import DatePickerField from '../../../components/DatePickerField';
import KeyboardAwareScrollView from '../../../components/KeyboardAwareScrollView';
import { showQuickRecordFeedback } from '../../../utils/quickRecordFeedback';
import { useTabContentBottomPadding } from '../../../components/navigation/useTabContentBottomPadding';
import { useAuth } from '../../../contexts/AuthContext';
import { usePet } from '../../../contexts/PetContext';
import type { HomeStackParamList } from '../../../navigation/types';
import { createMedication, updateMedication } from '../../../services/medicationService';
import type { MedicationCourse, MedicationMealTiming } from '../../../types';
import { medicationStyles as styles } from '../medicationStyles';
import { createMedicationDraft, mealTimingLabels, timeValue, type MedicationDraft } from '../types';
import { taipeiDateKey, taipeiDateFromKey, formatTaipeiTime } from '../../../utils/taipeiDate';

const fields = [
  ['name', '藥品名稱（必填）'],
  ['startDate', '開始日期（必填）'],
  ['endDate', '結束日期（選填）'],
  ['instructions', '使用說明／每次用量（選填）'],
  ['timesPerDay', '每日次數（必填）'],
  ['notes', '補充備註'],
] as const;

export function MedicationFormScreen() {
  const bottomContentPadding = useTabContentBottomPadding(24, true);
  const { session } = useAuth();
  const { selectedPet } = usePet();
  const route = useRoute<RouteProp<HomeStackParamList, 'MedicationForm'>>();
  const navigation = useNavigation<NativeStackNavigationProp<HomeStackParamList>>();
  const existing = route.params?.record as MedicationCourse | undefined;
  const duplicate = route.params?.duplicate === true;
  const quickEntry = route.params?.quickEntry === true;
  const [draft, setDraft] = useState<MedicationDraft>(() =>
    createMedicationDraft(existing, duplicate),
  );
  const saveLock = useRef(false);
  const [saving, setSaving] = useState(false);
  const { markSaved } = useFormUnsavedChangesGuard(draft, setDraft);
  const [editingReminderTime, setEditingReminderTime] = useState<string | null>(null);
  const setField = <Key extends keyof MedicationDraft>(key: Key, value: MedicationDraft[Key]) =>
    setDraft((current) => ({ ...current, [key]: value }));

  const save = async () => {
    if (!session?.userId || !selectedPet || saveLock.current) return;
    if (!draft.name.trim()) {
      Alert.alert('請填寫藥名');
      return;
    }
    if (draft.startDate && draft.endDate && draft.endDate < draft.startDate) {
      Alert.alert('日期順序錯誤', '結束日期不能早於開始日期。');
      return;
    }

    if (!Number.isInteger(draft.timesPerDay) || draft.timesPerDay < 1 || draft.timesPerDay > 6) {
      Alert.alert('每日次數須為 1–6 次');
      return;
    }
    const reminderTimes = [...new Set(draft.reminderTimes)];
    saveLock.current = true;
    setSaving(true);
    try {
      const payload = {
        name: draft.name.trim(),
        instructions: draft.instructions.trim(),
        timesPerDay: draft.timesPerDay,
        startDate: draft.startDate,
        endDate: draft.endDate || '',
        mealTiming: draft.mealTiming,
        notes: draft.notes.trim(),
        status: draft.status,
        reminderTimes,
        reminderEnabled: reminderTimes.length > 0,
        medicalVisitId: draft.medicalVisitId,
      };
      const response =
        existing && !duplicate
          ? await updateMedication(session.userId, existing.id, payload)
          : await createMedication(session.userId, selectedPet.id, payload);
      markSaved(draft);
      if (quickEntry) {
        showQuickRecordFeedback({
          message: '用藥紀錄已儲存，完整內容可到「紀錄」查看。',
          onDone: () => navigation.popToTop(),
          onAddAnother: () => navigation.replace('MedicationForm', { quickEntry: true }),
        });
      } else {
        Alert.alert('已儲存', existing && !duplicate ? '用藥紀錄已更新' : '用藥紀錄已新增');
        markSaved(draft, () =>
          navigation.replace('MedicationDetail', { recordId: response.record.id }),
        );
      }
    } catch (caught) {
      Alert.alert('儲存失敗', (caught as Error).message);
    } finally {
      saveLock.current = false;
      setSaving(false);
    }
  };

  return (
    <ScreenPageFrame>
      <KeyboardAwareScrollView
        contentContainerStyle={[styles.page, { paddingBottom: bottomContentPadding }]}
      >
        <ScreenPageHeader
          style={styles.formIntro}
          title={existing && !duplicate ? '編輯用藥' : '新增用藥療程'}
          description="依獸醫指示記下療程"
          icon="medical-outline"
        />

        {fields
          .filter(([key]) => key !== 'notes')
          .map(([key, label]) => {
            const isDate = key === 'startDate' || key === 'endDate';
            if (isDate) {
              const value = draft[key];
              return (
                <DatePickerField
                  key={key}
                  label={label}
                  value={value ? taipeiDateFromKey(value) : undefined}
                  onChange={(date) => setField(key, taipeiDateKey(date))}
                  minimumDate={
                    key === 'endDate' && draft.startDate
                      ? taipeiDateFromKey(draft.startDate)
                      : undefined
                  }
                  maximumDate={key === 'startDate' ? new Date() : undefined}
                />
              );
            }
            if (key === 'timesPerDay')
              return (
                <View key={key}>
                  <Text style={styles.label}>{label}：1–6 次</Text>
                  <View style={styles.options}>
                    {[1, 2, 3, 4, 5, 6].map((count) => (
                      <TouchableOpacity
                        key={count}
                        accessibilityRole="radio"
                        accessibilityLabel={`每日 ${count} 次`}
                        accessibilityState={{ selected: draft.timesPerDay === count }}
                        style={[styles.chip, draft.timesPerDay === count && styles.selected]}
                        onPress={() => setField('timesPerDay', count)}
                      >
                        <Text>{count} 次</Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                </View>
              );
            return (
              <View key={key}>
                <Text style={styles.label}>{label}</Text>
                <TextInput
                  style={styles.input}
                  placeholder={`請輸入${label.replace('（必填）', '')}`}
                  placeholderTextColor={Colors.subtext}
                  value={String(draft[key] ?? '')}
                  accessibilityLabel={label}
                  onChangeText={(value) => setField(key, value)}
                />
              </View>
            );
          })}
        <SupplementalNotesField
          value={String(draft.notes ?? '')}
          onChange={(value) => setField('notes', value)}
        />

        <Text style={styles.section}>服用方式</Text>
        <View style={styles.options}>
          {(Object.keys(mealTimingLabels) as MedicationMealTiming[]).map((key) => (
            <TouchableOpacity
              key={key}
              style={[styles.chip, draft.mealTiming === key && styles.selected]}
              onPress={() => setField('mealTiming', key)}
            >
              <Text>{mealTimingLabels[key]}</Text>
            </TouchableOpacity>
          ))}
        </View>

        <DatePickerField
          label="每天提醒時間（選填）"
          mode="time"
          value={timeValue(draft.reminderTimeDraft || draft.reminderTimes[0])}
          onChange={(date) => {
            const next = formatTaipeiTime(date);
            setDraft((current) => ({
              ...current,
              reminderTimes: [
                ...new Set(
                  editingReminderTime
                    ? current.reminderTimes.map((item) =>
                        item === editingReminderTime ? next : item,
                      )
                    : [...current.reminderTimes, next],
                ),
              ],
              reminderTimeDraft: '',
            }));
            setEditingReminderTime(null);
          }}
        />
        {draft.reminderTimes.map((time) => (
          <View key={time} style={styles.reminderRow}>
            <Text style={styles.reminderHint}>每天 {time}</Text>
            <RecordActionButton
              kind="edit"
              label="編輯"
              style={styles.reminderAction}
              onPress={() => {
                setEditingReminderTime(time);
                setField('reminderTimeDraft', time);
              }}
            />
            <RecordActionButton
              kind="delete"
              label="刪除"
              style={styles.reminderAction}
              onPress={() => {
                setDraft((current) => ({
                  ...current,
                  reminderTimes: current.reminderTimes.filter((item) => item !== time),
                  reminderTimeDraft: '',
                }));
                setEditingReminderTime(null);
              }}
            />
          </View>
        ))}

        <AppButton
          title={saving ? '儲存中…' : '儲存'}
          variant="primary"
          disabled={saving}
          busy={saving}
          style={styles.primary}
          textStyle={styles.primaryText}
          onPress={save}
        />
        <Text style={styles.notice}>MEGO 僅協助記錄用藥資訊與提醒，請依獸醫指示使用。</Text>
      </KeyboardAwareScrollView>
    </ScreenPageFrame>
  );
}
