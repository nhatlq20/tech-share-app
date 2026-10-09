import React from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { theme, STRINGS, CONFIG } from "../../constants";
import type { ManagedDeviceStatus } from "../../types";

interface DeviceStatusToggleProps {
  status: ManagedDeviceStatus;
  onChange: (status: ManagedDeviceStatus) => void;
}

const STATUS_OPTIONS: {
  value: ManagedDeviceStatus;
  label: string;
  color: string;
}[] = [
  { value: "available", label: STRINGS.DEVICE_STATUS.AVAILABLE, color: theme.success },
  { value: "maintenance", label: STRINGS.DEVICE_STATUS.MAINTENANCE, color: theme.warning },
  { value: "hidden", label: STRINGS.DEVICE_STATUS.HIDDEN, color: theme.textSecondary },
];

export function DeviceStatusToggle({
  status,
  onChange,
}: DeviceStatusToggleProps) {
  return (
    <View
      style={styles.container}
      accessibilityRole="radiogroup"
      accessibilityLabel={STRINGS.DEVICE_STATUS.LABEL_GROUP}
    >
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
              selected && {
                backgroundColor: option.color,
                borderColor: option.color,
              },
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
                selected &&
                  option.value === "maintenance" &&
                  styles.maintenanceLabel,
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
    flexDirection: "row",
    gap: theme.spacing.xs,
  },
  option: {
    flex: 1,
    minWidth: 0,
    minHeight: 48,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: theme.spacing.xs,
    paddingVertical: theme.spacing.sm + 2,
    borderRadius: theme.radii.sm,
    borderWidth: 1,
    borderColor: theme.border,
    backgroundColor: theme.surface,
  },
  pressed: {
    opacity: CONFIG.ANIMATION.ACTIVE_OPACITY_PILL,
  },
  label: {
    maxWidth: "100%",
    fontSize: theme.typography.sizes.bodySm,
    fontWeight: theme.typography.weights.semibold,
    textAlign: "center",
    color: theme.textSecondary,
  },
  selectedLabel: {
    color: theme.white,
    fontWeight: theme.typography.weights.bold,
  },
  maintenanceLabel: {
    color: theme.textPrimary,
  },
});
