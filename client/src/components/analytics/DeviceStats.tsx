import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { DeviceStatistics } from '../../data/ownerAnalyticsMock';
import { theme, STRINGS } from '../../constants';

type DeviceStatsProps = {
  statistics: DeviceStatistics;
};

export function DeviceStats({ statistics }: DeviceStatsProps) {
  const items = [
    {
      label: STRINGS.ANALYTICS.TOTAL_DEVICES,
      value: statistics.totalDevices,
      icon: 'cube-outline' as const,
      color: theme.primary,
      bg: theme.primaryLight,
    },
    {
      label: STRINGS.ANALYTICS.RENTED_DEVICES,
      value: statistics.rentedDevices,
      icon: 'flash-outline' as const,
      color: theme.warning,
      bg: theme.warningLight,
    },
    {
      label: STRINGS.ANALYTICS.AVAILABLE_DEVICES,
      value: statistics.availableDevices,
      icon: 'checkmark-circle-outline' as const,
      color: theme.success,
      bg: theme.successLight,
    },
  ];

  return (
    <View style={styles.row}>
      {items.map((item) => (
        <View key={item.label} style={styles.card}>
          <View style={[styles.iconBox, { backgroundColor: item.bg }]}>
            <Ionicons name={item.icon} size={16} color={item.color} />
          </View>
          <Text style={styles.label} numberOfLines={1}>
            {item.label}
          </Text>
          <Text style={[styles.value, { color: item.color }]}>{item.value}</Text>
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    gap: theme.spacing.md - 2,
  },
  card: {
    flex: 1,
    minWidth: 0,
    padding: theme.spacing.md,
    backgroundColor: theme.surface,
    borderRadius: theme.radii.lg,
    borderWidth: 1,
    borderColor: theme.border,
    alignItems: 'center',
    ...theme.shadows.card,
  },
  iconBox: {
    width: 36,
    height: 36,
    borderRadius: theme.radii.full,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: theme.spacing.xs + 2,
  },
  label: {
    fontSize: theme.typography.sizes.caption,
    fontWeight: theme.typography.weights.semibold,
    color: theme.textSecondary,
    textAlign: 'center',
  },
  value: {
    fontSize: theme.typography.sizes.h2,
    fontWeight: theme.typography.weights.heavy,
    marginTop: 2,
    textAlign: 'center',
  },
});
