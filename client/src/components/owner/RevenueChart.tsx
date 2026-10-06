import React from 'react';
import { StyleSheet, View, Text, Dimensions } from 'react-native';
import { LineChart } from 'react-native-chart-kit';
import { theme } from '../../constants/theme';
import { OwnerRevenueChartData } from '../../types';

const LineChartComponent = LineChart as any;

interface RevenueChartProps {
  chartData: OwnerRevenueChartData;
}

const PRIMARY_TEAL = '#67BEC3';

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

  const labels = chartData.labels?.length
    ? chartData.labels
    : ['T2', 'T3', 'T4', 'T5', 'T6', 'T7', 'CN'];

  const dataValues = chartData.datasets?.[0]?.data?.length
    ? chartData.datasets[0].data
    : [3500000, 18700000, 6000000, 12500000, 9000000, 15500000, 11000000];

  // Tính đỉnh cao nhất trong chu kỳ
  const peakValue = Math.max(...dataValues, 100000);
  const ceilingValue = Math.round(peakValue * 1.18); // Tạo khoảng đệm 18% phía trên chống tràn đỉnh

  const chartConfig = {
    backgroundColor: '#FFFFFF',
    backgroundGradientFrom: '#FFFFFF',
    backgroundGradientTo: '#FFFFFF',
    decimalPlaces: 0,
    color: (opacity = 1) => `rgba(103, 190, 195, ${opacity})`,
    labelColor: (opacity = 1) => theme.textSecondary,
    style: {
      borderRadius: 16,
      paddingTop: 16,
    },
    // Gradient mềm mượt hướng về trục hoành
    fillShadowGradient: PRIMARY_TEAL,
    fillShadowGradientOpacity: 0.35,
    fillShadowGradientFrom: PRIMARY_TEAL,
    fillShadowGradientFromOpacity: 0.45,
    fillShadowGradientTo: '#FFFFFF',
    fillShadowGradientToOpacity: 0.02,
    propsForDots: {
      r: '5',
      strokeWidth: '2.5',
      stroke: PRIMARY_TEAL,
      fill: '#FFFFFF',
    },
    propsForBackgroundLines: {
      strokeDasharray: '4',
      stroke: '#F1F5F9',
      strokeWidth: 1,
    },
  };

  const formattedData = {
    labels,
    datasets: [
      {
        data: dataValues,
        color: (opacity = 1) => `rgba(103, 190, 195, ${opacity})`,
        strokeWidth: 2.5,
      },
      // Headroom dataset vô hình giúp đẩy trần trục Y lên 1.18x, chống chạm sát mép trên Card
      {
        data: labels.map((_, i) => (i === 0 ? ceilingValue : 0)),
        color: () => 'transparent',
        strokeWidth: 0,
        withDots: false,
      },
    ],
  };

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

      {/* Biểu đồ Bezier LineChart có headroom thoáng đãng */}
      <View style={styles.chartWrapper}>
        <LineChartComponent
          data={formattedData}
          width={screenWidth}
          height={205}
          chartConfig={chartConfig}
          bezier
          style={styles.chartStyle}
          formatYLabel={formatYLabel}
          withInnerLines
          withOuterLines={false}
          withVerticalLines={false}
          withHorizontalLines
          withShadow={true}
          fromZero
          segments={4}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  cardContainer: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    padding: theme.spacing.md,
    paddingTop: 18,
    marginBottom: theme.spacing.lg,
    ...theme.shadows.card,
  },
  chartHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: theme.spacing.xs,
    paddingHorizontal: 4,
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
    backgroundColor: PRIMARY_TEAL,
  },
  legendText: {
    ...theme.typography.caption,
    fontWeight: '600',
    color: theme.textSecondary,
  },
  peakBadge: {
    backgroundColor: '#E8F6F7',
    paddingHorizontal: theme.spacing.sm,
    paddingVertical: 3,
    borderRadius: theme.radii.full,
  },
  peakBadgeText: {
    fontSize: 10,
    fontWeight: '700',
    color: PRIMARY_TEAL,
  },
  chartWrapper: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingTop: 10,
  },
  chartStyle: {
    marginVertical: 4,
    borderRadius: 16,
  },
});
