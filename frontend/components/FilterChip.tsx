import React from 'react';
import { StyleSheet, Text, TouchableOpacity } from 'react-native';
import { Colors } from '../constants/Colors';
import { Type } from '../constants/Typography';

export default function FilterChip({
  label,
  selected,
  onPress,
}: {
  label: string;
  selected: boolean;
  onPress: () => void;
}) {
  return (
    <TouchableOpacity
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ selected }}
      onPress={onPress}
      style={[styles.chip, selected && styles.selected]}
    >
      <Text style={styles.text}>{label}</Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  chip: {
    minHeight: 48,
    paddingHorizontal: 14,
    paddingVertical: 10,
    justifyContent: 'center',
    borderRadius: 22,
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  selected: { backgroundColor: Colors.primarySoft, borderColor: Colors.primary },
  text: { fontSize: Type.footnote, fontWeight: '600', color: Colors.text },
});
