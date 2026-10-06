import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { theme, STRINGS, CONFIG } from '../../constants';

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
  const boundedRate = Math.min(
    Math.max(utilizationRate, CONFIG.LIMITS.MIN_PERCENT),
    CONFIG.LIMITS.MAX_PERCENT,
  );
  const progressWidth = `${boundedRate}%` as `${number}%`;

  return (
    <View style={styles.card}>
      <View style={styles.topRow}>
        <View style={styles.rateCol}>
          <Text style={styles.rate}>{utilizationRate}%</Text>
          <Text style={styles.rateSub}>{STRINGS.ANALYTICS.UTILIZATION_RATE_LABEL}</Text>
        </View>
        <Text style={styles.description}>
          {STRINGS.ANALYTICS.RENTED_DEVICES_RATIO(rentedDevices, totalDevices)}
        </Text>
      </View>
      <View
        accessibilityRole="progressbar"
        accessibilityValue={{
          min: CONFIG.LIMITS.MIN_PERCENT,
          max: CONFIG.LIMITS.MAX_PERCENT,
          now: utilizationRate,
        }}
        style={styles.progressBackground}
      >
        <View style={[styles.progress, { width: progressWidth }]} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    padding: theme.spacing.lg,
    backgroundColor: theme.surface,
    borderRadius: theme.radii.lg,
    borderWidth: 1,
    borderColor: theme.border,
    ...theme.shadows.card,
  },
  topRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: theme.spacing.md,
  },
  rateCol: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: theme.spacing.sm,
  },
  rate: {
    fontSize: theme.typography.sizes.h1,
    fontWeight: theme.typography.weights.heavy,
    color: theme.primary,
  },
  rateSub: {
    fontSize: theme.typography.sizes.bodySm,
    fontWeight: theme.typography.weights.semibold,
    color: theme.textSecondary,
  },
  description: {
    fontSize: theme.typography.sizes.bodySm,
    fontWeight: theme.typography.weights.semibold,
    color: theme.textSecondary,
  },
  progressBackground: {
    height: CONFIG.LIMITS.PROGRESS_BAR_HEIGHT,
    overflow: 'hidden',
    borderRadius: theme.radii.full,
    backgroundColor: theme.border,
  },
  progress: {
    height: '100%',
    borderRadius: theme.radii.full,
    backgroundColor: theme.primary,
  },
});
