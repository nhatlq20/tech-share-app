import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Period, RevenueData } from '../../data/ownerAnalyticsMock';
import { theme, STRINGS, CONFIG } from '../../constants';

type RevenueChartProps = {
  data: RevenueData[];
  period: Period;
};

export function RevenueChart({ data, period }: RevenueChartProps) {
  const highestRevenue = Math.max(...data.map((item) => item.revenue), 1);

  return (
    <View style={styles.card}>
      <Text style={styles.caption}>
        {period === 'week'
          ? STRINGS.ANALYTICS.CHART_DAILY_LABEL
          : STRINGS.ANALYTICS.CHART_WEEKLY_LABEL}
      </Text>
      <View style={styles.chart}>
        {data.map((item) => {
          const barHeight = Math.max(
            (item.revenue / highestRevenue) * CONFIG.CHART.MAX_BAR_HEIGHT,
            CONFIG.CHART.MIN_BAR_HEIGHT,
          );

          return (
            <View key={item.label} style={styles.barColumn}>
              <Text style={styles.valueLabel} numberOfLines={1}>
                {item.revenue >= CONFIG.CURRENCY.MILLION_THRESHOLD
                  ? `${(item.revenue / CONFIG.CURRENCY.MILLION_THRESHOLD).toFixed(CONFIG.CURRENCY.DECIMAL_PLACES_SHORT)}${STRINGS.COMMON.MILLION_SUFFIX}`
                  : item.revenue > 0
                  ? `${Math.round(item.revenue / CONFIG.CURRENCY.THOUSAND_THRESHOLD)}${STRINGS.COMMON.THOUSAND_SUFFIX}`
                  : STRINGS.COMMON.ZERO}
              </Text>
              <View style={styles.barTrack}>
                <View style={[styles.bar, { height: barHeight }]} />
              </View>
              <Text style={styles.axisLabel} numberOfLines={1}>
                {item.label}
              </Text>
            </View>
          );
        })}
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
  caption: {
    fontSize: theme.typography.sizes.caption,
    fontWeight: theme.typography.weights.semibold,
    color: theme.textSecondary,
    marginBottom: theme.spacing.md,
  },
  chart: {
    height: CONFIG.CHART.ANALYTICS_HEIGHT,
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
    gap: theme.spacing.xs + 2,
  },
  barColumn: {
    flex: 1,
    minWidth: 0,
    height: '100%',
    alignItems: 'center',
    justifyContent: 'flex-end',
  },
  valueLabel: {
    width: '100%',
    textAlign: 'center',
    fontSize: theme.typography.sizes.xs,
    fontWeight: theme.typography.weights.bold,
    color: theme.primaryDark,
    marginBottom: theme.spacing.xs,
  },
  barTrack: {
    width: '65%',
    height: CONFIG.CHART.TRACK_HEIGHT,
    justifyContent: 'flex-end',
    backgroundColor: theme.border,
    borderTopLeftRadius: theme.radii.sm,
    borderTopRightRadius: theme.radii.sm,
    overflow: 'hidden',
  },
  bar: {
    width: '100%',
    backgroundColor: theme.primary,
    borderTopLeftRadius: theme.radii.sm,
    borderTopRightRadius: theme.radii.sm,
  },
  axisLabel: {
    width: '100%',
    textAlign: 'center',
    fontSize: theme.typography.sizes.sm,
    fontWeight: theme.typography.weights.semibold,
    color: theme.textSecondary,
    marginTop: theme.spacing.xs + 2,
  },
});
