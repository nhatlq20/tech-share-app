import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { colors } from '../../theme/colors';
import type { ManagedDeviceStatus } from '../../types';

interface DeviceStatusToggleProps {
  status: ManagedDeviceStatus;
  onChange: (status: ManagedDeviceStatus) => void;
}

const STATUS_OPTIONS: { value: ManagedDeviceStatus; label: string; color: string }[] = [
  { value: 'available', label: 'Available', color: colors.light.success },
  { value: 'maintenance', label: 'Maintenance', color: colors.light.warning },
  { value: 'hidden', label: 'Hidden', color: colors.light.textSecondary },
];

export function DeviceStatusToggle({ status, onChange }: DeviceStatusToggleProps) {
  return (
    <View style={styles.container} accessibilityRole="radiogroup" accessibilityLabel="Device status">
      {STATUS_OPTIONS.map((option) => {
        const selected = status === option.value;

        return (
          <Pressable
            key={option.value}
            accessibilityRole="radio"
            accessibilityLabel={option.label}
            accessibilityState={{ checked: selected }}
            onPress={() => onChange(option.value)}
            style={({ pressed }: { pressed: boolean }) => [
              styles.option,
              selected && { backgroundColor: option.color, borderColor: option.color },
              pressed && styles.pressed,
            ]}
          >
            <Text
              adjustsFontSizeToFit
              minimumFontScale={0.8}
              numberOfLines={1}
              style={[
                styles.label,
                selected && styles.selectedLabel,
                selected && option.value === 'maintenance' && styles.maintenanceLabel,
              ]}
            >
              {option.label}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    gap: 4,
  },
  option: {
    flex: 1,
    minWidth: 0,
    minHeight: 48,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 4,
    paddingVertical: 10,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: colors.light.border,
    backgroundColor: colors.light.surface,
  },
  pressed: {
    opacity: 0.75,
  },
  label: {
    maxWidth: '100%',
    fontSize: 12,
    fontWeight: '600',
    textAlign: 'center',
    color: colors.light.textSecondary,
  },
  selectedLabel: {
    color: colors.light.background,
    fontWeight: '700',
  },
  maintenanceLabel: {
    color: colors.light.textPrimary,
  },
});
