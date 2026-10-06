import React from 'react';
import { StyleSheet, View, Text, Dimensions } from 'react-native';
import { LineChart } from 'react-native-chart-kit';
import { theme, STRINGS, CONFIG } from '../../constants';
import { OwnerRevenueChartData } from '../../types';

const LineChartComponent = LineChart as any;

interface RevenueChartProps {
  chartData: OwnerRevenueChartData;
}

export function RevenueChart({ chartData }: RevenueChartProps) {
  const horizontalPadding = theme.spacing.md * 4;
  const screenWidth = Dimensions.get('window').width - horizontalPadding;

  // Format nhãn trục Y thành triệu (M) hoặc nghìn (k) - Không hardcode logic & chuỗi
  const formatYLabel = (yValue: string) => {
    const val = Number(yValue);
    if (isNaN(val)) return yValue;
    if (val >= CONFIG.CURRENCY.MILLION_THRESHOLD) {
      const millions = val / CONFIG.CURRENCY.MILLION_THRESHOLD;
      return millions % 1 === 0
        ? `${millions}${STRINGS.COMMON.MILLION_SUFFIX}`
        : `${millions.toFixed(CONFIG.CURRENCY.DECIMAL_PLACES_SHORT)}${STRINGS.COMMON.MILLION_SUFFIX}`;
    }
    if (val >= CONFIG.CURRENCY.THOUSAND_THRESHOLD) {
      return `${Math.round(val / CONFIG.CURRENCY.THOUSAND_THRESHOLD)}${STRINGS.COMMON.THOUSAND_SUFFIX}`;
    }
    return String(Math.round(val));
  };

  const labels = chartData.labels?.length
    ? chartData.labels
    : STRINGS.OWNER_DASHBOARD.DEFAULT_WEEK_LABELS;

  const dataValues = chartData.datasets?.[0]?.data?.length
    ? chartData.datasets[0].data
    : [3500000, 18700000, 6000000, 12500000, 9000000, 15500000, 11000000];

  // Tính đỉnh cao nhất trong chu kỳ dựa trên cấu hình tập trung
  const peakValue = Math.max(...dataValues, CONFIG.CHART.MIN_PEAK_VALUE);
  const ceilingValue = Math.round(peakValue * CONFIG.CHART.CEILING_MULTIPLIER);

  const chartConfig = {
    backgroundColor: theme.colors.surface,
    backgroundGradientFrom: theme.colors.surface,
    backgroundGradientTo: theme.colors.surface,
    decimalPlaces: 0,
    color: (opacity = 1) => `rgba(${theme.primaryRgb}, ${opacity})`,
    labelColor: () => theme.colors.textSecondary,
    style: {
      borderRadius: theme.radii.lg,
      paddingTop: theme.spacing.lg,
    },
    // Gradient mềm mượt hướng về trục hoành
    fillShadowGradient: theme.colors.primary[500],
    fillShadowGradientOpacity: CONFIG.CHART.SHADOW_OPACITY,
    fillShadowGradientFrom: theme.colors.primary[500],
    fillShadowGradientFromOpacity: CONFIG.CHART.SHADOW_FROM_OPACITY,
    fillShadowGradientTo: theme.colors.surface,
    fillShadowGradientToOpacity: CONFIG.CHART.SHADOW_TO_OPACITY,
    propsForDots: {
      r: CONFIG.CHART.DOT_RADIUS,
      strokeWidth: CONFIG.CHART.DOT_STROKE_WIDTH,
      stroke: theme.colors.primary[500],
      fill: theme.colors.surface,
    },
    propsForBackgroundLines: {
      strokeDasharray: CONFIG.CHART.DASH_ARRAY,
      stroke: theme.colors.borderSubtle,
      strokeWidth: CONFIG.CHART.GRID_STROKE_WIDTH,
    },
  };

  const formattedData = {
    labels,
    datasets: [
      {
        data: dataValues,
        color: (opacity = 1) => `rgba(${theme.primaryRgb}, ${opacity})`,
        strokeWidth: CONFIG.CHART.LINE_STROKE_WIDTH,
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
            {chartData.period === 'week'
              ? STRINGS.OWNER_DASHBOARD.CHART_WEEK_LEGEND
              : STRINGS.OWNER_DASHBOARD.CHART_MONTH_LEGEND}
          </Text>
        </View>

        <View style={styles.peakBadge}>
          <Text style={styles.peakBadgeText}>
            {STRINGS.COMMON.PEAK_LABEL}
            {peakValue.toLocaleString(CONFIG.CURRENCY.LOCALE)} {CONFIG.COMMON.CURRENCY_SUFFIX}
          </Text>
        </View>
      </View>

      {/* Biểu đồ Bezier LineChart có headroom thoáng đãng */}
      <View style={styles.chartWrapper}>
        <LineChartComponent
          data={formattedData}
          width={screenWidth}
          height={CONFIG.CHART.HEIGHT}
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
          segments={CONFIG.CHART.SEGMENTS}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  cardContainer: {
    backgroundColor: theme.colors.surface,
    borderRadius: theme.radii.lg,
    borderWidth: 1,
    borderColor: theme.colors.borderSubtle,
    padding: theme.spacing.md,
    paddingTop: theme.spacing.lg + 2,
    marginBottom: theme.spacing.lg,
    ...theme.shadows.card,
  },
  chartHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: theme.spacing.xs,
    paddingHorizontal: theme.spacing.xs,
  },
  legendRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.xs,
  },
  legendDot: {
    width: theme.spacing.sm,
    height: theme.spacing.sm,
    borderRadius: theme.radii.xs,
    backgroundColor: theme.colors.primary[500],
  },
  legendText: {
    ...theme.typography.caption,
    fontWeight: theme.typography.weights.semibold,
    color: theme.colors.textSecondary,
  },
  peakBadge: {
    backgroundColor: theme.colors.primaryLight,
    paddingHorizontal: theme.spacing.sm,
    paddingVertical: theme.spacing.xs - 1,
    borderRadius: theme.radii.full,
  },
  peakBadgeText: {
    fontSize: theme.typography.sizes.sm,
    fontWeight: theme.typography.weights.bold,
    color: theme.colors.primaryDark,
  },
  chartWrapper: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingTop: theme.spacing.md - 2,
  },
  chartStyle: {
    marginVertical: theme.spacing.xs,
    borderRadius: theme.radii.lg,
  },
});
