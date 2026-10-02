import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { theme } from '../../constants/theme';
import { DeviceStatistics } from '../../data/ownerAnalyticsMock';

type DeviceStatsProps = {
  statistics: DeviceStatistics;
};

export function DeviceStats({ statistics }: DeviceStatsProps) {
  const items = [
    { label: 'Total devices', value: statistics.totalDevices },
    { label: 'Rented', value: statistics.rentedDevices },
    { label: 'Available', value: statistics.availableDevices },
  ];

  return (
    <View style={styles.row}>
      {items.map((item) => (
        <View key={item.label} style={styles.card}>
          <Text style={styles.label} numberOfLines={1}>
            {item.label}
          </Text>
          <Text style={styles.value}>{item.value}</Text>
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    gap: theme.spacing.sm,
  },
  card: {
    flex: 1,
    minWidth: 0,
    padding: theme.spacing.sm,
    backgroundColor: theme.card,
    borderRadius: theme.radii.md,
    borderWidth: 1,
    borderColor: theme.border,
  },
  label: {
    ...theme.typography.caption,
    fontSize: 11,
  },
  value: {
    ...theme.typography.kpi,
    marginTop: theme.spacing.xs,
  },
});
