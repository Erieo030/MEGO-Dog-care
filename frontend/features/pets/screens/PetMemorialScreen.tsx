/** 用途：把毛孩移到回憶，或在誤設時還原；所有紀錄都會保留。 */
import React, { useState } from 'react';
import { Alert, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { AppButton } from '../../../components/AppButton';
import AuthenticatedPetAvatar from '../../../components/AuthenticatedPetAvatar';
import DatePickerField from '../../../components/DatePickerField';
import { useTabContentBottomPadding } from '../../../components/navigation/useTabContentBottomPadding';
import { Colors } from '../../../constants/Colors';
import { CardShadow, Radius, Spacing } from '../../../constants/Layout';
import { useFormUnsavedChangesGuard } from '../../../hooks/useFormUnsavedChangesGuard';
import { Type } from '../../../constants/Typography';
import { useAuth } from '../../../contexts/AuthContext';
import { usePet } from '../../../contexts/PetContext';
import { reconcileAccountNotifications } from '../../../services/notificationService';
import { taipeiDateKey, toTaipeiDateValue } from '../../../utils/taipeiDate';
import {
  MEMORIAL_EFFECTS,
  MEMORIAL_NOTE_MAX,
  companionshipText,
  memorialPeriodText,
  validateMemorialDate,
} from '../memorialContent';

type Props = { navigation: { goBack: () => void } };

export default function PetMemorialScreen({ navigation }: Props) {
  const { session } = useAuth();
  const { pets, selectedPet, memorializeSelectedPet, restoreSelectedPet } = usePet();
  const bottomPadding = useTabContentBottomPadding(24);
  const [date, setDate] = useState<Date>(new Date());
  const [note, setNote] = useState('');
  const [saving, setSaving] = useState(false);
  const formValues = { date, note };
  const { markSaved } = useFormUnsavedChangesGuard(
    formValues,
    (value) => {
      setDate(value.date);
      setNote(value.note);
    },
    Boolean(selectedPet) && !selectedPet?.memorial,
  );
  if (!selectedPet) return null;
  const pet = selectedPet;

  const refreshNotifications = (memorialPetId: string, memorial: boolean) => {
    if (!session?.userId) return;
    const nextPets = pets.map((item) => (item.id === memorialPetId ? { ...item, memorial } : item));
    void reconcileAccountNotifications(session.userId, nextPets).catch(() => undefined);
  };

  const confirmMemorial = () => {
    const dateKey = toTaipeiDateValue(date).slice(0, 10);
    const problem = validateMemorialDate(dateKey, pet, taipeiDateKey());
    if (problem) {
      Alert.alert('請確認日期', problem);
      return;
    }
    Alert.alert(`把${pet.name}移到回憶？`, MEMORIAL_EFFECTS.join('\n\n'), [
      { text: '再想想', style: 'cancel' },
      {
        text: '移到回憶',
        onPress: async () => {
          setSaving(true);
          try {
            const stopped = await memorializeSelectedPet({
              passedAwayDate: dateKey,
              memorialNote: note.trim(),
            });
            refreshNotifications(pet.id, true);
            Alert.alert(
              '已移到回憶',
              stopped ? `謝謝牠的陪伴。已停止 ${stopped} 個未完成的提醒。` : '謝謝牠的陪伴。',
            );
            markSaved(formValues, () => navigation.goBack());
          } catch (error) {
            Alert.alert('無法移到回憶', (error as Error).message);
          } finally {
            setSaving(false);
          }
        },
      },
    ]);
  };

  const confirmRestore = () =>
    Alert.alert(
      `把${pet.name}從回憶還原？`,
      '還原後可以再新增紀錄。之前停止的提醒不會自動恢復，需要時請重新建立；身分 QR 公開頁會重新開啟。',
      [
        { text: '取消', style: 'cancel' },
        {
          text: '還原',
          onPress: async () => {
            setSaving(true);
            try {
              await restoreSelectedPet();
              refreshNotifications(pet.id, false);
              navigation.goBack();
            } catch (error) {
              Alert.alert('無法還原', (error as Error).message);
            } finally {
              setSaving(false);
            }
          },
        },
      ],
    );

  const avatar = (
    <View style={styles.avatarRing}>
      {pet.avatarAttachmentId && session?.userId ? (
        <AuthenticatedPetAvatar
          attachmentId={pet.avatarAttachmentId}
          userId={session.userId}
          style={styles.avatar}
          fallback={<Ionicons name="paw" size={36} color={Colors.memorial} />}
        />
      ) : (
        <Ionicons name="paw" size={36} color={Colors.memorial} />
      )}
    </View>
  );

  if (pet.memorial) {
    const period = memorialPeriodText(pet);
    const together = companionshipText(pet);
    return (
      <ScrollView
        style={styles.page}
        contentContainerStyle={[styles.content, { paddingBottom: bottomPadding }]}
      >
        <View style={[styles.card, styles.memorialCard]}>
          {avatar}
          <Text style={styles.name}>{pet.name}</Text>
          <View style={styles.badge}>
            <Ionicons name="flower-outline" size={14} color={Colors.memorial} />
            <Text style={styles.badgeText}>在回憶中</Text>
          </View>
          {period ? <Text style={styles.period}>{period}</Text> : null}
          {together ? <Text style={styles.together}>{together}</Text> : null}
          {pet.memorialNote ? <Text style={styles.note}>「{pet.memorialNote}」</Text> : null}
        </View>
        <Text style={styles.sectionNote}>
          {pet.name}的紀錄和照片都還在，可以從首頁、紀錄和相簿回顧。
        </Text>
        <AppButton
          title={saving ? '正在還原…' : '從回憶還原'}
          variant="secondary"
          busy={saving}
          onPress={confirmRestore}
          accessibilityLabel={`把${pet.name}從回憶還原`}
        />
        <Text style={styles.restoreHint}>只有在誤設時才需要還原。</Text>
      </ScrollView>
    );
  }

  return (
    <ScrollView
      style={styles.page}
      keyboardShouldPersistTaps="handled"
      contentContainerStyle={[styles.content, { paddingBottom: bottomPadding }]}
    >
      <View style={styles.card}>
        {avatar}
        <Text style={styles.name}>{pet.name}</Text>
        <Text style={styles.lead}>
          當{pet.name}離開了，可以把牠移到回憶。MEGO 會好好收著你們一起留下的紀錄。
        </Text>
      </View>

      <View style={styles.effects}>
        {MEMORIAL_EFFECTS.map((effect) => (
          <View key={effect} style={styles.effectRow}>
            <Ionicons name="checkmark-circle-outline" size={18} color={Colors.successStrong} />
            <Text style={styles.effectText}>{effect}</Text>
          </View>
        ))}
      </View>

      <DatePickerField
        label="離開的日期"
        value={date}
        maximumDate={new Date()}
        onChange={setDate}
      />
      <Text style={styles.label}>想對牠說的話（選填）</Text>
      <TextInput
        value={note}
        onChangeText={setNote}
        maxLength={MEMORIAL_NOTE_MAX}
        multiline
        placeholder="例如：謝謝你陪我們走過的每一天"
        placeholderTextColor={Colors.muted}
        style={styles.input}
        accessibilityLabel="想對牠說的話"
      />
      <Text style={styles.counter}>
        {note.length}/{MEMORIAL_NOTE_MAX}
      </Text>
      <AppButton
        title={saving ? '正在處理…' : '移到回憶'}
        busy={saving}
        onPress={confirmMemorial}
        style={styles.submit}
        accessibilityLabel={`把${pet.name}移到回憶`}
      />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  page: { flex: 1, backgroundColor: Colors.background },
  content: { padding: Spacing.xl, gap: Spacing.lg },
  card: {
    alignItems: 'center',
    padding: Spacing.xxl,
    borderRadius: Radius.xl,
    backgroundColor: Colors.surface,
    ...CardShadow,
  },
  memorialCard: { backgroundColor: Colors.memorialSoft },
  avatarRing: {
    width: 96,
    height: 96,
    borderRadius: 48,
    marginBottom: Spacing.md,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
    borderWidth: 3,
    borderColor: Colors.surface,
    backgroundColor: Colors.surfaceSoft,
  },
  avatar: { width: 96, height: 96 },
  name: { color: Colors.text, fontSize: Type.title1, fontWeight: '800' },
  lead: {
    marginTop: Spacing.sm,
    color: Colors.subtext,
    fontSize: Type.body,
    lineHeight: 23,
    textAlign: 'center',
  },
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xxs,
    marginTop: Spacing.sm,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.xxs,
    borderRadius: Radius.pill,
    backgroundColor: Colors.surface,
  },
  badgeText: { color: Colors.memorial, fontSize: Type.footnote, fontWeight: '800' },
  period: { marginTop: Spacing.md, color: Colors.text, fontSize: Type.callout, fontWeight: '700' },
  together: { marginTop: Spacing.xxs, color: Colors.subtext, fontSize: Type.subhead },
  note: {
    marginTop: Spacing.lg,
    color: Colors.text,
    fontSize: Type.body,
    lineHeight: 24,
    textAlign: 'center',
  },
  sectionNote: {
    color: Colors.subtext,
    fontSize: Type.subhead,
    lineHeight: 21,
    textAlign: 'center',
  },
  restoreHint: { color: Colors.muted, fontSize: Type.caption, textAlign: 'center' },
  effects: {
    gap: Spacing.md,
    padding: Spacing.lg,
    borderRadius: Radius.lg,
    backgroundColor: Colors.surfaceWarm,
  },
  effectRow: { flexDirection: 'row', gap: Spacing.sm },
  effectText: { flex: 1, color: Colors.text, fontSize: Type.subhead, lineHeight: 21 },
  label: { color: Colors.text, fontSize: Type.body, fontWeight: '700', marginBottom: -Spacing.sm },
  input: {
    minHeight: 96,
    padding: Spacing.md,
    borderRadius: Radius.md,
    borderWidth: 1,
    borderColor: Colors.border,
    backgroundColor: Colors.surface,
    color: Colors.text,
    fontSize: Type.callout,
    textAlignVertical: 'top',
  },
  counter: {
    alignSelf: 'flex-end',
    marginTop: -Spacing.sm,
    color: Colors.muted,
    fontSize: Type.caption,
  },
  submit: { marginTop: Spacing.xs },
});
