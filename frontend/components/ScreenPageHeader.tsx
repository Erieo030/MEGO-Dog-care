import React from 'react';
import { StyleSheet, Text, View, type StyleProp, type ViewStyle } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '../constants/Colors';
import { Type } from '../constants/Typography';
import { SoftButton } from './SoftMotion';

/** Page-owned heading and back action; navigation guards still handle goBack. */
export function ScreenPageHeader({
  children,
  title,
  style,
}: {
  children?: React.ReactNode;
  title?: string;
  style?: StyleProp<ViewStyle>;
}) {
  const navigation = useNavigation();
  return (
    <View style={[styles.header, style]}>
      <SoftButton
        accessibilityRole="button"
        accessibilityLabel="返回上一頁"
        style={styles.back}
        onPress={() => navigation.goBack()}
      >
        <Ionicons name="chevron-back" size={23} color={Colors.text} />
      </SoftButton>
      {children || (
        <Text accessibilityRole="header" style={styles.title}>
          {title}
        </Text>
      )}
    </View>
  );
}

/** Screens that previously relied on the native header now own their safe area. */
export function ScreenPageFrame({ children }: { children: React.ReactNode }) {
  return (
    <SafeAreaView edges={['top', 'left', 'right']} style={styles.frame}>
      {children}
    </SafeAreaView>
  );
}

/** Loading, missing-data and error views must retain a visible way back. */
export function ScreenPageState({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <ScreenPageFrame>
      <ScreenPageHeader title={title} style={styles.stateHeader} />
      {children}
    </ScreenPageFrame>
  );
}

const styles = StyleSheet.create({
  frame: { flex: 1, backgroundColor: Colors.background },
  header: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  back: { width: 44, minHeight: 44, alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
  title: { flex: 1, minWidth: 0, color: Colors.text, fontSize: Type.title2, fontWeight: '800' },
  stateHeader: { marginHorizontal: 18, marginTop: 18, marginBottom: 12 },
});
