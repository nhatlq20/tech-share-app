import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  StyleSheet,
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  Image,
  Alert,
  Switch,
  RefreshControl,
  ActivityIndicator,
  Platform,
  StatusBar,
  Animated,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { theme } from '../../constants/theme';
import { useAppSelector } from '../../store';
import { socketService } from '../../services/socketService';
import {
  ownerAnalyticsService,
  OwnerAnalyticsData,
} from '../../services/ownerAnalyticsService';
import { bookingService, Booking } from '../../services/bookingService';
import { OwnerAnalyticsResponse, FleetDeviceItem } from '../../types';

import { RevenueChart } from '../../components/owner/RevenueChart';
import { LogoutConfirmModal } from '../../components/common/LogoutConfirmModal';

interface OwnerDashboardScreenProps {
  route?: any;
  navigation?: any;
  onBackToHome?: () => void;
  onNavigateToDeviceDetail?: (deviceId: string) => void;
  onNavigateToPostDevice?: () => void;
  onLogout?: () => void;
  onOpenDrawer?: () => void;
  onNavigateToNotifications?: () => void;
}

type PeriodType = 'week' | 'month';
type DeviceFilterType = 'all' | 'rented' | 'available';

const mapAnalyticsToDashboard = (
  data: OwnerAnalyticsData,
  period: PeriodType,
): OwnerAnalyticsResponse => {
  const devices = data.devices || [];
  const bookings = data.bookings || [];
  const rentedDevices = devices.filter((device) => device.status === 'rented').length;
  const availableDevices = devices.filter((device) => device.status === 'available').length;
  const totalDevices = data.totalDevices ?? devices.length;

  const chartItems = period === 'week'
    ? (data.revenueByDay || []).map((item) => ({ label: item.day, revenue: item.revenue }))
    : Array.from({ length: 5 }, (_, index) => ({
        label: `Week ${index + 1}`,
        revenue: bookings.reduce((sum, booking) => {
          const bookingDate = new Date(booking.updatedAt || booking.endDate || booking.startDate);
          const isCurrentMonth =
            bookingDate.getFullYear() === new Date().getFullYear() &&
            bookingDate.getMonth() === new Date().getMonth();
          const bookingWeek = Math.floor((bookingDate.getDate() - 1) / 7);
          return isCurrentMonth && bookingWeek === index
            ? sum + Number(booking.rentalFee || 0)
            : sum;
        }, 0),
      }));

  const fleet: FleetDeviceItem[] = devices.map((device) => ({
    _id: device._id,
    name: device.name,
    brand: device.brand || '',
    category: device.category || '',
    imageUrl: device.images?.[0] || '',
    pricePerDay: device.pricePerDay || 0,
    rentalCount: device.rentalCount || 0,
    ratingAvg: device.ratingAvg || 0,
    revenueTotal: device.revenueTotal || 0,
    status: device.status,
  }));

  return {
    overview: {
      totalRevenue: data.totalRevenue || 0,
      activeRentals: rentedDevices,
      escrowHolding: 0,
      utilizationRate: totalDevices ? (rentedDevices / totalDevices) * 100 : 0,
    },
    revenueChart: {
      period,
      labels: chartItems.map((item) => item.label),
      datasets: [{ data: chartItems.map((item) => item.revenue) }],
    },
    fleet,
  };
};

export function OwnerDashboardScreen({
  route,
  navigation,
  onBackToHome,
  onNavigateToDeviceDetail,
  onNavigateToPostDevice,
  onLogout,
  onOpenDrawer,
  onNavigateToNotifications,
}: OwnerDashboardScreenProps) {
  const insets = useSafeAreaInsets();
  const currentUser = useAppSelector((state) => state.auth.user);
  const unreadCount = useAppSelector((state) => state.notifications?.unreadCount ?? 0);

  const notifScale = useRef(new Animated.Value(1)).current;
  const prevUnreadRef = useRef(unreadCount);

  // Hiệu ứng nhảy số khi có thông báo mới tới cho Owner
  useEffect(() => {
    if (unreadCount > prevUnreadRef.current) {
      Animated.sequence([
        Animated.timing(notifScale, {
          toValue: 1.45,
          duration: 160,
          useNativeDriver: true,
        }),
        Animated.spring(notifScale, {
          toValue: 1,
          friction: 4,
          tension: 70,
          useNativeDriver: true,
        }),
      ]).start();
    }
    prevUnreadRef.current = unreadCount;
  }, [unreadCount, notifScale]);

  const scrollViewRef: any = useRef(null);
  const sectionLayouts: any = useRef({});

  const [showLogoutModal, setShowLogoutModal] = useState(false);
  const token = useAppSelector((state) => state.auth.token);

  // State quản lý số liệu phân tích
  const [period, setPeriod] = useState('week' as PeriodType);
  const [analyticsData, setAnalyticsData] = useState({
    overview: {
      totalRevenue: 0,
      activeRentals: 0,
      escrowHolding: 0,
      utilizationRate: 0,
    },
    revenueChart: { period: 'week', labels: [], datasets: [{ data: [] }] },
    fleet: [],
  } as OwnerAnalyticsResponse);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  // State quản lý danh sách đơn thuê thật từ DB
  const [ownerBookings, setOwnerBookings] = useState([] as Booking[]);
  const [loadingOrders, setLoadingOrders] = useState(false);

  // State quản lý danh sách thiết bị kho máy
  const [deviceFilter, setDeviceFilter] = useState('all' as DeviceFilterType);
  const [fleetList, setFleetList] = useState([] as FleetDeviceItem[]);

  // Gọi API lấy dữ liệu thống kê
  const fetchAnalytics = useCallback(async (selectedPeriod: PeriodType) => {
    if (!token) return;

    try {
      const response = await ownerAnalyticsService.getOwnerAnalytics(token);
      const res = mapAnalyticsToDashboard(response, selectedPeriod);
      if (res) {
        setAnalyticsData(res);
        setFleetList(res.fleet);
      }
    } catch (error) {
      console.warn('⚠️ [OwnerDashboardScreen] Lỗi khi tải thống kê:', error);
    }
  }, [token]);

  // Gọi API lấy danh sách đơn thuê thật của chủ máy
  const fetchOwnerOrders = useCallback(async () => {
    try {
      setLoadingOrders(true);
      const data = await bookingService.getOwnerBookings();
      setOwnerBookings(data || []);
    } catch (error) {
      console.warn('⚠️ [OwnerDashboardScreen] Lỗi khi tải danh sách đơn thuê:', error);
    } finally {
      setLoadingOrders(false);
    }
  }, []);

  useEffect(() => {
    setLoading(true);
    Promise.all([
      fetchAnalytics(period),
      fetchOwnerOrders(),
    ]).finally(() => setLoading(false));
  }, [fetchAnalytics, fetchOwnerOrders, period]);

  // Lắng nghe thông báo đơn mới hoặc đổi trạng thái để tự động cập nhật danh sách đơn thật
  useEffect(() => {
    const unsub = socketService.onNewNotification((notif) => {
      if (notif.type === 'order' || notif.type === 'reminder') {
        fetchOwnerOrders();
        fetchAnalytics(period);
      }
    });
    return () => unsub();
  }, [fetchOwnerOrders, fetchAnalytics, period]);

  // Cuộn tới vị trí section được chọn từ Sidebar
  useEffect(() => {
    const target = route?.params?.initialSection;
    if (target && typeof sectionLayouts.current[target] === 'number') {
      scrollViewRef.current?.scrollTo({
        y: Math.max(0, sectionLayouts.current[target] - 12),
        animated: true,
      });
    }
  }, [route?.params?.initialSection, route?.params?._t]);

  const onRefresh = async () => {
    setRefreshing(true);
    await Promise.all([
      fetchAnalytics(period),
      fetchOwnerOrders(),
    ]);
    setRefreshing(false);
  };

  const overview = analyticsData.overview;
  const chartData = analyticsData.revenueChart;

  // Xử lý bật / tắt cho thuê nhanh thiết bị
  const toggleDeviceAvailability = (id: string) => {
    setFleetList((prev: FleetDeviceItem[]) =>
      prev.map((item: FleetDeviceItem) =>
        item._id === id
          ? {
              ...item,
              status: item.status === 'available' ? 'hidden' : 'available',
            }
          : item
      )
    );
  };

  // Xử lý Rút tiền
  const handleWithdraw = () => {
    const formatted = (overview.totalRevenue || 5200000).toLocaleString('vi-VN');
    Alert.alert(
      'Yêu cầu rút tiền về ngân hàng 💳',
      `Số dư khả dụng hiện tại: ${formatted} đ.\nLệnh rút tiền về tài khoản ngân hàng liên kết Vietcombank (*8899) đang được xử lý trong 5-10 phút.`,
      [{ text: 'Xác nhận' }]
    );
  };

  // Lọc thiết bị
  const filteredFleet = fleetList.filter((d: FleetDeviceItem) => {
    if (deviceFilter === 'rented') return d.status === 'rented';
    if (deviceFilter === 'available') return d.status === 'available';
    return true;
  });

  return (
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor={theme.card} />

      {/* ── 0. THANH TIÊU ĐỀ CỐ ĐỊNH PHÍA TRÊN (STICKY TOP BAR CÓ SAFE AREA) ── */}
      <View
        style={[
          styles.topBar,
          {
            paddingTop:
              Math.max(
                insets.top,
                Platform.OS === 'android' ? StatusBar.currentHeight || 24 : 20
              ) + 8,
          },
        ]}
      >
        <View style={styles.topBarLeft}>
          <TouchableOpacity
            style={styles.hamburgerButton}
            onPress={() => {
              if (onOpenDrawer) {
                onOpenDrawer();
              } else if (navigation?.openDrawer) {
                navigation.openDrawer();
              }
            }}
            activeOpacity={0.7}
            accessibilityLabel="Mở menu quản lý chủ máy"
          >
            <Ionicons name="menu-outline" size={24} color={theme.textPrimary} />
          </TouchableOpacity>
          <View>
            <Text style={styles.topBarTitle}>Owner Hub</Text>
            <Text style={styles.topBarSubtitle}>Quản lý kinh doanh & kho máy</Text>
          </View>
        </View>

        <View style={styles.topBarRight}>
          {/* Nút thông báo quả chuông với badge nhảy số */}
          <TouchableOpacity
            style={styles.notificationButton}
            onPress={() => {
              if (onNavigateToNotifications) {
                onNavigateToNotifications();
              } else if (navigation?.navigate) {
                navigation.navigate('Notification', { from: 'owner' });
              }
            }}
            activeOpacity={0.7}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            accessibilityLabel="Xem thông báo"
          >
            <Ionicons name="notifications-outline" size={22} color={theme.textPrimary} />
            {unreadCount > 0 && (
              <Animated.View
                style={[
                  styles.notifBadge,
                  {
                    transform: [{ scale: notifScale }],
                  },
                ]}
              >
                <Text style={styles.notifBadgeText}>
                  {unreadCount > 99 ? '99+' : String(unreadCount)}
                </Text>
              </Animated.View>
            )}
          </TouchableOpacity>

          {onBackToHome && (
            <TouchableOpacity
              style={styles.switchModeButton}
              onPress={onBackToHome}
              activeOpacity={0.8}
            >
              <Ionicons
                name="swap-horizontal"
                size={14}
                color={theme.colors.primary[600]}
              />
              <Text style={styles.switchModeText}>Đi thuê</Text>
            </TouchableOpacity>
          )}
        </View>
      </View>

      <ScrollView
        ref={scrollViewRef}
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            colors={[theme.colors.primary[500]]}
            tintColor={theme.colors.primary[500]}
          />
        }
      >
        {/* ── 1. KHỐI HEADER: ĐỊNH DANH & CẤP BẬC UY TÍN ── */}
        <View
          style={styles.headerCard}
          onLayout={(e: any) => {
            sectionLayouts.current.overview = e.nativeEvent.layout.y;
          }}
        >
        <View style={styles.headerTop}>
          <View style={styles.ownerProfileRow}>
            <Image
              source={{
                uri:
                  currentUser?.avatar ||
                  'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=400',
              }}
              style={styles.ownerAvatar}
            />
            <View style={styles.ownerMetaCol}>
              <View style={styles.nameRow}>
                <Text style={styles.ownerName} numberOfLines={1}>
                  {currentUser?.name || 'Minh Tuấn Tech'}
                </Text>
                <Ionicons
                  name="checkmark-circle"
                  size={16}
                  color={theme.colors.primary[500]}
                />
              </View>

              <View style={styles.badgeRow}>
                <View style={styles.ratingBadge}>
                  <Ionicons name="star" size={12} color={theme.colors.warning[500]} />
                  <Text style={styles.ratingText}>4.9 (28)</Text>
                </View>

                <View style={styles.trustScoreBadge}>
                  <Ionicons
                    name="shield-checkmark"
                    size={11}
                    color={theme.colors.success[600]}
                  />
                  <Text style={styles.trustScoreText}>
                    Uy tín: {currentUser?.trustScore || 100}
                  </Text>
                </View>

                <View style={styles.topOwnerBadge}>
                  <Text style={styles.topOwnerBadgeText}>Top Owner</Text>
                </View>
              </View>
            </View>
          </View>

          {/* Cụm nút đăng máy & đăng xuất */}
          <View style={styles.headerActionsCol}>
            {onNavigateToPostDevice && (
              <TouchableOpacity
                style={styles.postDeviceQuickBtn}
                onPress={onNavigateToPostDevice}
                activeOpacity={0.8}
              >
                <Ionicons name="add" size={14} color={theme.colors.white} />
                <Text style={styles.postDeviceQuickText}>Đăng máy</Text>
              </TouchableOpacity>
            )}

            {onLogout && (
              <TouchableOpacity
                style={styles.logoutButton}
                onPress={() => setShowLogoutModal(true)}
                activeOpacity={0.8}
                accessibilityLabel="Đăng xuất"
              >
                <Ionicons
                  name="log-out-outline"
                  size={15}
                  color={theme.colors.danger[600]}
                />
              </TouchableOpacity>
            )}
          </View>
        </View>
      </View>

      {/* ── 2. KHỐI BÁO CÁO HIỆU SUẤT & BIỂU ĐỒ DOANH THU (ANALYTICS & KPIS) ── */}
      <View
        style={styles.sectionContainer}
        onLayout={(e: any) => {
          sectionLayouts.current.analytics = e.nativeEvent.layout.y;
        }}
      >
        <View style={styles.sectionHeaderRow}>
          <Text style={styles.sectionHeaderTitle}>📊 HIỆU SUẤT & DOANH THU</Text>

          {/* Bộ chọn chu kỳ: Tuần này / Tháng này */}
          <View style={styles.periodSelector}>
            <TouchableOpacity
              style={[
                styles.periodBtn,
                period === 'week' && styles.periodBtnActive,
              ]}
              onPress={() => setPeriod('week')}
            >
              <Text
                style={[
                  styles.periodBtnText,
                  period === 'week' && styles.periodBtnTextActive,
                ]}
              >
                Tuần
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[
                styles.periodBtn,
                period === 'month' && styles.periodBtnActive,
              ]}
              onPress={() => setPeriod('month')}
            >
              <Text
                style={[
                  styles.periodBtnText,
                  period === 'month' && styles.periodBtnTextActive,
                ]}
              >
                Tháng
              </Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* 4 Chỉ số KPI nổi bật */}
        <View style={styles.kpiGrid}>
          <View style={styles.kpiCard}>
            <View style={[styles.kpiIconBox, { backgroundColor: theme.colors.primary[50] }]}>
              <Ionicons
                name="cash-outline"
                size={18}
                color={theme.colors.primary[600]}
              />
            </View>
            <Text style={styles.kpiLabel}>Doanh thu thuần</Text>
            <Text style={styles.kpiValue}>
              {((overview.totalRevenue || 42500000) / 1000000).toFixed(1)}M
            </Text>
          </View>

          <View style={styles.kpiCard}>
            <View style={[styles.kpiIconBox, { backgroundColor: theme.colors.success[50] }]}>
              <Ionicons
                name="checkmark-done-outline"
                size={18}
                color={theme.colors.success[600]}
              />
            </View>
            <Text style={styles.kpiLabel}>Lượt cho thuê</Text>
            <Text style={styles.kpiValue}>18 đơn</Text>
          </View>

          <View style={styles.kpiCard}>
            <View style={[styles.kpiIconBox, { backgroundColor: theme.colors.warning[50] }]}>
              <Ionicons
                name="flash-outline"
                size={18}
                color={theme.colors.warning[600]}
              />
            </View>
            <Text style={styles.kpiLabel}>Đang cho thuê</Text>
            <Text style={styles.kpiValue}>{overview.activeRentals || 2} máy</Text>
          </View>

          <View style={styles.kpiCard}>
            <View style={[styles.kpiIconBox, { backgroundColor: theme.colors.indigo[50] }]}>
              <Ionicons
                name="pie-chart-outline"
                size={18}
                color={theme.colors.indigo[600]}
              />
            </View>
            <Text style={styles.kpiLabel}>Tỷ lệ lấp đầy</Text>
            <Text style={styles.kpiValue}>{overview.utilizationRate || 74.2}%</Text>
          </View>
        </View>

        {/* Biểu đồ doanh thu trực quan */}
        <View style={styles.chartWrapper}>
          <RevenueChart chartData={chartData} />
        </View>
      </View>

      {/* ── 3. KHỐI TÀI CHÍNH: VÍ DOANH THU & KÝ QUỸ (FINANCIAL HUB) ── */}
      <View
        style={styles.walletCard}
        onLayout={(e: any) => {
          sectionLayouts.current.wallet = e.nativeEvent.layout.y;
        }}
      >
        <View style={styles.walletHeaderRow}>
          <View>
            <Text style={styles.walletLabel}>Số dư ví khả dụng</Text>
            <Text style={styles.walletAmount}>
              {(overview.totalRevenue || 5200000).toLocaleString('vi-VN')} đ
            </Text>
          </View>
          <TouchableOpacity
            style={styles.btnWithdraw}
            onPress={handleWithdraw}
            activeOpacity={0.8}
          >
            <Ionicons name="wallet-outline" size={16} color={theme.colors.white} />
            <Text style={styles.btnWithdrawText}>Rút tiền</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.walletDivider} />

        <View style={styles.walletSubRow}>
          <View style={styles.walletSubCol}>
            <View style={styles.subColHeader}>
              <Ionicons
                name="time-outline"
                size={13}
                color={theme.colors.warning[600]}
              />
              <Text style={styles.walletSubLabel}>Cọc đang giữ hộ (Escrow)</Text>
            </View>
            <Text style={styles.walletSubValueYellow}>
              {(overview.escrowHolding || 15000000).toLocaleString('vi-VN')} đ
            </Text>
          </View>

          <View style={styles.walletSubColRight}>
            <View style={styles.subColHeader}>
              <Ionicons
                name="trending-up-outline"
                size={13}
                color={theme.colors.primary[600]}
              />
              <Text style={styles.walletSubLabel}>Doanh thu tháng này</Text>
            </View>
            <Text style={styles.walletSubValueBlue}>
              {((overview.totalRevenue || 42500000) * 0.3).toLocaleString('vi-VN')} đ (+12%)
            </Text>
          </View>
        </View>
      </View>

      {/* ── 4. KHỐI ĐƠN THUÊ CẦN XỬ LÝ KHẨN CẤP (ACTION REQUIRED) ── */}
      {(() => {
        const pendingOrders = ownerBookings.filter((b: Booking) => b.status === 'pending');
        const approvedOrders = ownerBookings.filter((b: Booking) => b.status === 'approved');
        const activeOrders = ownerBookings.filter((b: Booking) => b.status === 'active');
        const urgentCount = pendingOrders.length + approvedOrders.length + activeOrders.length;
        const previewList = [...pendingOrders, ...approvedOrders, ...activeOrders].slice(0, 2);

        return (
          <View
            style={styles.sectionContainer}
            onLayout={(e: any) => {
              sectionLayouts.current.orders = e.nativeEvent.layout.y;
            }}
          >
            <View style={styles.sectionHeaderRow}>
              <View style={styles.sectionTitleWithBadge}>
                <Text style={styles.sectionHeaderTitle}>📦 ĐƠN CẦN XỬ LÝ GẤP</Text>
                {urgentCount > 0 && (
                  <View style={styles.badgeAlertCount}>
                    <Text style={styles.badgeAlertCountText}>
                      {urgentCount} việc
                    </Text>
                  </View>
                )}
              </View>

              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                <TouchableOpacity
                  onPress={() => navigation?.navigate?.('BookingManage')}
                  activeOpacity={0.7}
                  style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}
                >
                  <Text style={{ fontSize: 12, fontWeight: '700', color: theme.colors.primary[600] }}>
                    Quản lý ({ownerBookings.length})
                  </Text>
                  <Ionicons name="chevron-forward" size={14} color={theme.colors.primary[600]} />
                </TouchableOpacity>

                <TouchableOpacity
                  onPress={fetchOwnerOrders}
                  disabled={loadingOrders}
                  style={{ padding: 4 }}
                  activeOpacity={0.7}
                >
                  <Ionicons
                    name="refresh-outline"
                    size={16}
                    color={theme.colors.slate[600]}
                  />
                </TouchableOpacity>
              </View>
            </View>

            {/* Quick Status Bar */}
            <View style={styles.orderStatPillsRow}>
              <TouchableOpacity
                style={[styles.orderStatPill, styles.orderStatPillPending]}
                onPress={() => navigation?.navigate?.('BookingManage', { initialTab: 'pending' })}
                activeOpacity={0.7}
              >
                <Text style={styles.orderStatPillCount}>{pendingOrders.length}</Text>
                <Text style={styles.orderStatPillLabel}>Chờ duyệt</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.orderStatPill, styles.orderStatPillApproved]}
                onPress={() => navigation?.navigate?.('BookingManage', { initialTab: 'renting' })}
                activeOpacity={0.7}
              >
                <Text style={styles.orderStatPillCount}>{approvedOrders.length}</Text>
                <Text style={styles.orderStatPillLabel}>Bàn giao</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.orderStatPill, styles.orderStatPillActive]}
                onPress={() => navigation?.navigate?.('BookingManage', { initialTab: 'renting' })}
                activeOpacity={0.7}
              >
                <Text style={styles.orderStatPillCount}>{activeOrders.length}</Text>
                <Text style={styles.orderStatPillLabel}>Đang thuê</Text>
              </TouchableOpacity>
            </View>

            {loadingOrders && ownerBookings.length === 0 ? (
              <View style={styles.emptyOrdersCard}>
                <ActivityIndicator size="small" color={theme.colors.primary[500]} />
                <Text style={[styles.emptyOrdersDesc, { marginTop: 8 }]}>
                  Đang đồng bộ đơn thuê từ hệ thống...
                </Text>
              </View>
            ) : urgentCount === 0 ? (
              <View style={styles.emptyOrdersCard}>
                <View style={styles.emptyOrdersIconBox}>
                  <Ionicons
                    name="checkmark-done-circle"
                    size={32}
                    color={theme.colors.success[600]}
                  />
                </View>
                <Text style={styles.emptyOrdersTitle}>Không có đơn cần xử lý gấp</Text>
                <Text style={styles.emptyOrdersDesc}>
                  Tất cả đơn thuê đều đã được giải quyết hoặc trả máy thành công.
                </Text>
                <TouchableOpacity
                  style={styles.btnOpenBookingManageSecondary}
                  onPress={() => navigation?.navigate?.('BookingManage')}
                  activeOpacity={0.8}
                >
                  <Text style={styles.btnOpenBookingManageSecondaryText}>
                    Mở Trung tâm Quản lý đơn
                  </Text>
                  <Ionicons name="arrow-forward" size={14} color={theme.colors.primary[600]} />
                </TouchableOpacity>
              </View>
            ) : (
              <View style={styles.urgentPreviewContainer}>
                {previewList.map((booking: Booking) => {
                  const dev = (booking.deviceId as any) || {};
                  const renter = (booking.renterId as any) || {};
                  const isPending = booking.status === 'pending';
                  const isApproved = booking.status === 'approved';

                  return (
                    <TouchableOpacity
                      key={booking._id}
                      style={styles.urgentPreviewCard}
                      onPress={() =>
                        navigation?.navigate?.('BookingManage', {
                          initialTab: isPending ? 'pending' : 'renting',
                        })
                      }
                      activeOpacity={0.85}
                    >
                      <Image
                        source={{
                          uri:
                            dev.images?.[0] ||
                            'https://images.unsplash.com/photo-1516035069371-29a1b244cc32?w=300',
                        }}
                        style={styles.urgentPreviewThumb}
                      />
                      <View style={styles.urgentPreviewInfo}>
                        <View style={styles.urgentPreviewTopRow}>
                          <Text style={styles.urgentPreviewCode}>#{booking.bookingCode}</Text>
                          <View
                            style={[
                              styles.urgentPreviewBadge,
                              isPending
                                ? styles.urgentBadgePending
                                : isApproved
                                ? styles.urgentBadgeApproved
                                : styles.urgentBadgeActive,
                            ]}
                          >
                            <Text
                              style={[
                                styles.urgentPreviewBadgeText,
                                isPending
                                  ? styles.urgentBadgePendingText
                                  : isApproved
                                  ? styles.urgentBadgeApprovedText
                                  : styles.urgentBadgeActiveText,
                              ]}
                            >
                              {isPending ? 'Chờ duyệt' : isApproved ? 'Cần giao' : 'Đang thuê'}
                            </Text>
                          </View>
                        </View>
                        <Text style={styles.urgentPreviewTitle} numberOfLines={1}>
                          {dev.name || dev.title || 'Thiết bị'}
                        </Text>
                        <Text style={styles.urgentPreviewMeta} numberOfLines={1}>
                          {renter.name || 'Khách thuê'} •{' '}
                          {(booking.totalAmount || 0).toLocaleString('vi-VN')} đ
                        </Text>
                      </View>
                    </TouchableOpacity>
                  );
                })}

                <TouchableOpacity
                  style={styles.btnOpenBookingManage}
                  onPress={() => navigation?.navigate?.('BookingManage')}
                  activeOpacity={0.85}
                >
                  <Text style={styles.btnOpenBookingManageText}>
                    Xử lý toàn bộ đơn tại Trung tâm ({urgentCount})
                  </Text>
                  <Ionicons name="arrow-forward" size={15} color="#FFFFFF" />
                </TouchableOpacity>
              </View>
            )}
          </View>
        );
      })()}



      {/* ── 5. KHỐI QUẢN LÝ KHO MÁY (FLEET INVENTORY MANAGEMENT) ── */}
      <View
        style={styles.sectionContainer}
        onLayout={(e: any) => {
          sectionLayouts.current.fleet = e.nativeEvent.layout.y;
        }}
      >
        <View style={styles.sectionHeaderRow}>
          <Text style={styles.sectionHeaderTitle}>🛠️ KHO THIẾT BỊ ({fleetList.length})</Text>

          {/* Filter Pills */}
          <View style={styles.fleetFilterPills}>
            <TouchableOpacity
              style={[
                styles.fleetFilterPill,
                deviceFilter === 'all' && styles.fleetFilterPillActive,
              ]}
              onPress={() => setDeviceFilter('all')}
            >
              <Text
                style={[
                  styles.fleetFilterText,
                  deviceFilter === 'all' && styles.fleetFilterTextActive,
                ]}
              >
                Tất cả
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[
                styles.fleetFilterPill,
                deviceFilter === 'rented' && styles.fleetFilterPillActive,
              ]}
              onPress={() => setDeviceFilter('rented')}
            >
              <Text
                style={[
                  styles.fleetFilterText,
                  deviceFilter === 'rented' && styles.fleetFilterTextActive,
                ]}
              >
                Đang thuê
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[
                styles.fleetFilterPill,
                deviceFilter === 'available' && styles.fleetFilterPillActive,
              ]}
              onPress={() => setDeviceFilter('available')}
            >
              <Text
                style={[
                  styles.fleetFilterText,
                  deviceFilter === 'available' && styles.fleetFilterTextActive,
                ]}
              >
                Sẵn sàng
              </Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Danh sách thiết bị trong kho */}
        {filteredFleet.map((item: FleetDeviceItem) => (
          <TouchableOpacity
            key={item._id}
            style={styles.fleetCard}
            onPress={() => onNavigateToDeviceDetail?.(item._id)}
            activeOpacity={0.7}
          >
            <Image source={{ uri: item.imageUrl }} style={styles.fleetThumb} />

            <View style={styles.fleetInfoCol}>
              <View style={styles.fleetRowTop}>
                <View style={styles.categoryPill}>
                  <Text style={styles.categoryPillText}>{item.category.toUpperCase()}</Text>
                </View>
                <View
                  style={[
                    styles.statusPill,
                    item.status === 'rented' ? styles.statusRented : styles.statusAvailable,
                  ]}
                >
                  <Text
                    style={[
                      styles.statusPillText,
                      item.status === 'rented'
                        ? styles.statusTextRented
                        : styles.statusTextAvailable,
                    ]}
                  >
                    {item.status === 'rented' ? 'Đang thuê' : 'Sẵn sàng'}
                  </Text>
                </View>
              </View>

              <Text style={styles.fleetTitle} numberOfLines={1}>
                {item.name}
              </Text>

              <View style={styles.fleetMetaStatsRow}>
                <Text style={styles.fleetPriceText}>
                  {item.pricePerDay.toLocaleString('vi-VN')} đ/ngày
                </Text>
                <Text style={styles.dotSep}>•</Text>
                <Text style={styles.fleetRentalCountText}>
                  {item.rentalCount} lượt thuê
                </Text>
                <Text style={styles.dotSep}>•</Text>
                <Text style={styles.fleetRatingText}>⭐ {item.ratingAvg}</Text>
              </View>

              {/* Doanh thu máy mang lại & Switch toggle */}
              <View style={styles.fleetBottomActionRow}>
                <Text style={styles.accumulatedRevText}>
                  Thu về: {(item.revenueTotal || 0).toLocaleString('vi-VN')} đ
                </Text>

                <View style={styles.switchWrapper}>
                  <Text style={styles.switchLabel}>
                    {item.status !== 'hidden' ? 'Bật cho thuê' : 'Tạm ẩn'}
                  </Text>
                  <Switch
                    value={item.status !== 'hidden'}
                    onValueChange={() => toggleDeviceAvailability(item._id)}
                    trackColor={{
                      false: theme.colors.slate[200],
                      true: theme.colors.primary[500],
                    }}
                    thumbColor={theme.colors.white}
                  />
                </View>
              </View>
            </View>
          </TouchableOpacity>
        ))}
      </View>

      {/* ── 6. KHỐI TRỢ LÝ THÔNG MINH & CÔNG CỤ AI (AI TOOLS) ── */}
      <View
        style={[styles.sectionContainer, { marginBottom: theme.spacing.xl }]}
        onLayout={(e: any) => {
          sectionLayouts.current.ai_tools = e.nativeEvent.layout.y;
        }}
      >
        <Text style={styles.sectionHeaderTitle}>💡 CÔNG CỤ TRỢ LÝ AI CHO CHỦ MÁY</Text>

        <View style={styles.aiToolsGrid}>
          <TouchableOpacity
            style={styles.aiToolCard}
            onPress={() =>
              Alert.alert(
                'Trợ lý Định giá Thông minh AI 🎯',
                'AI phân tích nhu cầu thị trường hiện tại: Model Sony A7 IV đang có nhu cầu cao cuối tuần này, giá thuê đề xuất tối ưu: 480.000 đ/ngày (+7%).'
              )
            }
            activeOpacity={0.8}
          >
            <View style={[styles.aiIconBox, { backgroundColor: theme.colors.primary[50] }]}>
              <Ionicons
                name="sparkles"
                size={22}
                color={theme.colors.primary[600]}
              />
            </View>
            <View style={styles.aiContent}>
              <Text style={styles.aiTitle}>Định giá Thông minh AI</Text>
              <Text style={styles.aiDesc}>
                Gợi ý mức giá cạnh tranh nhất theo thị trường để tối đa hóa tỷ lệ lấp đầy.
              </Text>
            </View>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.aiToolCard}
            onPress={() => {
              if (onNavigateToPostDevice) {
                onNavigateToPostDevice();
              } else {
                Alert.alert('Soạn bài AI', 'Chuyển sang màn hình Đăng thiết bị để kích hoạt.');
              }
            }}
            activeOpacity={0.8}
          >
            <View style={[styles.aiIconBox, { backgroundColor: theme.colors.indigo[50] }]}>
              <Ionicons
                name="document-text-outline"
                size={22}
                color={theme.colors.indigo[600]}
              />
            </View>
            <View style={styles.aiContent}>
              <Text style={styles.aiTitle}>Trợ lý Soạn Tin Đăng AI</Text>
              <Text style={styles.aiDesc}>
                Chỉ cần nhập tên model, AI tự tạo bài giới thiệu chuyên nghiệp & chuẩn thông số.
              </Text>
            </View>
          </TouchableOpacity>
        </View>
      </View>
    </ScrollView>

    {onLogout && (
      <LogoutConfirmModal
        visible={showLogoutModal}
        onClose={() => setShowLogoutModal(false)}
        onConfirm={() => {
          setShowLogoutModal(false);
          onLogout();
        }}
        title="Xác nhận đăng xuất"
        subtitle="Bạn có chắc chắn muốn đăng xuất khỏi tài khoản Chủ máy?"
      />
    )}
  </View>
);
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.background,
  },
  scrollContent: {
    padding: theme.spacing.md,
    gap: theme.spacing.md,
  },

  // 0. Top Bar
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: theme.spacing.md,
    paddingBottom: 10,
    backgroundColor: theme.card,
    borderBottomWidth: 1,
    borderBottomColor: theme.border,
    ...theme.shadows.subtle,
  },
  topBarLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  hamburgerButton: {
    width: 40,
    height: 40,
    borderRadius: theme.radii.md,
    backgroundColor: theme.colors.slate[50],
    borderWidth: 1,
    borderColor: theme.border,
    alignItems: 'center',
    justifyContent: 'center',
    ...theme.shadows.subtle,
  },
  topBarTitle: {
    ...theme.typography.subheading,
    fontSize: 16,
    fontWeight: '700',
    color: theme.textPrimary,
  },
  topBarSubtitle: {
    ...theme.typography.caption,
    fontSize: 11,
    color: theme.textSecondary,
  },
  scrollView: {
    flex: 1,
  },

  // 1. Header Styles
  headerCard: {
    backgroundColor: theme.card,
    borderRadius: theme.radii.lg,
    padding: theme.spacing.md,
    borderWidth: 1,
    borderColor: theme.border,
    ...theme.shadows.card,
  },
  headerTop: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  ownerProfileRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    gap: theme.spacing.md,
  },
  ownerAvatar: {
    width: 52,
    height: 52,
    borderRadius: theme.radii.full,
    borderWidth: 2,
    borderColor: theme.colors.primary[500],
  },
  ownerMetaCol: {
    flex: 1,
  },
  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 4,
  },
  ownerName: {
    ...theme.typography.subheading,
    fontSize: 16,
    color: theme.textPrimary,
  },
  badgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 6,
  },
  ratingBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    backgroundColor: theme.colors.warning[50],
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: theme.radii.sm,
  },
  ratingText: {
    fontSize: 11,
    fontWeight: '700',
    color: theme.colors.warning[600],
  },
  trustScoreBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    backgroundColor: theme.colors.success[50],
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: theme.radii.sm,
  },
  trustScoreText: {
    fontSize: 11,
    fontWeight: '700',
    color: theme.colors.success[600],
  },
  topOwnerBadge: {
    backgroundColor: theme.colors.primary[50],
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: theme.radii.sm,
  },
  topOwnerBadgeText: {
    fontSize: 11,
    fontWeight: '700',
    color: theme.colors.primary[600],
  },
  headerActionsCol: {
    alignItems: 'flex-end',
    gap: 6,
  },
  logoutButton: {
    width: 28,
    height: 28,
    borderRadius: theme.radii.full,
    backgroundColor: theme.colors.danger[50],
    alignItems: 'center',
    justifyContent: 'center',
  },
  topBarRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  notificationButton: {
    width: 36,
    height: 36,
    borderRadius: theme.radii.full,
    backgroundColor: theme.colors.slate[50],
    borderWidth: 1,
    borderColor: theme.border,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  notifBadge: {
    position: 'absolute',
    top: -3,
    right: -4,
    minWidth: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: theme.colors.danger[500],
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 4,
    borderWidth: 1.5,
    borderColor: theme.card,
    zIndex: 10,
    elevation: 4,
  },
  notifBadgeText: {
    color: '#FFFFFF',
    fontSize: 10,
    fontWeight: '700',
    textAlign: 'center',
    lineHeight: 12,
  },
  switchModeButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: theme.radii.full,
    backgroundColor: theme.colors.slate[100],
  },
  switchModeText: {
    fontSize: 12,
    fontWeight: '600',
    color: theme.colors.primary[600],
  },
  postDeviceQuickBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: theme.radii.full,
    backgroundColor: theme.colors.primary[600],
  },
  postDeviceQuickText: {
    fontSize: 12,
    fontWeight: '700',
    color: theme.colors.white,
  },

  // 2. Financial Wallet Styles
  walletCard: {
    backgroundColor: '#0F172A', // Slate-900 sang trọng
    borderRadius: theme.radii.lg,
    padding: theme.spacing.lg,
    ...theme.shadows.card,
  },
  walletHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  walletLabel: {
    fontSize: 12,
    color: '#94A3B8',
    marginBottom: 4,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  walletAmount: {
    fontSize: 26,
    fontWeight: '800',
    color: '#FFFFFF',
  },
  btnWithdraw: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: theme.colors.primary[600],
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: theme.radii.full,
  },
  btnWithdrawText: {
    color: '#FFFFFF',
    fontWeight: '700',
    fontSize: 13,
  },
  walletDivider: {
    height: 1,
    backgroundColor: '#334155',
    marginVertical: theme.spacing.md,
  },
  walletSubRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  walletSubCol: {
    flex: 1,
  },
  walletSubColRight: {
    flex: 1,
    alignItems: 'flex-end',
  },
  subColHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginBottom: 3,
  },
  walletSubLabel: {
    fontSize: 11,
    color: '#94A3B8',
  },
  walletSubValueYellow: {
    fontSize: 15,
    fontWeight: '700',
    color: '#FBBF24',
  },
  walletSubValueBlue: {
    fontSize: 15,
    fontWeight: '700',
    color: '#38BDF8',
  },

  // 3. Action Required Section
  sectionContainer: {
    gap: theme.spacing.sm,
  },
  sectionHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  sectionTitleWithBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  sectionHeaderTitle: {
    ...theme.typography.subheading,
    fontSize: 14,
    color: theme.colors.slate[600],
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  badgeAlertCount: {
    backgroundColor: theme.colors.danger[500],
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: theme.radii.full,
  },
  badgeAlertCountText: {
    color: theme.colors.white,
    fontSize: 11,
    fontWeight: '700',
  },
  orderStatPillsRow: {
    flexDirection: 'row',
    gap: 8,
  },
  orderStatPill: {
    flex: 1,
    paddingVertical: 8,
    paddingHorizontal: 10,
    borderRadius: theme.radii.md,
    alignItems: 'center',
    borderWidth: 1,
  },
  orderStatPillPending: {
    backgroundColor: theme.colors.warning[50],
    borderColor: '#FED7AA',
  },
  orderStatPillApproved: {
    backgroundColor: theme.colors.primary[50],
    borderColor: '#BAE6FD',
  },
  orderStatPillActive: {
    backgroundColor: theme.colors.indigo[50],
    borderColor: '#DDD6FE',
  },
  orderStatPillCount: {
    fontSize: 18,
    fontWeight: '800',
    color: theme.textPrimary,
  },
  orderStatPillLabel: {
    fontSize: 11,
    fontWeight: '600',
    color: theme.textSecondary,
    marginTop: 2,
  },
  urgentPreviewContainer: {
    gap: 8,
  },
  urgentPreviewCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 10,
    borderRadius: theme.radii.md,
    backgroundColor: theme.card,
    borderWidth: 1,
    borderColor: theme.border,
    gap: 12,
  },
  urgentPreviewThumb: {
    width: 48,
    height: 48,
    borderRadius: theme.radii.sm,
    backgroundColor: theme.colors.slate[100],
  },
  urgentPreviewInfo: {
    flex: 1,
    gap: 2,
  },
  urgentPreviewTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  urgentPreviewCode: {
    fontSize: 11,
    fontWeight: '700',
    color: theme.textSecondary,
  },
  urgentPreviewBadge: {
    paddingHorizontal: 6,
    paddingVertical: 1,
    borderRadius: 4,
  },
  urgentBadgePending: {
    backgroundColor: theme.colors.warning[50],
  },
  urgentBadgePendingText: {
    fontSize: 10,
    fontWeight: '700',
    color: theme.colors.warning[600],
  },
  urgentBadgeApproved: {
    backgroundColor: theme.colors.primary[50],
  },
  urgentBadgeApprovedText: {
    fontSize: 10,
    fontWeight: '700',
    color: theme.colors.primary[600],
  },
  urgentBadgeActive: {
    backgroundColor: theme.colors.indigo[50],
  },
  urgentBadgeActiveText: {
    fontSize: 10,
    fontWeight: '700',
    color: theme.colors.indigo[600],
  },
  urgentPreviewBadgeText: {
    fontSize: 10,
    fontWeight: '700',
  },
  urgentPreviewTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: theme.textPrimary,
  },
  urgentPreviewMeta: {
    fontSize: 11,
    color: theme.textSecondary,
  },
  btnOpenBookingManage: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: theme.colors.primary[600],
    paddingVertical: 10,
    borderRadius: theme.radii.md,
    marginTop: 4,
  },
  btnOpenBookingManageText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '700',
  },
  btnOpenBookingManageSecondary: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: theme.spacing.sm,
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: theme.radii.md,
    backgroundColor: theme.colors.primary[50],
  },
  btnOpenBookingManageSecondaryText: {
    color: theme.colors.primary[600],
    fontSize: 12,
    fontWeight: '700',
  },

  // 4. KPI & Charts
  periodSelector: {
    flexDirection: 'row',
    backgroundColor: theme.colors.slate[100],
    borderRadius: theme.radii.full,
    padding: 2,
  },
  periodBtn: {
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: theme.radii.full,
  },
  periodBtnActive: {
    backgroundColor: theme.colors.primary[600],
  },
  periodBtnText: {
    fontSize: 12,
    fontWeight: '600',
    color: theme.colors.slate[600],
  },
  periodBtnTextActive: {
    color: theme.colors.white,
  },
  kpiGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: theme.spacing.sm,
  },
  kpiCard: {
    flex: 1,
    minWidth: '47%',
    backgroundColor: theme.card,
    borderRadius: theme.radii.lg,
    padding: theme.spacing.md,
    borderWidth: 1,
    borderColor: theme.border,
    ...theme.shadows.subtle,
  },
  kpiIconBox: {
    width: 34,
    height: 34,
    borderRadius: theme.radii.md,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: theme.spacing.sm,
  },
  kpiLabel: {
    fontSize: 12,
    color: theme.textSecondary,
    marginBottom: 4,
  },
  kpiValue: {
    fontSize: 20,
    fontWeight: '800',
    color: theme.textPrimary,
  },
  chartWrapper: {
    marginTop: theme.spacing.xs,
  },

  // 5. Fleet Inventory
  fleetFilterPills: {
    flexDirection: 'row',
    gap: 6,
  },
  fleetFilterPill: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: theme.radii.full,
    backgroundColor: theme.colors.slate[100],
  },
  fleetFilterPillActive: {
    backgroundColor: theme.colors.primary[600],
  },
  fleetFilterText: {
    fontSize: 11,
    fontWeight: '600',
    color: theme.colors.slate[600],
  },
  fleetFilterTextActive: {
    color: theme.colors.white,
  },
  fleetCard: {
    flexDirection: 'row',
    backgroundColor: theme.card,
    borderRadius: theme.radii.lg,
    padding: theme.spacing.md,
    borderWidth: 1,
    borderColor: theme.border,
    gap: theme.spacing.md,
    ...theme.shadows.subtle,
  },
  fleetThumb: {
    width: 80,
    height: 80,
    borderRadius: theme.radii.md,
  },
  fleetInfoCol: {
    flex: 1,
  },
  fleetRowTop: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 3,
  },
  categoryPill: {
    backgroundColor: theme.colors.slate[100],
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: theme.radii.sm,
  },
  categoryPillText: {
    fontSize: 10,
    fontWeight: '700',
    color: theme.colors.slate[600],
  },
  statusPill: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: theme.radii.sm,
  },
  statusRented: {
    backgroundColor: theme.colors.warning[50],
  },
  statusAvailable: {
    backgroundColor: theme.colors.success[50],
  },
  statusPillText: {
    fontSize: 10,
    fontWeight: '700',
  },
  statusTextRented: {
    color: theme.colors.warning[600],
  },
  statusTextAvailable: {
    color: theme.colors.success[600],
  },
  fleetTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: theme.textPrimary,
    marginBottom: 4,
  },
  fleetMetaStatsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginBottom: 6,
  },
  fleetPriceText: {
    fontSize: 12,
    fontWeight: '700',
    color: theme.colors.primary[600],
  },
  dotSep: {
    fontSize: 10,
    color: theme.colors.slate[400],
  },
  fleetRentalCountText: {
    fontSize: 11,
    color: theme.textSecondary,
  },
  fleetRatingText: {
    fontSize: 11,
    fontWeight: '600',
    color: theme.colors.slate[600],
  },
  fleetBottomActionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderTopWidth: 1,
    borderTopColor: theme.colors.slate[100],
    paddingTop: 6,
  },
  accumulatedRevText: {
    fontSize: 11,
    fontWeight: '600',
    color: theme.colors.success[600],
  },
  switchWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  switchLabel: {
    fontSize: 10,
    color: theme.textSecondary,
  },

  // 6. AI Tools
  aiToolsGrid: {
    gap: theme.spacing.sm,
  },
  aiToolCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.card,
    borderRadius: theme.radii.lg,
    padding: theme.spacing.md,
    borderWidth: 1,
    borderColor: theme.border,
    gap: theme.spacing.md,
    ...theme.shadows.subtle,
  },
  aiIconBox: {
    width: 44,
    height: 44,
    borderRadius: theme.radii.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  aiContent: {
    flex: 1,
  },
  aiTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: theme.textPrimary,
    marginBottom: 2,
  },
  aiDesc: {
    fontSize: 12,
    color: theme.textSecondary,
    lineHeight: 16,
  },

  // 7. Empty Orders & Rejection Modal
  emptyOrdersCard: {
    backgroundColor: theme.card,
    borderRadius: theme.radii.lg,
    padding: theme.spacing.lg,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: theme.border,
    borderStyle: 'dashed',
  },
  emptyOrdersIconBox: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: theme.colors.success[50],
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: theme.spacing.sm,
  },
  emptyOrdersTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: theme.textPrimary,
    marginBottom: 4,
    textAlign: 'center',
  },
  emptyOrdersDesc: {
    fontSize: 12,
    color: theme.textSecondary,
    textAlign: 'center',
    lineHeight: 18,
    paddingHorizontal: theme.spacing.md,
  },
});

