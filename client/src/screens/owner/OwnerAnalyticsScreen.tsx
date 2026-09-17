import React, { useState, useEffect, useCallback } from 'react';
import {
  StyleSheet,
  View,
  Text,
  FlatList,
  TouchableOpacity,
  Image,
  RefreshControl,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { theme } from '../../constants/theme';
import { OwnerAnalyticsResponse, FleetDeviceItem } from '../../types';
import {
  ownerAnalyticsService,
  FALLBACK_OWNER_ANALYTICS_WEEK,
} from '../../services/ownerAnalyticsService';
import { RevenueChart } from '../../components/owner/RevenueChart';

interface OwnerAnalyticsScreenProps {
  onBackToHome?: () => void;
  onNavigateToDeviceDetail?: (deviceId: string) => void;
}

type PeriodType = 'week' | 'month';

export function OwnerAnalyticsScreen({
  onBackToHome,
  onNavigateToDeviceDetail,
}: OwnerAnalyticsScreenProps) {
  const [period, setPeriod] = useState('week' as PeriodType);
  const [data, setData] = useState(FALLBACK_OWNER_ANALYTICS_WEEK as OwnerAnalyticsResponse);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  const fetchAnalytics = useCallback(async (selectedPeriod: PeriodType) => {
    try {
      const res = await ownerAnalyticsService.getOwnerAnalytics(selectedPeriod);
      if (res) {
        setData(res);
      }
    } catch (error) {
      console.warn('⚠️ [OwnerAnalyticsScreen] Lỗi khi tải thống kê:', error);
    }
  }, []);

  useEffect(() => {
    setLoading(true);
    fetchAnalytics(period).finally(() => setLoading(false));
  }, [fetchAnalytics, period]);

  const onRefresh = async () => {
    setRefreshing(true);
    await fetchAnalytics(period);
    setRefreshing(false);
  };

  const overview = data.overview || FALLBACK_OWNER_ANALYTICS_WEEK.overview;
  const chartData = data.revenueChart || FALLBACK_OWNER_ANALYTICS_WEEK.revenueChart;
  const fleet = data.fleet || FALLBACK_OWNER_ANALYTICS_WEEK.fleet;

  // Render từng thiết bị trong kho máy (Fleet Item)
  const renderFleetItem = ({ item }: { item: FleetDeviceItem }) => {
    return (
      <TouchableOpacity
        style={styles.fleetCard}
        onPress={() => onNavigateToDeviceDetail?.(item._id)}
        activeOpacity={0.7}
      >
        <Image source={{ uri: item.imageUrl }} style={styles.fleetThumb} />

        <View style={styles.fleetContentCol}>
          {/* Hàng trên: Badge danh mục & Trạng thái */}
          <View style={styles.fleetTopRow}>
            <View style={styles.categoryBadge}>
              <Text style={styles.categoryBadgeText}>{item.category.toUpperCase()}</Text>
            </View>

            <View
              style={[
                styles.statusPill,
                item.status === 'rented' ? styles.statusPillRented : styles.statusPillAvailable,
              ]}
            >
              <Text
                style={[
                  styles.statusPillText,
                  item.status === 'rented'
                    ? styles.statusPillTextRented
                    : styles.statusPillTextAvailable,
                ]}
              >
                {item.status === 'rented' ? 'Đang cho thuê' : 'Sẵn sàng'}
              </Text>
            </View>
          </View>

          {/* Tên máy */}
          <Text style={styles.fleetName} numberOfLines={2}>
            {item.name}
          </Text>

          {/* Thông số lượt thuê & rating */}
          <View style={styles.fleetMetricsRow}>
            <View style={styles.ratingBadge}>
              <Ionicons name="star" size={12} color="#FBBF24" />
              <Text style={styles.ratingText}>{item.ratingAvg?.toFixed(1) || '5.0'}</Text>
            </View>
            <Text style={styles.metricDivider}>•</Text>
            <Text style={styles.rentalCountText}>{item.rentalCount} lượt thuê</Text>
            <Text style={styles.metricDivider}>•</Text>
            <Text style={styles.dailyPriceText}>
              {item.pricePerDay?.toLocaleString('vi-VN')} đ/ngày
            </Text>
          </View>

          {/* Hàng dưới: Doanh thu tích lũy máy mang lại */}
          <View style={styles.revenueRow}>
            <Text style={styles.revenueLabel}>Doanh thu tích lũy:</Text>
            <Text style={styles.revenueValue}>
              +{item.revenueTotal?.toLocaleString('vi-VN')} đ
            </Text>
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  // Header của danh sách (gồm Header chính, Bộ chọn chu kỳ, 4 KPI cards, Biểu đồ)
  const renderListHeader = () => {
    return (
      <View style={styles.listHeaderContainer}>
        {/* 1. Header Màn hình */}
        <View style={styles.screenHeader}>
          <View style={styles.headerTitleRow}>
            <View style={styles.iconCircle}>
              <Ionicons name="analytics" size={20} color={theme.colors.primary[600]} />
            </View>
            <View style={styles.headerTitleCol}>
              <Text style={styles.screenTitle}>Báo Cáo Doanh Thu & Kho</Text>
              <Text style={styles.screenSubtitle}>Phân tích hiệu quả kinh doanh chủ máy</Text>
            </View>
          </View>

          {onBackToHome && (
            <TouchableOpacity style={styles.exitButton} onPress={onBackToHome} activeOpacity={0.8}>
              <Ionicons name="home-outline" size={16} color={theme.textSecondary} />
            </TouchableOpacity>
          )}
        </View>

        {/* 2. Bộ chọn chu kỳ thời gian (Filter Tabs) */}
        <View style={styles.periodSelectorContainer}>
          <TouchableOpacity
            style={[
              styles.periodTab,
              period === 'week' && styles.periodTabActive,
            ]}
            onPress={() => setPeriod('week')}
            activeOpacity={0.8}
          >
            <Ionicons
              name="calendar-outline"
              size={14}
              color={period === 'week' ? theme.colors.white : theme.textSecondary}
            />
            <Text
              style={[
                styles.periodTabText,
                period === 'week' && styles.periodTabTextActive,
              ]}
            >
              7 ngày qua
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[
              styles.periodTab,
              period === 'month' && styles.periodTabActive,
            ]}
            onPress={() => setPeriod('month')}
            activeOpacity={0.8}
          >
            <Ionicons
              name="pie-chart-outline"
              size={14}
              color={period === 'month' ? theme.colors.white : theme.textSecondary}
            />
            <Text
              style={[
                styles.periodTabText,
                period === 'month' && styles.periodTabTextActive,
              ]}
            >
              Tháng này
            </Text>
          </TouchableOpacity>
        </View>

        {/* 3. Khối 4 Thẻ Chỉ Số Hiệu Suất (KPI Stat Cards - Grid 2x2) */}
        <View style={styles.kpiSection}>
          <Text style={styles.sectionHeaderTitle}>CHỈ SỐ HIỆU SUẤT CHỦ MÁY</Text>

          <View style={styles.kpiGrid}>
            {/* Card 1: Tổng doanh thu (Success[500]) */}
            <View style={styles.kpiCard}>
              <View style={styles.kpiHeaderRow}>
                <View style={[styles.kpiIconBox, { backgroundColor: theme.colors.success[50] }]}>
                  <Ionicons name="wallet-outline" size={18} color={theme.colors.success[500]} />
                </View>
                <View style={styles.kpiTrendBadge}>
                  <Ionicons name="arrow-up" size={10} color={theme.colors.success[500]} />
                  <Text style={styles.kpiTrendText}>+24%</Text>
                </View>
              </View>
              <Text style={styles.kpiLabel}>Tổng doanh thu</Text>
              <Text style={[styles.kpiValue, { color: theme.colors.success[500] }]}>
                {overview.totalRevenue.toLocaleString('vi-VN')} đ
              </Text>
              <Text style={styles.kpiSubCaption}>Đơn completed nhận đủ</Text>
            </View>

            {/* Card 2: Đang cho thuê (Primary[600]) */}
            <View style={styles.kpiCard}>
              <View style={styles.kpiHeaderRow}>
                <View style={[styles.kpiIconBox, { backgroundColor: theme.colors.primary[50] }]}>
                  <Ionicons name="cube-outline" size={18} color={theme.colors.primary[600]} />
                </View>
                <View style={styles.liveBadge}>
                  <View style={styles.liveDot} />
                  <Text style={styles.liveText}>Realtime</Text>
                </View>
              </View>
              <Text style={styles.kpiLabel}>Đang cho thuê</Text>
              <Text style={[styles.kpiValue, { color: theme.colors.primary[600] }]}>
                {overview.activeRentals} Máy
              </Text>
              <Text style={styles.kpiSubCaption}>Đơn active thực tế</Text>
            </View>

            {/* Card 3: Ký quỹ bảo đảm (Warning[500]) */}
            <View style={styles.kpiCard}>
              <View style={styles.kpiHeaderRow}>
                <View style={[styles.kpiIconBox, { backgroundColor: theme.colors.warning[50] }]}>
                  <Ionicons
                    name="shield-checkmark-outline"
                    size={18}
                    color={theme.colors.warning[500]}
                  />
                </View>
                <View style={styles.escrowTag}>
                  <Text style={styles.escrowTagText}>An toàn</Text>
                </View>
              </View>
              <Text style={styles.kpiLabel}>Ký quỹ bảo đảm</Text>
              <Text style={[styles.kpiValue, { color: theme.colors.warning[500] }]}>
                {overview.escrowHolding.toLocaleString('vi-VN')} đ
              </Text>
              <Text style={styles.kpiSubCaption}>Escrow giữ phòng rủi ro</Text>
            </View>

            {/* Card 4: Tỷ lệ khai thác (Indigo[500]) */}
            <View style={styles.kpiCard}>
              <View style={styles.kpiHeaderRow}>
                <View style={[styles.kpiIconBox, { backgroundColor: theme.colors.indigo[50] }]}>
                  <Ionicons
                    name="trending-up-outline"
                    size={18}
                    color={theme.colors.indigo[500]}
                  />
                </View>
                <View style={styles.highUtilBadge}>
                  <Text style={styles.highUtilText}>Hiệu suất cao</Text>
                </View>
              </View>
              <Text style={styles.kpiLabel}>Tỷ lệ khai thác</Text>
              <Text style={[styles.kpiValue, { color: theme.colors.indigo[500] }]}>
                {overview.utilizationRate.toFixed(1)} %
              </Text>
              <Text style={styles.kpiSubCaption}>Lấp đầy ngày trống</Text>
            </View>
          </View>
        </View>

        {/* 4. Biểu đồ Doanh Thu */}
        <View style={styles.chartSection}>
          <Text style={styles.sectionHeaderTitle}>BIỂU ĐỒ TĂNG TRƯỞNG DOANH THU</Text>
          <RevenueChart chartData={chartData} />
        </View>

        {/* 5. Tiêu đề Danh sách Kho Máy */}
        <View style={styles.fleetHeaderRow}>
          <Text style={styles.sectionHeaderTitle}>HIỆU SUẤT TỪNG THIẾT BỊ TRONG KHO ({fleet.length})</Text>
          <Text style={styles.fleetSubtitle}>Sắp xếp theo doanh thu giảm dần</Text>
        </View>
      </View>
    );
  };

  return (
    <View style={styles.root}>
      {loading && !refreshing ? (
        <View style={styles.centerLoading}>
          <ActivityIndicator size="large" color={theme.colors.primary[600]} />
          <Text style={styles.loadingText}>Đang tổng hợp báo cáo doanh thu...</Text>
        </View>
      ) : (
        <FlatList
          data={fleet}
          keyExtractor={(item: FleetDeviceItem) => item._id}
          renderItem={renderFleetItem}
          ListHeaderComponent={renderListHeader}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              colors={[theme.colors.primary[600]]}
              tintColor={theme.colors.primary[600]}
            />
          }
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: theme.background,
  },
  centerLoading: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: theme.spacing.sm,
  },
  loadingText: {
    ...theme.typography.caption,
    color: theme.textSecondary,
  },
  listContent: {
    paddingHorizontal: theme.spacing.md,
    paddingTop: theme.spacing.md,
    paddingBottom: theme.spacing.xl,
  },
  listHeaderContainer: {
    marginBottom: theme.spacing.xs,
  },
  screenHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: theme.spacing.md,
  },
  headerTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.sm,
  },
  iconCircle: {
    width: 40,
    height: 40,
    borderRadius: theme.radii.md,
    backgroundColor: theme.colors.primary[50],
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: theme.colors.primary[500],
  },
  headerTitleCol: {
    justifyContent: 'center',
  },
  screenTitle: {
    ...theme.typography.heading,
  },
  screenSubtitle: {
    ...theme.typography.caption,
    marginTop: 2,
  },
  exitButton: {
    width: 36,
    height: 36,
    borderRadius: theme.radii.md,
    backgroundColor: theme.card,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: theme.border,
  },
  periodSelectorContainer: {
    flexDirection: 'row',
    backgroundColor: theme.card,
    borderRadius: theme.radii.full,
    padding: theme.spacing.xs,
    borderWidth: 1,
    borderColor: theme.border,
    marginBottom: theme.spacing.md,
    ...theme.shadows.subtle,
  },
  periodTab: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: theme.spacing.xs,
    paddingVertical: theme.spacing.sm,
    borderRadius: theme.radii.full,
  },
  periodTabActive: {
    backgroundColor: theme.colors.primary[600],
  },
  periodTabText: {
    ...theme.typography.caption,
    fontWeight: '600',
    color: theme.textSecondary,
  },
  periodTabTextActive: {
    color: theme.colors.white,
    fontWeight: '700',
  },
  sectionHeaderTitle: {
    fontSize: 12,
    fontWeight: '700',
    color: theme.textSecondary,
    letterSpacing: 0.5,
    marginBottom: theme.spacing.sm,
  },
  kpiSection: {
    marginBottom: theme.spacing.md,
  },
  kpiGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: theme.spacing.md,
  },
  kpiCard: {
    width: '47.5%',
    backgroundColor: theme.card,
    borderRadius: theme.radii.lg,
    padding: theme.spacing.md,
    borderWidth: 1,
    borderColor: theme.border,
    ...theme.shadows.card,
  },
  kpiHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: theme.spacing.sm,
  },
  kpiIconBox: {
    width: 34,
    height: 34,
    borderRadius: theme.radii.sm,
    alignItems: 'center',
    justifyContent: 'center',
  },
  kpiTrendBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
    backgroundColor: theme.colors.success[50],
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: theme.radii.full,
  },
  kpiTrendText: {
    fontSize: 10,
    fontWeight: '700',
    color: theme.colors.success[500],
  },
  liveBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: theme.colors.primary[50],
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: theme.radii.full,
  },
  liveDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: theme.colors.primary[600],
  },
  liveText: {
    fontSize: 9,
    fontWeight: '700',
    color: theme.colors.primary[600],
  },
  escrowTag: {
    backgroundColor: theme.colors.warning[50],
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: theme.radii.full,
  },
  escrowTagText: {
    fontSize: 9,
    fontWeight: '700',
    color: theme.colors.warning[600],
  },
  highUtilBadge: {
    backgroundColor: theme.colors.indigo[50],
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: theme.radii.full,
  },
  highUtilText: {
    fontSize: 9,
    fontWeight: '700',
    color: theme.colors.indigo[500],
  },
  kpiLabel: {
    ...theme.typography.caption,
    color: theme.textSecondary,
    marginBottom: 2,
  },
  kpiValue: {
    ...theme.typography.kpi,
    fontSize: 17,
    fontWeight: '800',
    marginBottom: 2,
  },
  kpiSubCaption: {
    fontSize: 10,
    color: theme.textSecondary,
  },
  chartSection: {
    marginBottom: theme.spacing.xs,
  },
  fleetHeaderRow: {
    marginTop: theme.spacing.xs,
    marginBottom: theme.spacing.xs,
  },
  fleetSubtitle: {
    fontSize: 11,
    color: theme.textSecondary,
    marginTop: -4,
    marginBottom: theme.spacing.sm,
  },
  fleetCard: {
    flexDirection: 'row',
    backgroundColor: theme.card,
    borderRadius: theme.radii.lg,
    padding: theme.spacing.md,
    borderWidth: 1,
    borderColor: theme.border,
    marginBottom: theme.spacing.md,
    gap: theme.spacing.md,
    ...theme.shadows.card,
  },
  fleetThumb: {
    width: 90,
    height: 90,
    borderRadius: theme.radii.md,
    backgroundColor: theme.colors.slate[100],
  },
  fleetContentCol: {
    flex: 1,
    justifyContent: 'space-between',
  },
  fleetTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  categoryBadge: {
    backgroundColor: theme.colors.primary[50],
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: theme.radii.sm,
  },
  categoryBadgeText: {
    fontSize: 9,
    fontWeight: '700',
    color: theme.colors.primary[600],
  },
  statusPill: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: theme.radii.full,
  },
  statusPillRented: {
    backgroundColor: theme.colors.indigo[50],
  },
  statusPillAvailable: {
    backgroundColor: theme.colors.success[50],
  },
  statusPillText: {
    fontSize: 10,
    fontWeight: '700',
  },
  statusPillTextRented: {
    color: theme.colors.indigo[500],
  },
  statusPillTextAvailable: {
    color: theme.colors.success[600],
  },
  fleetName: {
    ...theme.typography.body,
    fontWeight: '700',
    marginTop: 2,
    lineHeight: 18,
  },
  fleetMetricsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginVertical: 4,
  },
  ratingBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
  },
  ratingText: {
    fontSize: 11,
    fontWeight: '700',
    color: theme.textPrimary,
  },
  metricDivider: {
    fontSize: 11,
    color: theme.textSecondary,
  },
  rentalCountText: {
    fontSize: 11,
    color: theme.textSecondary,
  },
  dailyPriceText: {
    fontSize: 11,
    fontWeight: '600',
    color: theme.colors.primary[600],
  },
  revenueRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: 4,
    borderTopWidth: 1,
    borderTopColor: theme.colors.slate[100],
  },
  revenueLabel: {
    fontSize: 11,
    color: theme.textSecondary,
  },
  revenueValue: {
    fontSize: 12,
    fontWeight: '800',
    color: theme.colors.success[600],
  },
});
