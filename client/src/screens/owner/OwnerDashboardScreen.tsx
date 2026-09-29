import React, { useState, useEffect, useCallback } from 'react';
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
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { theme } from '../../constants/theme';
import { useAppSelector } from '../../store';
import {
  ownerAnalyticsService,
  FALLBACK_OWNER_ANALYTICS_WEEK,
} from '../../services/ownerAnalyticsService';
import { OwnerAnalyticsResponse, FleetDeviceItem } from '../../types';
import { RevenueChart } from '../../components/owner/RevenueChart';

interface OwnerDashboardScreenProps {
  onBackToHome?: () => void;
  onNavigateToDeviceDetail?: (deviceId: string) => void;
  onNavigateToPostDevice?: () => void;
}

type PeriodType = 'week' | 'month';
type DeviceFilterType = 'all' | 'rented' | 'available';

export function OwnerDashboardScreen({
  onBackToHome,
  onNavigateToDeviceDetail,
  onNavigateToPostDevice,
}: OwnerDashboardScreenProps) {
  const currentUser = useAppSelector((state) => state.auth.user);

  // State quản lý số liệu phân tích
  const [period, setPeriod] = useState('week' as PeriodType);
  const [analyticsData, setAnalyticsData] = useState(
    FALLBACK_OWNER_ANALYTICS_WEEK as OwnerAnalyticsResponse
  );
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  // State xử lý đơn hàng cần duyệt
  const [orderActionState, setOrderActionState] = useState(
    'pending' as 'pending' | 'approved' | 'rejected'
  );
  const [handoverDone, setHandoverDone] = useState(false);

  // State quản lý danh sách thiết bị kho máy
  const [deviceFilter, setDeviceFilter] = useState('all' as DeviceFilterType);
  const [fleetList, setFleetList] = useState(
    (FALLBACK_OWNER_ANALYTICS_WEEK.fleet || []) as FleetDeviceItem[]
  );

  // Gọi API lấy dữ liệu thống kê
  const fetchAnalytics = useCallback(async (selectedPeriod: PeriodType) => {
    try {
      const res = await ownerAnalyticsService.getOwnerAnalytics(selectedPeriod);
      if (res) {
        setAnalyticsData(res);
        if (res.fleet && res.fleet.length > 0) {
          setFleetList(res.fleet);
        }
      }
    } catch (error) {
      console.warn('⚠️ [OwnerDashboardScreen] Lỗi khi tải thống kê:', error);
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

  const overview = analyticsData.overview || FALLBACK_OWNER_ANALYTICS_WEEK.overview;
  const chartData = analyticsData.revenueChart || FALLBACK_OWNER_ANALYTICS_WEEK.revenueChart;

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

  // Xử lý Duyệt đơn
  const handleApproveOrder = () => {
    setOrderActionState('approved');
    Alert.alert(
      'Phê duyệt thành công! 🎉',
      'Đơn thuê #TS-20260915 đã được phê duyệt. Thông báo thời gian thực đã được gửi tức thì đến máy của người thuê.'
    );
  };

  // Xử lý Từ chối đơn
  const handleRejectOrder = () => {
    Alert.alert(
      'Xác nhận từ chối',
      'Bạn có chắc chắn muốn từ chối yêu cầu thuê này không?',
      [
        { text: 'Hủy', style: 'cancel' },
        {
          text: 'Từ chối',
          style: 'destructive',
          onPress: () => {
            setOrderActionState('rejected');
            Alert.alert('Đã từ chối', 'Đơn thuê #TS-20260915 đã bị hủy.');
          },
        },
      ]
    );
  };

  // Xử lý Bàn giao máy
  const handleScanHandover = () => {
    Alert.alert(
      'Biên bản bàn giao thiết bị 📱',
      'Đã đối soát mã QR thành công. Trạng thái đơn chuyển sang Đang thuê (active). Tiền cọc tiếp tục được bảo toàn trong ví ký quỹ.',
      [{ text: 'Đồng ý', onPress: () => setHandoverDone(true) }]
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
    <ScrollView
      style={styles.container}
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
      <View style={styles.headerCard}>
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

          {/* Cụm nút chuyển vai trò & đăng máy */}
          <View style={styles.headerActionsCol}>
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
          </View>
        </View>
      </View>

      {/* ── 2. KHỐI TÀI CHÍNH: VÍ DOANH THU & KÝ QUỸ (FINANCIAL HUB) ── */}
      <View style={styles.walletCard}>
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

      {/* ── 3. KHỐI ĐƠN THUÊ CẦN XỬ LÝ KHẨN CẤP (ACTION REQUIRED) ── */}
      <View style={styles.sectionContainer}>
        <View style={styles.sectionHeaderRow}>
          <View style={styles.sectionTitleWithBadge}>
            <Text style={styles.sectionHeaderTitle}>📦 ĐƠN CẦN XỬ LÝ GẤP</Text>
            <View style={styles.badgeAlertCount}>
              <Text style={styles.badgeAlertCountText}>
                {(orderActionState === 'pending' ? 1 : 0) + (!handoverDone ? 1 : 0)} việc
              </Text>
            </View>
          </View>
        </View>

        {/* Thẻ 1: Đơn mới chờ duyệt */}
        {orderActionState === 'pending' && (
          <View style={styles.actionCard}>
            <View style={styles.actionCardHeader}>
              <View style={styles.badgePendingPill}>
                <Text style={styles.badgePendingText}>Đơn mới chờ duyệt</Text>
              </View>
              <Text style={styles.orderCodeText}>#TS-20260915</Text>
              <Text style={styles.orderPriceHighlight}>900.000 đ</Text>
            </View>

            <View style={styles.orderInfoBody}>
              <Image
                source={{
                  uri: 'https://images.unsplash.com/photo-1516035069371-29a1b244cc32?w=400',
                }}
                style={styles.orderThumb}
              />
              <View style={styles.orderDetailCol}>
                <Text style={styles.orderDeviceTitle} numberOfLines={1}>
                  Sony Alpha A7 IV Kit 24-70mm
                </Text>
                <Text style={styles.orderDurationText}>
                  Thời gian: 2 ngày (22/09 - 24/09)
                </Text>

                {/* Hồ sơ tín nhiệm khách thuê */}
                <View style={styles.customerTrustRow}>
                  <Image
                    source={{
                      uri: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=200',
                    }}
                    style={styles.customerAvatar}
                  />
                  <Text style={styles.customerName}>Hoàng Nam Creator</Text>
                  <View style={styles.trustPill}>
                    <Text style={styles.trustPillText}>⭐ 5.0 (Uy tín: 100)</Text>
                  </View>
                </View>
              </View>
            </View>

            <View style={styles.orderActionButtonsRow}>
              <TouchableOpacity
                style={styles.btnReject}
                onPress={handleRejectOrder}
                activeOpacity={0.8}
              >
                <Ionicons
                  name="close-circle-outline"
                  size={16}
                  color={theme.colors.danger[600]}
                />
                <Text style={styles.btnRejectText}>Từ chối</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.btnApprove}
                onPress={handleApproveOrder}
                activeOpacity={0.8}
              >
                <Ionicons
                  name="checkmark-circle-outline"
                  size={16}
                  color={theme.colors.white}
                />
                <Text style={styles.btnApproveText}>Duyệt đơn ngay</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}

        {/* Thẻ 2: Đơn đã duyệt, cần bàn giao thiết bị */}
        {(!handoverDone || orderActionState === 'approved') && (
          <View style={[styles.actionCard, styles.actionCardHandover]}>
            <View style={styles.actionCardHeader}>
              <View style={styles.badgeHandoverPill}>
                <Text style={styles.badgeHandoverText}>Bàn giao hôm nay</Text>
              </View>
              <Text style={styles.orderCodeText}>#TS-20260912</Text>
              <Text style={styles.orderPriceHighlight}>1.200.000 đ</Text>
            </View>

            <View style={styles.orderInfoBody}>
              <Image
                source={{
                  uri: 'https://images.unsplash.com/photo-1695048133142-1a20484d2569?w=400',
                }}
                style={styles.orderThumb}
              />
              <View style={styles.orderDetailCol}>
                <Text style={styles.orderDeviceTitle} numberOfLines={1}>
                  iPhone 15 Pro Max 256GB Titanium
                </Text>
                <Text style={styles.orderDurationText}>Khách hẹn nhận: 14:00 hôm nay</Text>
                <Text style={styles.orderDeliveryNote}>
                  📍 Nhận trực tiếp tại Cửa hàng
                </Text>
              </View>
            </View>

            <View style={styles.orderActionButtonsRow}>
              <TouchableOpacity
                style={styles.btnScanQR}
                onPress={handleScanHandover}
                activeOpacity={0.8}
              >
                <Ionicons
                  name="qr-code-outline"
                  size={16}
                  color={theme.colors.primary[600]}
                />
                <Text style={styles.btnScanQRText}>Quét QR bàn giao máy</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}
      </View>

      {/* ── 4. KHỐI BÁO CÁO HIỆU SUẤT & BIỂU ĐỒ DOANH THU (ANALYTICS & KPIS) ── */}
      <View style={styles.sectionContainer}>
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

      {/* ── 5. KHỐI QUẢN LÝ KHO MÁY (FLEET INVENTORY MANAGEMENT) ── */}
      <View style={styles.sectionContainer}>
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
      <View style={[styles.sectionContainer, { marginBottom: theme.spacing.xl }]}>
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
  actionCard: {
    backgroundColor: theme.card,
    borderRadius: theme.radii.lg,
    padding: theme.spacing.md,
    borderWidth: 1.5,
    borderColor: '#FED7AA', // Viền cam nhấn mạnh
    ...theme.shadows.card,
  },
  actionCardHandover: {
    borderColor: '#BAE6FD', // Viền xanh cho đơn bàn giao
  },
  actionCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: theme.spacing.sm,
  },
  badgePendingPill: {
    backgroundColor: theme.colors.warning[50],
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: theme.radii.sm,
  },
  badgePendingText: {
    color: theme.colors.warning[600],
    fontSize: 11,
    fontWeight: '700',
  },
  badgeHandoverPill: {
    backgroundColor: theme.colors.primary[50],
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: theme.radii.sm,
  },
  badgeHandoverText: {
    color: theme.colors.primary[600],
    fontSize: 11,
    fontWeight: '700',
  },
  orderCodeText: {
    fontSize: 12,
    color: theme.textSecondary,
    fontWeight: '600',
  },
  orderPriceHighlight: {
    fontSize: 15,
    fontWeight: '800',
    color: theme.textPrimary,
  },
  orderInfoBody: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.md,
    marginBottom: theme.spacing.md,
  },
  orderThumb: {
    width: 60,
    height: 60,
    borderRadius: theme.radii.md,
  },
  orderDetailCol: {
    flex: 1,
    gap: 3,
  },
  orderDeviceTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: theme.textPrimary,
  },
  orderDurationText: {
    fontSize: 12,
    color: theme.textSecondary,
  },
  orderDeliveryNote: {
    fontSize: 12,
    color: theme.colors.primary[600],
    fontWeight: '500',
  },
  customerTrustRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 2,
  },
  customerAvatar: {
    width: 18,
    height: 18,
    borderRadius: theme.radii.full,
  },
  customerName: {
    fontSize: 12,
    fontWeight: '600',
    color: theme.textPrimary,
  },
  trustPill: {
    backgroundColor: theme.colors.slate[100],
    paddingHorizontal: 6,
    paddingVertical: 1,
    borderRadius: theme.radii.sm,
  },
  trustPillText: {
    fontSize: 10,
    fontWeight: '600',
    color: theme.colors.slate[600],
  },
  orderActionButtonsRow: {
    flexDirection: 'row',
    gap: theme.spacing.sm,
  },
  btnReject: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 9,
    borderRadius: theme.radii.md,
    backgroundColor: theme.colors.danger[50],
  },
  btnRejectText: {
    fontSize: 13,
    fontWeight: '700',
    color: theme.colors.danger[600],
  },
  btnApprove: {
    flex: 1.5,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 9,
    borderRadius: theme.radii.md,
    backgroundColor: theme.colors.success[600],
  },
  btnApproveText: {
    fontSize: 13,
    fontWeight: '700',
    color: theme.colors.white,
  },
  btnScanQR: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 9,
    borderRadius: theme.radii.md,
    backgroundColor: theme.colors.primary[50],
  },
  btnScanQRText: {
    fontSize: 13,
    fontWeight: '700',
    color: theme.colors.primary[600],
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
});
