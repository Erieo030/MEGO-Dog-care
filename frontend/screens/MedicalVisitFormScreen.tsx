import { ScreenPageHeader } from '../components/ScreenPageHeader';
import { SafeAreaView } from 'react-native-safe-area-context';
/** 用途：新增或編輯就醫紀錄，支援多筆藥物、附件與回診提醒同步。 */
import React, { useEffect, useRef, useState } from 'react';
import AttachmentPicker from '../components/AttachmentPicker';
import { ATTACHMENT_LIMITS } from '../constants/Attachments';
import { Alert, StyleSheet, Switch, Text, TouchableOpacity, View } from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { Ionicons } from '@expo/vector-icons';
import { AppButton } from '../components/AppButton';
import SupplementalNotesField from '../components/SupplementalNotesField';
import DatePickerField from '../components/DatePickerField';
import KeyboardAwareScrollView from '../components/KeyboardAwareScrollView';
import { showQuickRecordFeedback } from '../utils/quickRecordFeedback';
import { useTabContentBottomPadding } from '../components/navigation/useTabContentBottomPadding';
import { Colors } from '../constants/Colors';
import {
  FORM_BUTTON_HEIGHT,
  FORM_BUTTON_RADIUS,
  FORM_PAGE_HORIZONTAL_PADDING,
} from '../constants/FormTokens';
import { useAuth } from '../contexts/AuthContext';
import { usePet } from '../contexts/PetContext';
import { HomeStackParamList } from '../navigation/types';
import * as service from '../services/medicalVisitService';
import { reconcileAccountNotifications } from '../services/notificationService';
import { Attachment, Medication } from '../types';
import MedicalVisitMedicationEditor from '../features/medical-visits/components/MedicalVisitMedicationEditor';
import MedicalVisitTextField from '../features/medical-visits/components/MedicalVisitTextField';
import { emptyMedication } from '../features/medical-visits/medicalVisitContent';
import type { KeyboardAwareScrollViewRef } from 'react-native-keyboard-controller';
import {
  firstVisitError,
  validateMedicalVisit,
  type VisitErrors,
} from '../features/medical-visits/medicalVisitValidation';
import { useFormUnsavedChangesGuard } from '../hooks/useFormUnsavedChangesGuard';
import { Type } from '../constants/Typography';
type Props = NativeStackScreenProps<HomeStackParamList, 'MedicalVisitForm'>;
export default function MedicalVisitFormScreen({ route, navigation }: Props) {
  const bottomContentPadding = useTabContentBottomPadding();
  const existing = route.params?.visit;
  const duplicate = route.params?.duplicate === true;
  const quickEntry = route.params?.quickEntry === true;
  const { session } = useAuth();
  const { selectedPet, pets } = usePet();
  const clientRequestId = useRef(
    existing?.clientRequestId ?? 'visit-' + Date.now() + '-' + Math.random().toString(36).slice(2),
  ).current;
  const [visitedAt, setVisitedAt] = useState(existing ? new Date(existing.visitedAt) : new Date());
  const [reason, setReason] = useState(existing?.reason || '');
  const [clinic, setClinic] = useState(route.params?.clinicName || existing?.clinicName || '');
  const [vet, setVet] = useState(existing?.veterinarianName || '');
  const [vetNotes, setVetNotes] = useState(existing?.veterinarianNotes || '');
  const [treatment, setTreatment] = useState(existing?.treatmentNotes || '');
  const [followUp, setFollowUp] = useState(
    existing?.followUpAt ? new Date(existing.followUpAt) : null,
  );
  const [createReminder, setCreateReminder] = useState(Boolean(existing?.followUpReminderId));
  const [cost, setCost] = useState(existing?.cost != null ? String(existing.cost) : '');
  const [notes, setNotes] = useState(existing?.notes || '');
  const [attachments, setAttachments] = useState<Attachment[]>(existing?.attachments || []);
  const [medications, setMedications] = useState<Medication[]>(existing?.medications || []);
  const [submitting, setSubmitting] = useState(false);
  const [attachmentsBusy, setAttachmentsBusy] = useState(false);
  const attachmentActivity = useRef(false);
  const submissionLock = useRef(false);
  const [errors, setErrors] = useState<VisitErrors>({});
  const scrollRef = useRef<KeyboardAwareScrollViewRef>(null);
  const fieldPositions = useRef<Record<string, number>>({});
  const position = (key: string) => (event: { nativeEvent: { layout: { y: number } } }) => {
    fieldPositions.current[key] = event.nativeEvent.layout.y;
  };
  const fieldError = (message?: string) =>
    message ? (
      <Text accessibilityRole="alert" style={s.fieldError}>
        {message}
      </Text>
    ) : null;
  const formValues = {
    visitedAt,
    reason,
    clinic,
    vet,
    vetNotes,
    treatment,
    followUp,
    createReminder,
    cost,
    notes,
    attachments,
    medications,
  };
  const { markSaved } = useFormUnsavedChangesGuard(formValues, (value) => {
    setVisitedAt(value.visitedAt);
    setReason(value.reason);
    setClinic(value.clinic);
    setVet(value.vet);
    setVetNotes(value.vetNotes);
    setTreatment(value.treatment);
    setFollowUp(value.followUp);
    setCreateReminder(value.createReminder);
    setCost(value.cost);
    setNotes(value.notes);
    setAttachments(value.attachments);
    setMedications(value.medications);
    setErrors({});
  });
  useEffect(() => {
    if (!route.params?.clinicName) return;
    setClinic(route.params.clinicName);
    navigation.setParams({ clinicName: undefined });
  }, [navigation, route.params?.clinicName]);
  const updateMed = (i: number, key: keyof Medication, value: string | number) =>
    setMedications((v) => v.map((m, n) => (n === i ? { ...m, [key]: value } : m)));
  const removeMed = (i: number) =>
    Alert.alert('刪除藥物', '確定移除這筆藥物？', [
      { text: '取消', style: 'cancel' },
      {
        text: '移除',
        style: 'destructive',
        onPress: () => setMedications((v) => v.filter((_, n) => n !== i)),
      },
    ]);
  const validate = () => {
    const next = validateMedicalVisit({ reason, visitedAt, followUp, cost, medications });
    setErrors(next);
    const first = firstVisitError(next);
    if (first) {
      requestAnimationFrame(() =>
        scrollRef.current?.scrollTo({
          y: Math.max((fieldPositions.current[first] || 0) - 16, 0),
          animated: true,
        }),
      );
      return false;
    }
    return true;
  };
  const submit = async () => {
    if (
      !selectedPet ||
      !session?.userId ||
      submitting ||
      attachmentsBusy ||
      attachmentActivity.current ||
      submissionLock.current ||
      !validate()
    )
      return;
    submissionLock.current = true;
    setSubmitting(true);
    try {
      const data = {
        clientRequestId,
        visitedAt: visitedAt.toISOString(),
        reason: reason.trim(),
        clinicName: clinic.trim(),
        veterinarianName: vet.trim(),
        veterinarianNotes: vetNotes.trim(),
        treatmentNotes: treatment.trim(),
        followUpAt: followUp?.toISOString() || null,
        cost: cost ? Number(cost) : null,
        notes: notes.trim(),
        attachmentIds: attachments.map((a) => a.id),
        medications: medications.map((m) => ({
          ...m,
          name: m.name.trim(),
          instructions: m.instructions.trim(),
          notes: m.notes.trim(),
        })),
        createFollowUpReminder: Boolean(followUp && createReminder),
      };
      if (existing && !duplicate)
        await service.updateMedicalVisit(session.userId, existing.id, data);
      else await service.createMedicalVisit(session.userId, selectedPet.id, data);
      markSaved(formValues);
      const notificationResult = await reconcileAccountNotifications(session.userId, pets).catch(
        () => null,
      );
      if (quickEntry) {
        showQuickRecordFeedback({
          message: '就醫紀錄已儲存，完整內容可到「紀錄」查看。',
          onDone: () => navigation.popToTop(),
          onAddAnother: () => navigation.replace('MedicalVisitForm', { quickEntry: true }),
        });
      } else {
        Alert.alert(
          '已儲存',
          !data.createFollowUpReminder
            ? '就醫紀錄已儲存。'
            : !notificationResult || notificationResult.permission !== 'granted'
              ? '就醫紀錄與 App 內回診提醒已儲存；手機通知未排定，請到設定確認。'
              : '就醫紀錄與回診提醒已儲存，手機通知已同步。',
          [{ text: '完成', onPress: () => navigation.goBack() }],
        );
      }
    } catch (e) {
      Alert.alert('儲存失敗', (e as Error).message || '請稍後再試');
    } finally {
      submissionLock.current = false;
      setSubmitting(false);
    }
  };
  return (
    <SafeAreaView edges={['top', 'left', 'right']} style={s.container}>
      <KeyboardAwareScrollView
        ref={scrollRef}
        contentContainerStyle={[s.content, { paddingBottom: bottomContentPadding }]}
      >
        <ScreenPageHeader
          style={s.formIntro}
          title={duplicate ? '複製新增就醫紀錄' : existing ? '編輯就醫紀錄' : '新增就醫紀錄'}
          description="保存這次看診的重要內容"
          icon="medical-outline"
          iconColor={Colors.primaryDecoration}
          iconBackground={Colors.primarySoft}
        />
        <Text style={s.sectionHeading}>必填與看診資料</Text>
        <View onLayout={position('visitedAt')}>
          <DatePickerField
            label="就醫日期（必填）"
            value={visitedAt}
            mode="date"
            onChange={setVisitedAt}
          />
          {fieldError(errors.visitedAt)}
        </View>
        <View onLayout={position('reason')}>
          <MedicalVisitTextField
            error={errors.reason}
            label="看診原因（必填）"
            value={reason}
            onChangeText={setReason}
            maxLength={500}
          />
        </View>
        <MedicalVisitTextField
          label="動物醫院名稱（選填）"
          value={clinic}
          onChangeText={setClinic}
          maxLength={200}
        />
        <TouchableOpacity
          accessibilityRole="button"
          accessibilityLabel="在地圖上尋找動物醫院"
          style={s.findHospital}
          onPress={() => navigation.navigate('VetMap', { selectForVisit: true })}
        >
          <Ionicons name="map-outline" size={17} color={Colors.successDecoration} />
          <Text style={s.findHospitalText}>在地圖上尋找動物醫院</Text>
          <Ionicons name="chevron-forward" size={16} color={Colors.subtext} />
        </TouchableOpacity>
        <MedicalVisitTextField
          label="獸醫姓名（選填）"
          value={vet}
          onChangeText={setVet}
          maxLength={100}
        />
        <SupplementalNotesField
          label="診斷／獸醫說明（選填）"
          value={vetNotes}
          onChange={setVetNotes}
          placeholder="記下獸醫提供的診斷或說明"
        />
        <SupplementalNotesField
          label="治療／用藥說明（選填）"
          value={treatment}
          onChange={setTreatment}
          placeholder="記下治療方式或用藥說明"
        />
        <View onLayout={position('followUp')}>
          <Text style={s.heading}>回診安排</Text>
          <DatePickerField
            label="下次回診日期（選填）"
            value={followUp || undefined}
            mode="datetime"
            minimumDate={visitedAt}
            onChange={setFollowUp}
          />
          {fieldError(errors.followUp)}
        </View>
        {followUp && (
          <TouchableOpacity
            onPress={() => {
              setFollowUp(null);
              setCreateReminder(false);
            }}
          >
            <Text style={s.removeText}>清除回診日期</Text>
          </TouchableOpacity>
        )}
        {followUp && (
          <View style={s.switchRow}>
            <View>
              <Text style={s.switchText}>是否建立回診提醒？</Text>
              <Text style={s.helper}>關閉時會移除這筆就醫紀錄原有的回診提醒。</Text>
            </View>
            <Switch value={createReminder} onValueChange={setCreateReminder} />
          </View>
        )}
        <Text style={s.sectionHeading}>藥物與費用</Text>
        <View onLayout={position('cost')}>
          <MedicalVisitTextField
            error={errors.cost}
            label="費用（選填）"
            value={cost}
            onChangeText={setCost}
            keyboardType="decimal-pad"
            placeholder="0"
          />
        </View>
        <Text style={s.heading}>用藥紀錄（選填）</Text>
        <Text style={s.helper}>只有拿藥時才需要新增；不知道藥名可先查看藥袋或附上照片。</Text>
        {!medications.length && <Text style={s.empty}>目前沒有藥物</Text>}
        {medications.map((medication, index) => (
          <View key={index} onLayout={position(`medication-${index}`)}>
            <MedicalVisitMedicationEditor
              errors={errors.medications?.[index]}
              medication={medication}
              index={index}
              onUpdate={(key, value) => updateMed(index, key, value)}
              onRemove={() => removeMed(index)}
            />
          </View>
        ))}
        <TouchableOpacity
          disabled={submitting || attachmentsBusy}
          style={s.outline}
          onPress={() => setMedications((v) => [...v, emptyMedication()])}
        >
          <Text style={s.outlineText}>＋ 新增一筆用藥</Text>
        </TouchableOpacity>
        <Text style={s.sectionHeading}>附件與補充</Text>
        <SupplementalNotesField value={notes} onChange={setNotes} />
        <AttachmentPicker
          onBusyChange={(busy) => {
            attachmentActivity.current = busy;
            setAttachmentsBusy(busy);
          }}
          userId={session!.userId}
          petId={existing?.petId || selectedPet!.id}
          sourceType="medical_visit"
          limit={ATTACHMENT_LIMITS.medical_visit}
          value={attachments}
          onChange={setAttachments}
          disabled={submitting || attachmentsBusy}
        />
        <AppButton
          title={submitting ? '儲存中…' : '儲存就醫紀錄'}
          variant="primary"
          disabled={submitting || attachmentsBusy}
          busy={submitting || attachmentsBusy}
          style={[s.submit, submitting && s.disabled]}
          textStyle={s.submitText}
          onPress={submit}
        />
      </KeyboardAwareScrollView>
    </SafeAreaView>
  );
}
const s = StyleSheet.create({
  fieldError: { color: Colors.dangerText, fontSize: Type.footnote, marginTop: 6 },
  container: { flex: 1, backgroundColor: Colors.background },
  content: { paddingHorizontal: FORM_PAGE_HORIZONTAL_PADDING, paddingTop: 20, paddingBottom: 48 },
  title: { color: Colors.text, fontSize: Type.title1, fontWeight: '800' },
  formIntro: { flexDirection: 'row', alignItems: 'center', marginBottom: 22 },
  formIntroIcon: {
    width: 50,
    height: 50,
    borderRadius: 17,
    backgroundColor: Colors.primarySoft,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  formIntroCopy: { flex: 1 },
  formEyebrow: {
    color: Colors.primary,
    fontSize: Type.footnote,
    fontWeight: '800',
    marginBottom: 2,
  },
  notice: { color: Colors.subtext, lineHeight: 19, marginTop: 3, fontSize: Type.footnote },
  sectionHeading: {
    color: Colors.text,
    fontSize: Type.headline,
    fontWeight: '800',
    marginTop: 20,
    marginBottom: 2,
  },
  switchRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: 12,
    marginTop: 12,
    borderWidth: 1,
    borderColor: Colors.border,
    backgroundColor: Colors.surfaceSoft,
    borderRadius: 16,
    padding: 13,
  },
  switchText: { color: Colors.text, fontWeight: '700' },
  helper: { color: Colors.subtext, fontSize: Type.caption, marginTop: 4, maxWidth: 280 },
  heading: {
    color: Colors.text,
    fontSize: Type.headline,
    fontWeight: '800',
    marginTop: 26,
    marginBottom: 4,
  },
  empty: { color: Colors.subtext, paddingVertical: 12 },
  removeText: { color: Colors.dangerText, fontWeight: '700', marginTop: 8 },
  outline: {
    borderWidth: 1,
    borderColor: Colors.primary,
    borderRadius: 16,
    minHeight: 44,
    paddingHorizontal: 14,
    paddingVertical: 10,
    alignItems: 'center',
    marginTop: 10,
  },
  outlineText: { color: Colors.primary, fontWeight: '700' },
  findHospital: {
    minHeight: 44,
    alignSelf: 'flex-start',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
    marginTop: -5,
    marginBottom: 12,
    paddingHorizontal: 11,
    borderRadius: 14,
    backgroundColor: Colors.successSoft,
  },
  findHospitalText: { color: Colors.success, fontSize: Type.footnote, fontWeight: '700' },
  images: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 10 },
  image: { width: 75, height: 75, borderRadius: 10 },
  removeImage: {
    color: Colors.dangerText,
    fontSize: Type.caption,
    textAlign: 'center',
    marginTop: 3,
  },
  submit: {
    backgroundColor: Colors.primary,
    borderRadius: FORM_BUTTON_RADIUS,
    minHeight: FORM_BUTTON_HEIGHT,
    paddingHorizontal: 16,
    paddingVertical: 14,
    alignItems: 'center',
    marginTop: 25,
  },
  submitText: { color: Colors.onPrimary, fontWeight: '800' },
  disabled: { opacity: 0.5 },
});
