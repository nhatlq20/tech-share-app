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
import { colors } from '../../theme/colors';

// ── DESIGN TOKENS (theme-skill.md via theme/colors) ──
const palette = colors.light;
const PRIMARY_TEAL = palette.primary;
const PASTEL_TEAL = palette.primaryLight;
const BRAND_DARK = palette.primaryDark;
const BG_SLATE = palette.background;
const CARD_BG = palette.surface;
const BORDER_SUBTLE = palette.border;
const BORDER_COLOR = palette.borderDefault;
const TEXT_PRIMARY = palette.textPrimary;
const TEXT_SECONDARY = palette.textSecondary;
const TEXT_MUTED = palette.textMuted;
const DANGER_RED = palette.danger;

const VN_WEEKDAYS = ['CN', 'T2', 'T3', 'T4', 'T5', 'T6', 'T7'];

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
        label: VN_WEEKDAYS[day.getDay()],
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
    label: `Tuần ${index + 1}`,
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
  return Number.isNaN(date.getTime()) ? '-' : date.toLocaleDateString('vi-VN');
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

  // Tính toán Safe Area Insets chính xác cho iOS notch & Android status bar
  const topInset = Math.max(
    insets.top,
    Platform.OS === 'android' ? StatusBar.currentHeight || 24 : 20
  );
  const bottomInset = Math.max(insets.bottom, 16) + 32;

  const fetchAnalytics = useCallback(async () => {
    if (!token || role !== 'owner') {
      setAnalytics(null);
      setErrorMessage(token ? 'Yêu cầu quyền truy cập Chủ máy.' : 'Vui lòng đăng nhập lại.');
      setIsLoading(false);
      return;
    }

    try {
      const data = await ownerAnalyticsService.getOwnerAnalytics(token);
      setAnalytics(data);
      setErrorMessage('');
    } catch (error: any) {
      setErrorMessage(
        error?.response?.data?.message || error?.message || 'Không thể tải dữ liệu phân tích.',
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
      deviceName: deviceReference?.name || deviceById.get(deviceId)?.name || 'Thiết bị công nghệ',
      renterName: renterReference?.name || 'Khách thuê',
      amount: Number(booking.rentalFee || 0),
      date: formatDate(bookingDate),
      status: 'completed',
    };
  });

  return (
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#FFFFFF" />

      {/* ── TOP BAR CỐ ĐỊNH: NÚT MENU BÊN TRÁI, BỎ NÚT BACK ── */}
      <View style={[styles.topBar, { paddingTop: topInset + 8 }]}>
        <View style={styles.topBarLeft}>
          <TouchableOpacity
            accessibilityRole="button"
            accessibilityLabel="Mở menu quản lý chủ máy"
            onPress={() => {
              if (onOpenDrawer) {
                onOpenDrawer();
              } else if (navigation?.openDrawer) {
                navigation.openDrawer();
              }
            }}
            style={styles.hamburgerButton}
            activeOpacity={0.7}
          >
            <Ionicons name="menu-outline" size={24} color={TEXT_PRIMARY} />
          </TouchableOpacity>
          <View style={styles.topBarTitleCol}>
            <Text style={styles.topBarTitle}>Doanh Thu & Phân Tích</Text>
            <Text style={styles.topBarSubtitle}>Báo cáo dòng tiền & hiệu suất cho thuê</Text>
          </View>
        </View>
      </View>

      {/* ── NỘI DUNG CHÍNH ── */}
      {role !== 'owner' ? (
        <View style={styles.stateContainer}>
          <View style={styles.stateIconCircle}>
            <Ionicons name="lock-closed-outline" size={36} color={DANGER_RED} />
          </View>
          <Text style={styles.stateTitle}>Yêu cầu quyền Chủ máy</Text>
          <Text style={styles.stateSubtitle}>Bạn cần đăng nhập tài khoản có quyền Chủ máy để xem trang này.</Text>
        </View>
      ) : isLoading ? (
        <View style={styles.stateContainer}>
          <ActivityIndicator size="large" color={PRIMARY_TEAL} />
          <Text style={styles.loadingText}>Đang tải dữ liệu phân tích doanh thu...</Text>
        </View>
      ) : errorMessage && !analytics ? (
        <View style={styles.stateContainer}>
          <View style={styles.stateIconCircle}>
            <Ionicons name="alert-circle-outline" size={36} color={DANGER_RED} />
          </View>
          <Text style={styles.stateTitle}>Không thể tải dữ liệu</Text>
          <Text style={styles.stateSubtitle}>{errorMessage}</Text>
          <TouchableOpacity
            accessibilityRole="button"
            onPress={fetchAnalytics}
            style={styles.retryButton}
            activeOpacity={0.8}
          >
            <Text style={styles.retryButtonText}>Thử lại</Text>
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
              colors={[PRIMARY_TEAL]}
              tintColor={PRIMARY_TEAL}
            />
          }
        >
          {/* 1. Tổng doanh thu tích lũy */}
          <RevenueSummary totalRevenue={analytics?.totalRevenue || 0} />

          {/* 2. Biến động doanh thu theo chu kỳ */}
          <View style={styles.section}>
            <View style={styles.sectionHeading}>
              <View style={styles.sectionTitleRow}>
                <Ionicons name="bar-chart-outline" size={17} color={PRIMARY_TEAL} />
                <Text style={styles.sectionTitle}>Biến Động Doanh Thu</Text>
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
                  activeOpacity={0.8}
                >
                  <Text
                    style={[
                      styles.periodText,
                      period === 'week' && styles.periodTextSelected,
                    ]}
                  >
                    Tuần
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
                  activeOpacity={0.8}
                >
                  <Text
                    style={[
                      styles.periodText,
                      period === 'month' && styles.periodTextSelected,
                    ]}
                  >
                    Tháng
                  </Text>
                </TouchableOpacity>
              </View>
            </View>
            <RevenueChart data={chartData} period={period} />
          </View>

          {/* 3. Hiệu suất khai thác kho máy */}
          <View style={styles.section}>
            <View style={styles.sectionTitleRow}>
              <Ionicons name="pie-chart-outline" size={17} color={PRIMARY_TEAL} />
              <Text style={styles.sectionTitle}>Hiệu Suất Khai Thác Kho Máy</Text>
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
              <Ionicons name="cube-outline" size={17} color={PRIMARY_TEAL} />
              <Text style={styles.sectionTitle}>Thống Kê Tình Trạng Thiết Bị</Text>
            </View>
            <DeviceStats statistics={{ totalDevices, rentedDevices, availableDevices }} />
          </View>

          {/* 5. Lịch sử thanh toán & Sao kê dòng tiền */}
          <View style={styles.section}>
            <View style={styles.sectionTitleRow}>
              <Ionicons name="receipt-outline" size={17} color={PRIMARY_TEAL} />
              <Text style={styles.sectionTitle}>Lịch Sử Thanh Toán & Sao Kê</Text>
            </View>
            {rentalPayments.length === 0 ? (
              <View style={styles.emptyState}>
                <Ionicons
                  name="receipt-outline"
                  size={36}
                  color={TEXT_MUTED}
                />
                <Text style={styles.emptyTitle}>Chưa có giao dịch thanh toán</Text>
                <Text style={styles.emptyText}>Các khoản thu tiền từ đơn thuê sẽ xuất hiện tại đây.</Text>
              </View>
            ) : (
              <View style={styles.paymentList}>
                {rentalPayments.map((item: RentalPayment) => (
                  <View key={item.id} style={{ marginBottom: 10 }}>
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
    backgroundColor: BG_SLATE,
  },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingBottom: 12,
    backgroundColor: CARD_BG,
    borderBottomWidth: 1,
    borderBottomColor: BORDER_SUBTLE,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.03,
    shadowRadius: 4,
    elevation: 2,
  },
  topBarLeft: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  hamburgerButton: {
    width: 38,
    height: 38,
    borderRadius: 12,
    backgroundColor: BG_SLATE,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: BORDER_SUBTLE,
  },
  topBarTitleCol: {
    flex: 1,
  },
  topBarTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: TEXT_PRIMARY,
  },
  topBarSubtitle: {
    fontSize: 11,
    color: TEXT_SECONDARY,
    fontWeight: '500',
    marginTop: 2,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: 16,
  },
  section: {
    marginTop: 20,
  },
  sectionHeading: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  sectionTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 10,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: TEXT_PRIMARY,
  },
  // Pill Selector theo theme-skill.md Rule 2
  periodControl: {
    flexDirection: 'row',
    backgroundColor: BORDER_SUBTLE,
    borderRadius: 9999,
    padding: 3,
    borderWidth: 1,
    borderColor: BORDER_COLOR,
  },
  periodButton: {
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 9999,
  },
  periodButtonSelected: {
    backgroundColor: PASTEL_TEAL,
  },
  periodText: {
    fontSize: 11,
    fontWeight: '600',
    color: TEXT_SECONDARY,
  },
  periodTextSelected: {
    color: BRAND_DARK,
    fontWeight: '700',
  },
  stateContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: BG_SLATE,
    padding: 24,
  },
  stateIconCircle: {
    width: 64,
    height: 64,
    borderRadius: 9999,
    backgroundColor: '#FEE2E2',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  stateTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: TEXT_PRIMARY,
  },
  stateSubtitle: {
    fontSize: 13,
    color: TEXT_SECONDARY,
    textAlign: 'center',
    maxWidth: 280,
  },
  loadingText: {
    fontSize: 13,
    color: TEXT_SECONDARY,
    fontWeight: '500',
    marginTop: 10,
  },
  retryButton: {
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 9999,
    backgroundColor: PRIMARY_TEAL,
    marginTop: 12,
  },
  retryButtonText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  emptyState: {
    minHeight: 140,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: CARD_BG,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: BORDER_SUBTLE,
    padding: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.03,
    shadowRadius: 4,
    elevation: 1,
  },
  emptyTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: TEXT_PRIMARY,
    marginTop: 4,
  },
  emptyText: {
    fontSize: 12,
    color: TEXT_SECONDARY,
    textAlign: 'center',
  },
  paymentList: {
    marginTop: 2,
  },
});

