import React, { useEffect, useState, useCallback } from 'react';
import {
  ActivityIndicator,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  StatusBar,
  Platform,
  RefreshControl,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useSelector } from 'react-redux';
import { RootState } from '../../store';
import { RevenueChart } from '../../components/analytics/RevenueChart';
import { RevenueSummary } from '../../components/analytics/RevenueSummary';
import { UtilizationCard } from '../../components/analytics/UtilizationCard';
import { DeviceStats } from '../../components/analytics/DeviceStats';
import { RentalPaymentItem } from '../../components/analytics/RentalPaymentItem';
import {
  OwnerAnalyticsBooking,
  OwnerAnalyticsData,
  OwnerAnalyticsDevice,
  OwnerRevenueByDay,
  ownerAnalyticsService,
} from '../../services/ownerAnalyticsService';
import type { Period, RentalPayment, RevenueData } from '../../data/ownerAnalyticsMock';
import { theme, STRINGS, CONFIG } from '../../constants';

const WEEKDAYS = STRINGS.OWNER_ANALYTICS.WEEKDAYS;

const getBookingDate = (booking: OwnerAnalyticsBooking) =>
  new Date(booking.updatedAt || booking.endDate || booking.startDate);

const getChartData = (
  bookings: OwnerAnalyticsBooking[],
  revenueByDay: OwnerRevenueByDay[],
  period: Period,
): RevenueData[] => {
  const today = new Date();

  if (period === 'week') {
    if (revenueByDay.length > 0) {
      return revenueByDay.map((item) => ({ label: item.day, revenue: item.revenue }));
    }

    return Array.from({ length: 7 }, (_, index) => {
      const day = new Date(today);
      day.setDate(today.getDate() - 6 + index);
      day.setHours(0, 0, 0, 0);
      const nextDay = new Date(day);
      nextDay.setDate(day.getDate() + 1);

      return {
        label: WEEKDAYS[day.getDay()],
        revenue: bookings.reduce((sum, booking) => {
          const bookingDate = getBookingDate(booking);
          return bookingDate >= day && bookingDate < nextDay
            ? sum + Number(booking.rentalFee || 0)
            : sum;
        }, 0),
      };
    });
  }

  return Array.from({ length: 5 }, (_, index) => ({
    label: `Week ${index + 1}`,
    revenue: bookings.reduce((sum, booking) => {
      const bookingDate = getBookingDate(booking);
      const isCurrentMonth =
        bookingDate.getFullYear() === today.getFullYear() &&
        bookingDate.getMonth() === today.getMonth();
      const bookingWeek = Math.floor((bookingDate.getDate() - 1) / 7);

      return isCurrentMonth && bookingWeek === index
        ? sum + Number(booking.rentalFee || 0)
        : sum;
    }, 0),
  }));
};

const formatDate = (dateValue?: string | null) => {
  if (!dateValue) return '-';
  const date = new Date(dateValue);
  return Number.isNaN(date.getTime()) ? '-' : date.toLocaleDateString('en-US');
};

interface OwnerAnalyticsScreenProps {
  onBackToHome?: () => void;
  onOpenDrawer?: () => void;
  navigation?: any;
  onNavigateToDeviceDetail?: (deviceId: string) => void;
}

export function OwnerAnalyticsScreen({
  onBackToHome,
  onOpenDrawer,
  navigation,
}: OwnerAnalyticsScreenProps) {
  const insets = useSafeAreaInsets();
  const token = useSelector((state: RootState) => state.auth.token);
  const role = useSelector((state: RootState) => state.auth.user?.role);
  const [period, setPeriod] = useState('week' as Period);
  const [isLoading, setIsLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [analytics, setAnalytics] = useState(null as OwnerAnalyticsData | null);
  const [errorMessage, setErrorMessage] = useState('');

  // Safe Area Insets calculation for iOS notch & Android status bar
  const topInset = Math.max(
    insets.top,
    Platform.OS === 'android' ? StatusBar.currentHeight || 24 : 20
  );
  const bottomInset = Math.max(insets.bottom, 16) + 32;

  const fetchAnalytics = useCallback(async () => {
    if (!token || role !== 'owner') {
      setAnalytics(null);
      setErrorMessage(token ? 'Owner access required.' : 'Please log in again.');
      setIsLoading(false);
      return;
    }

    try {
      const data = await ownerAnalyticsService.getOwnerAnalytics(token);
      setAnalytics(data);
      setErrorMessage('');
    } catch (error: any) {
      setErrorMessage(
        error?.response?.data?.message || error?.message || 'Unable to load analytics data.',
      );
    } finally {
      setIsLoading(false);
      setRefreshing(false);
    }
  }, [token, role]);

  useEffect(() => {
    setIsLoading(true);
    fetchAnalytics();
  }, [fetchAnalytics]);

  const onRefresh = () => {
    setRefreshing(true);
    fetchAnalytics();
  };

  const devices: OwnerAnalyticsDevice[] = analytics?.devices || [];
  const bookings: OwnerAnalyticsBooking[] = analytics?.bookings || [];
  const totalDevices = analytics?.totalDevices ?? devices.length;
  const rentedDevices = analytics?.rentedDevices ?? 0;
  const availableDevices = devices.filter((device) => device.status === 'available').length;
  const utilizationRate = totalDevices
    ? Math.round((rentedDevices / totalDevices) * 100)
    : 0;
  const chartData = getChartData(bookings, analytics?.revenueByDay || [], period);
  const deviceById = new Map(devices.map((device) => [device._id, device]));
  const rentalPayments: RentalPayment[] = bookings.map((booking) => {
    const deviceReference = typeof booking.deviceId === 'string' ? null : booking.deviceId;
    const renterReference = typeof booking.renterId === 'string' ? null : booking.renterId;
    const deviceId =
      typeof booking.deviceId === 'string' ? booking.deviceId : booking.deviceId._id;
    const bookingDate = booking.updatedAt || booking.endDate || booking.startDate;

    return {
      id: booking._id,
      deviceName: deviceReference?.name || deviceById.get(deviceId)?.name || 'Tech Device',
      renterName: renterReference?.name || 'Renter',
      amount: Number(booking.rentalFee || 0),
      date: formatDate(bookingDate),
      status: 'completed',
    };
  });

  return (
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor={theme.card} />

      {/* ── TOP BAR CỐ ĐỊNH: NÚT MENU BÊN TRÁI, BỎ NÚT BACK ── */}
      <View style={[styles.topBar, { paddingTop: topInset + theme.spacing.sm }]}>
        <View style={styles.topBarLeft}>
          <TouchableOpacity
            accessibilityRole="button"
            accessibilityLabel={STRINGS.OWNER_ANALYTICS.MENU_ACCESSIBILITY_LABEL}
            onPress={() => {
              if (onOpenDrawer) {
                onOpenDrawer();
              } else if (navigation?.openDrawer) {
                navigation.openDrawer();
              }
            }}
            style={styles.hamburgerButton}
            activeOpacity={CONFIG.ANIMATION.ACTIVE_OPACITY_BUTTON}
          >
            <Ionicons name="menu-outline" size={24} color={theme.textPrimary} />
          </TouchableOpacity>
          <View style={styles.topBarTitleCol}>
            <Text style={styles.topBarTitle}>{STRINGS.OWNER_ANALYTICS.TOP_BAR_TITLE}</Text>
            <Text style={styles.topBarSubtitle}>{STRINGS.OWNER_ANALYTICS.TOP_BAR_SUBTITLE}</Text>
          </View>
        </View>
      </View>

      {/* ── NỘI DUNG CHÍNH ── */}
      {role !== 'owner' ? (
        <View style={styles.stateContainer}>
          <View style={styles.stateIconCircle}>
            <Ionicons name="lock-closed-outline" size={36} color={theme.danger} />
          </View>
          <Text style={styles.stateTitle}>{STRINGS.OWNER_ANALYTICS.ROLE_REQUIRED_TITLE}</Text>
          <Text style={styles.stateSubtitle}>{STRINGS.OWNER_ANALYTICS.ROLE_REQUIRED_SUBTITLE}</Text>
        </View>
      ) : isLoading ? (
        <View style={styles.stateContainer}>
          <ActivityIndicator size="large" color={theme.primary} />
          <Text style={styles.loadingText}>{STRINGS.OWNER_ANALYTICS.LOADING_TEXT}</Text>
        </View>
      ) : errorMessage && !analytics ? (
        <View style={styles.stateContainer}>
          <View style={styles.stateIconCircle}>
            <Ionicons name="alert-circle-outline" size={36} color={theme.danger} />
          </View>
          <Text style={styles.stateTitle}>{STRINGS.OWNER_ANALYTICS.ERROR_TITLE}</Text>
          <Text style={styles.stateSubtitle}>{errorMessage}</Text>
          <TouchableOpacity
            accessibilityRole="button"
            onPress={fetchAnalytics}
            style={styles.retryButton}
            activeOpacity={CONFIG.ANIMATION.ACTIVE_OPACITY_BUTTON}
          >
            <Text style={styles.retryButtonText}>{STRINGS.COMMON.RETRY}</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={[styles.scrollContent, { paddingBottom: bottomInset }]}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              colors={[theme.primary]}
              tintColor={theme.primary}
            />
          }
        >
          {/* 1. Tổng doanh thu tích lũy */}
          <RevenueSummary totalRevenue={analytics?.totalRevenue || 0} />

          {/* 2. Biến động doanh thu theo chu kỳ */}
          <View style={styles.section}>
            <View style={styles.sectionHeading}>
              <View style={styles.sectionTitleRow}>
                <Ionicons name="bar-chart-outline" size={17} color={theme.primary} />
                <Text style={styles.sectionTitle}>{STRINGS.OWNER_ANALYTICS.SECTION_REVENUE_TREND}</Text>
              </View>

              {/* Pill-shaped Period Selector theo theme-skill.md */}
              <View style={styles.periodControl}>
                <TouchableOpacity
                  accessibilityRole="button"
                  accessibilityState={{ selected: period === 'week' }}
                  onPress={() => setPeriod('week')}
                  style={[
                    styles.periodButton,
                    period === 'week' && styles.periodButtonSelected,
                  ]}
                  activeOpacity={CONFIG.ANIMATION.ACTIVE_OPACITY_PILL}
                >
                  <Text
                    style={[
                      styles.periodText,
                      period === 'week' && styles.periodTextSelected,
                    ]}
                  >
                    {STRINGS.OWNER_DASHBOARD.PERIOD_WEEK}
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  accessibilityRole="button"
                  accessibilityState={{ selected: period === 'month' }}
                  onPress={() => setPeriod('month')}
                  style={[
                    styles.periodButton,
                    period === 'month' && styles.periodButtonSelected,
                  ]}
                  activeOpacity={CONFIG.ANIMATION.ACTIVE_OPACITY_PILL}
                >
                  <Text
                    style={[
                      styles.periodText,
                      period === 'month' && styles.periodTextSelected,
                    ]}
                  >
                    {STRINGS.OWNER_DASHBOARD.PERIOD_MONTH}
                  </Text>
                </TouchableOpacity>
              </View>
            </View>
            <RevenueChart data={chartData} period={period} />
          </View>

          {/* 3. Hiệu suất khai thác kho máy */}
          <View style={styles.section}>
            <View style={styles.sectionTitleRow}>
              <Ionicons name="pie-chart-outline" size={17} color={theme.primary} />
              <Text style={styles.sectionTitle}>{STRINGS.OWNER_ANALYTICS.SECTION_UTILIZATION}</Text>
            </View>
            <UtilizationCard
              utilizationRate={utilizationRate}
              rentedDevices={rentedDevices}
              totalDevices={totalDevices}
            />
          </View>

          {/* 4. Thống kê tình trạng thiết bị */}
          <View style={styles.section}>
            <View style={styles.sectionTitleRow}>
              <Ionicons name="cube-outline" size={17} color={theme.primary} />
              <Text style={styles.sectionTitle}>{STRINGS.OWNER_ANALYTICS.SECTION_DEVICE_STATS}</Text>
            </View>
            <DeviceStats statistics={{ totalDevices, rentedDevices, availableDevices }} />
          </View>

          {/* 5. Lịch sử thanh toán & Sao kê dòng tiền */}
          <View style={styles.section}>
            <View style={styles.sectionTitleRow}>
              <Ionicons name="receipt-outline" size={17} color={theme.primary} />
              <Text style={styles.sectionTitle}>{STRINGS.OWNER_ANALYTICS.SECTION_PAYMENT_HISTORY}</Text>
            </View>
            {rentalPayments.length === 0 ? (
              <View style={styles.emptyState}>
                <Ionicons
                  name="receipt-outline"
                  size={36}
                  color={theme.textMuted}
                />
                <Text style={styles.emptyTitle}>{STRINGS.OWNER_ANALYTICS.EMPTY_PAYMENT_TITLE}</Text>
                <Text style={styles.emptyText}>{STRINGS.OWNER_ANALYTICS.EMPTY_PAYMENT_DESC}</Text>
              </View>
            ) : (
              <View style={styles.paymentList}>
                {rentalPayments.map((item: RentalPayment) => (
                  <View key={item.id} style={{ marginBottom: theme.spacing.sm + 2 }}>
                    <RentalPaymentItem payment={item} />
                  </View>
                ))}
              </View>
            )}
          </View>
        </ScrollView>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.background,
  },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: theme.spacing.lg,
    paddingBottom: theme.spacing.md,
    backgroundColor: theme.card,
    borderBottomWidth: 1,
    borderBottomColor: theme.borderSubtle,
    ...theme.shadows.subtle,
  },
  topBarLeft: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.md,
  },
  hamburgerButton: {
    width: 38,
    height: 38,
    borderRadius: theme.radii.base,
    backgroundColor: theme.background,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: theme.borderSubtle,
  },
  topBarTitleCol: {
    flex: 1,
  },
  topBarTitle: {
    fontSize: theme.typography.sizes.title,
    fontWeight: theme.typography.weights.bold,
    color: theme.textPrimary,
  },
  topBarSubtitle: {
    fontSize: theme.typography.sizes.caption,
    color: theme.textSecondary,
    fontWeight: theme.typography.weights.medium,
    marginTop: 2,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: theme.spacing.lg,
  },
  section: {
    marginTop: theme.spacing.xl,
  },
  sectionHeading: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: theme.spacing.md,
  },
  sectionTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.xs + 2,
    marginBottom: theme.spacing.sm + 2,
  },
  sectionTitle: {
    fontSize: theme.typography.sizes.base,
    fontWeight: theme.typography.weights.bold,
    color: theme.textPrimary,
  },
  // Pill Selector theo theme-skill.md Rule 2
  periodControl: {
    flexDirection: 'row',
    backgroundColor: theme.borderSubtle,
    borderRadius: theme.radii.full,
    padding: 3,
    borderWidth: 1,
    borderColor: theme.borderDefault,
  },
  periodButton: {
    paddingHorizontal: theme.spacing.md,
    paddingVertical: 5,
    borderRadius: theme.radii.full,
  },
  periodButtonSelected: {
    backgroundColor: theme.primaryLight,
  },
  periodText: {
    fontSize: theme.typography.sizes.caption,
    fontWeight: theme.typography.weights.semibold,
    color: theme.textSecondary,
  },
  periodTextSelected: {
    color: theme.primaryDark,
    fontWeight: theme.typography.weights.bold,
  },
  stateContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: theme.spacing.sm,
    backgroundColor: theme.background,
    padding: theme.spacing['2xl'],
  },
  stateIconCircle: {
    width: 64,
    height: 64,
    borderRadius: theme.radii.full,
    backgroundColor: theme.dangerLight,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: theme.spacing.sm,
  },
  stateTitle: {
    fontSize: theme.typography.sizes.title,
    fontWeight: theme.typography.weights.bold,
    color: theme.textPrimary,
  },
  stateSubtitle: {
    fontSize: theme.typography.sizes.body,
    color: theme.textSecondary,
    textAlign: 'center',
    maxWidth: 280,
  },
  loadingText: {
    fontSize: theme.typography.sizes.body,
    color: theme.textSecondary,
    fontWeight: theme.typography.weights.medium,
    marginTop: theme.spacing.sm + 2,
  },
  retryButton: {
    paddingHorizontal: theme.spacing.xl,
    paddingVertical: 10,
    borderRadius: theme.radii.full,
    backgroundColor: theme.primary,
    marginTop: theme.spacing.md,
  },
  retryButtonText: {
    fontSize: theme.typography.sizes.body,
    fontWeight: theme.typography.weights.bold,
    color: theme.white,
  },
  emptyState: {
    minHeight: 140,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: theme.card,
    borderRadius: theme.radii.lg,
    borderWidth: 1,
    borderColor: theme.borderSubtle,
    padding: theme.spacing['2xl'],
    ...theme.shadows.subtle,
  },
  emptyTitle: {
    fontSize: theme.typography.sizes.body,
    fontWeight: theme.typography.weights.bold,
    color: theme.textPrimary,
    marginTop: theme.spacing.xs,
  },
  emptyText: {
    fontSize: theme.typography.sizes.bodySm,
    color: theme.textSecondary,
    textAlign: 'center',
  },
  paymentList: {
    marginTop: 2,
  },
});

