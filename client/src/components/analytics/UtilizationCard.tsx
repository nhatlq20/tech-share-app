import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { theme } from '../../constants/theme';

type UtilizationCardProps = {
  utilizationRate: number;
  rentedDevices: number;
  totalDevices: number;
};

export function UtilizationCard({
  utilizationRate,
  rentedDevices,
  totalDevices,
}: UtilizationCardProps) {
  const progressWidth = `${Math.min(Math.max(utilizationRate, 0), 100)}%` as `${number}%`;

  return (
    <View style={styles.card}>
      <View style={styles.topRow}>
        <Text style={styles.rate}>{utilizationRate}%</Text>
        <Text style={styles.description}>
          {rentedDevices} / {totalDevices} devices are currently rented
        </Text>
      </View>
      <View
        accessibilityRole="progressbar"
        accessibilityValue={{ min: 0, max: 100, now: utilizationRate }}
        style={styles.progressBackground}
      >
        <View style={[styles.progress, { width: progressWidth }]} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    padding: theme.spacing.md,
    backgroundColor: theme.card,
    borderRadius: theme.radii.md,
    borderWidth: 1,
    borderColor: theme.border,
  },
  topRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: theme.spacing.sm,
    marginBottom: theme.spacing.md,
  },
  rate: {
    ...theme.typography.kpi,
    color: theme.colors.success[600],
  },
  description: {
    ...theme.typography.caption,
    flexShrink: 1,
  },
  progressBackground: {
    height: 9,
    overflow: 'hidden',
    borderRadius: theme.radii.full,
    backgroundColor: theme.colors.slate[100],
  },
  progress: {
    height: '100%',
    borderRadius: theme.radii.full,
    backgroundColor: theme.colors.success[500],
  },
});
