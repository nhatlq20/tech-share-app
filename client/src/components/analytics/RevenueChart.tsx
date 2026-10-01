import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { theme } from '../../constants/theme';
import { Period, RevenueData } from '../../data/ownerAnalyticsMock';

type RevenueChartProps = {
  data: RevenueData[];
  period: Period;
};

export function RevenueChart({ data, period }: RevenueChartProps) {
  const highestRevenue = Math.max(...data.map((item) => item.revenue), 1);

  return (
    <View style={styles.card}>
      <Text style={styles.caption}>
        {period === 'week' ? 'Revenue by day' : 'Revenue by week'}
      </Text>
      <View style={styles.chart}>
        {data.map((item) => {
          const barHeight = Math.max((item.revenue / highestRevenue) * 112, 4);

          return (
            <View key={item.label} style={styles.barColumn}>
              <Text style={styles.valueLabel} numberOfLines={1}>
                {`${(item.revenue / 1000000).toFixed(1)}m`}
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
    padding: theme.spacing.md,
    backgroundColor: theme.card,
    borderRadius: theme.radii.md,
    borderWidth: 1,
    borderColor: theme.border,
  },
  caption: {
    ...theme.typography.caption,
    marginBottom: theme.spacing.sm,
  },
  chart: {
    height: 164,
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
    gap: theme.spacing.xs,
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
    fontSize: 9,
    color: theme.textSecondary,
    marginBottom: 4,
  },
  barTrack: {
    width: '62%',
    height: 116,
    justifyContent: 'flex-end',
    backgroundColor: theme.colors.slate[100],
    borderTopLeftRadius: theme.radii.sm,
    borderTopRightRadius: theme.radii.sm,
    overflow: 'hidden',
  },
  bar: {
    width: '100%',
    backgroundColor: theme.colors.primary[600],
    borderTopLeftRadius: theme.radii.sm,
    borderTopRightRadius: theme.radii.sm,
  },
  axisLabel: {
    width: '100%',
    textAlign: 'center',
    fontSize: 9,
    color: theme.textSecondary,
    marginTop: 5,
  },
});
