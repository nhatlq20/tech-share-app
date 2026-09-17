import React from 'react';
import { StyleSheet, View, Text, Dimensions } from 'react-native';
import { LineChart } from 'react-native-chart-kit';
import { theme } from '../../constants/theme';
import { OwnerRevenueChartData } from '../../types';

const LineChartComponent = LineChart as any;

interface RevenueChartProps {
  chartData: OwnerRevenueChartData;
}

export function RevenueChart({ chartData }: RevenueChartProps) {
  const screenWidth = Dimensions.get('window').width - theme.spacing.md * 2 - theme.spacing.md * 2;

  // Format nhãn trục Y thành triệu (M) hoặc nghìn (k)
  const formatYLabel = (yValue: string) => {
    const val = Number(yValue);
    if (isNaN(val)) return yValue;
    if (val >= 1000000) {
      const millions = val / 1000000;
      return millions % 1 === 0 ? `${millions}M` : `${millions.toFixed(1)}M`;
    }
    if (val >= 1000) {
      return `${Math.round(val / 1000)}k`;
    }
    return String(Math.round(val));
  };

  const chartConfig = {
    backgroundColor: theme.card,
    backgroundGradientFrom: theme.card,
    backgroundGradientTo: theme.card,
    decimalPlaces: 0,
    color: (opacity = 1) => theme.colors.primary[600],
    labelColor: (opacity = 1) => theme.textSecondary,
    style: {
      borderRadius: theme.radii.lg,
    },
    propsForDots: {
      r: '5',
      strokeWidth: '2.5',
      stroke: theme.colors.primary[600],
      fill: theme.colors.white,
    },
    propsForBackgroundLines: {
      strokeDasharray: '4',
      stroke: theme.border,
      strokeWidth: 1,
    },
  };

  const labels = chartData.labels?.length
    ? chartData.labels
    : ['T2', 'T3', 'T4', 'T5', 'T6', 'T7', 'CN'];

  const dataValues = chartData.datasets?.[0]?.data?.length
    ? chartData.datasets[0].data
    : [350000, 450000, 600000, 550000, 900000, 1350000, 1100000];

  const formattedData = {
    labels,
    datasets: [
      {
        data: dataValues,
        color: (opacity = 1) => theme.colors.primary[600],
        strokeWidth: 2.5,
      },
    ],
  };

  // Tính đỉnh cao nhất trong chu kỳ
  const peakValue = Math.max(...dataValues);

  return (
    <View style={styles.cardContainer}>
      {/* Header biểu đồ */}
      <View style={styles.chartHeader}>
        <View style={styles.legendRow}>
          <View style={styles.legendDot} />
          <Text style={styles.legendText}>
            {chartData.period === 'week' ? 'Doanh thu 7 ngày qua (VNĐ)' : 'Doanh thu các tuần trong tháng (VNĐ)'}
          </Text>
        </View>

        <View style={styles.peakBadge}>
          <Text style={styles.peakBadgeText}>Đỉnh: {peakValue.toLocaleString('vi-VN')} đ</Text>
        </View>
      </View>

      {/* Biểu đồ Bezier LineChart */}
      <View style={styles.chartWrapper}>
        <LineChartComponent
          data={formattedData}
          width={screenWidth}
          height={190}
          chartConfig={chartConfig}
          bezier
          style={styles.chartStyle}
          formatYLabel={formatYLabel}
          withInnerLines
          withOuterLines={false}
          withVerticalLines={false}
          withHorizontalLines
          withShadow={false}
          fromZero
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  cardContainer: {
    backgroundColor: theme.card,
    borderRadius: theme.radii.lg,
    borderWidth: 1,
    borderColor: theme.border,
    padding: theme.spacing.md,
    marginBottom: theme.spacing.lg,
    ...theme.shadows.card,
  },
  chartHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: theme.spacing.sm,
  },
  legendRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.xs,
  },
  legendDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: theme.colors.primary[600],
  },
  legendText: {
    ...theme.typography.caption,
    fontWeight: '600',
    color: theme.textSecondary,
  },
  peakBadge: {
    backgroundColor: theme.colors.primary[50],
    paddingHorizontal: theme.spacing.sm,
    paddingVertical: 2,
    borderRadius: theme.radii.full,
  },
  peakBadgeText: {
    fontSize: 10,
    fontWeight: '700',
    color: theme.colors.primary[600],
  },
  chartWrapper: {
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: theme.spacing.xs,
  },
  chartStyle: {
    marginVertical: 4,
    borderRadius: theme.radii.md,
  },
});
