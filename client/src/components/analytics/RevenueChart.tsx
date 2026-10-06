import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Period, RevenueData } from '../../data/ownerAnalyticsMock';

const PRIMARY_TEAL = '#67BEC3'; // brand-500
const BRAND_DARK = '#286E74'; // brand-800
const TEXT_SECONDARY = '#64748B'; // Slate-500
const BORDER_SUBTLE = '#F1F5F9';

type RevenueChartProps = {
  data: RevenueData[];
  period: Period;
};

export function RevenueChart({ data, period }: RevenueChartProps) {
  const highestRevenue = Math.max(...data.map((item) => item.revenue), 1);

  return (
    <View style={styles.card}>
      <Text style={styles.caption}>
        {period === 'week' ? 'Biến động doanh thu theo ngày' : 'Biến động doanh thu theo tuần'}
      </Text>
      <View style={styles.chart}>
        {data.map((item) => {
          const barHeight = Math.max((item.revenue / highestRevenue) * 112, 6);

          return (
            <View key={item.label} style={styles.barColumn}>
              <Text style={styles.valueLabel} numberOfLines={1}>
                {item.revenue >= 1000000
                  ? `${(item.revenue / 1000000).toFixed(1)}M`
                  : item.revenue > 0
                  ? `${Math.round(item.revenue / 1000)}k`
                  : '0'}
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
    padding: 16,
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: BORDER_SUBTLE,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 2,
  },
  caption: {
    fontSize: 12,
    fontWeight: '600',
    color: TEXT_SECONDARY,
    marginBottom: 12,
  },
  chart: {
    height: 164,
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
    gap: 6,
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
    fontWeight: '700',
    color: BRAND_DARK,
    marginBottom: 4,
  },
  barTrack: {
    width: '65%',
    height: 116,
    justifyContent: 'flex-end',
    backgroundColor: '#F1F5F9',
    borderTopLeftRadius: 6,
    borderTopRightRadius: 6,
    overflow: 'hidden',
  },
  bar: {
    width: '100%',
    backgroundColor: PRIMARY_TEAL,
    borderTopLeftRadius: 6,
    borderTopRightRadius: 6,
  },
  axisLabel: {
    width: '100%',
    textAlign: 'center',
    fontSize: 10,
    fontWeight: '600',
    color: TEXT_SECONDARY,
    marginTop: 6,
  },
});
