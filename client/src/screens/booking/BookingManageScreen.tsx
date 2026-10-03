import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  StyleSheet,
  View,
  Text,
  FlatList,
  TouchableOpacity,
  RefreshControl,
  ActivityIndicator,
  Modal,
  TextInput,
  Alert,
  Platform,
  StatusBar,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../../theme/colors';
import { OwnerApprovalCard } from '../../components/booking/OwnerApprovalCard';
import { OwnerRateRenterModal } from '../../components/booking/OwnerRateRenterModal';
import { bookingService, Booking } from '../../services/bookingService';
import { reviewService, ReviewItem } from '../../services/reviewService';
import { socketService } from '../../services/socketService';

export type BookingManageTab = 'pending' | 'renting' | 'history';

interface BookingManageScreenProps {
  route?: any;
  navigation?: any;
  onBack?: () => void;
  onOpenDrawer?: () => void;
  onNavigateToBookingDetail?: (bookingId: string) => void;
  onNavigateToNotifications?: () => void;
}

const REJECT_REASONS = [
  'Thiết bị đang bảo trì hoặc chưa sẵn sàng',
  'Trùng lịch sử dụng cá nhân đột xuất',
  'Thời gian thuê không thuận tiện giao nhận',
  'Khách thuê không phản hồi xác minh thông tin',
  'Lý do khác',
];

export function BookingManageScreen({
  route,
  navigation,
  onBack,
  onOpenDrawer,
  onNavigateToBookingDetail,
  onNavigateToNotifications,
}: BookingManageScreenProps) {
  const insets = useSafeAreaInsets();
  const topInset = Math.max(
    insets.top,
    Platform.OS === 'android' ? StatusBar.currentHeight || 24 : 20
  );

  const initialTab: BookingManageTab = route?.params?.initialTab || 'pending';
  const [activeTab, setActiveTab] = useState(initialTab as BookingManageTab);

  const [bookings, setBookings] = useState([] as Booking[]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [isUpdatingOrder, setIsUpdatingOrder] = useState(false);

  // Search keyword
  const [searchKeyword, setSearchKeyword] = useState('');

  // Reject Modal State
  const [rejectModalVisible, setRejectModalVisible] = useState(false);
  const [selectedBookingToReject, setSelectedBookingToReject] = useState(null as Booking | null);
  const [selectedRejectReason, setSelectedRejectReason] = useState(REJECT_REASONS[0]);
  const [customRejectReason, setCustomRejectReason] = useState('');

  // Owner Rate Renter Modal State
  const [rateRenterModalVisible, setRateRenterModalVisible] = useState(false);
  const [selectedReviewToRate, setSelectedReviewToRate] = useState(null as ReviewItem | null);
  // Map: bookingId → reviewId (for already-reviewed completed bookings)
  const [reviewMap, setReviewMap] = useState({} as Record<string, ReviewItem>);

  // ── GỌI API LẤY DANH SÁCH ĐƠN CỦA CHỦ MÁY ──
  const fetchOwnerBookings = useCallback(async () => {
    try {
      const data = await bookingService.getOwnerBookings();
      setBookings(data || []);

      // Sau khi có danh sách đơn, tải map review để kiểm tra đơn nào đã được Owner đánh giá
      try {
        const myReviews = await reviewService.getMyOwnerReviews();
        const map: Record<string, ReviewItem> = {};
        (myReviews || []).forEach((r: ReviewItem) => {
          const bId = typeof r.bookingId === 'string' ? r.bookingId : (r.bookingId as any)?._id;
          if (bId) map[bId] = r;
        });
        setReviewMap(map);
      } catch {
        // ignore review map error silently
      }
    } catch (error) {
      console.warn('⚠️ [BookingManageScreen] Lỗi khi tải danh sách đơn:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchOwnerBookings();
  }, [fetchOwnerBookings]);

  // ── LẮNG NGHE SOCKET REAL-TIME ĐƠN MỚI HOẶC ĐỔI TRẠNG THÁI ──
  useEffect(() => {
    const unsub = socketService.onNewNotification((notif) => {
      if (notif.type === 'order' || notif.type === 'reminder') {
        fetchOwnerBookings();
      }
    });
    return () => unsub();
  }, [fetchOwnerBookings]);

  const onRefresh = async () => {
    setRefreshing(true);
    await fetchOwnerBookings();
  };

  // ── PHÂN LOẠI ĐƠN THEO 3 TAB CHUẨN ──
  // 1. Chờ duyệt: status === 'pending'
  const pendingOrders = useMemo(
    () => bookings.filter((b: Booking) => b.status === 'pending'),
    [bookings]
  );

  // 2. Đang cho thuê: status === 'approved' (chờ giao) hoặc 'active' (đang thuê)
  const rentingOrders = useMemo(
    () => bookings.filter((b: Booking) => b.status === 'approved' || b.status === 'active'),
    [bookings]
  );

  // 3. Lịch sử đơn: completed, rejected, cancelled
  const historyOrders = useMemo(
    () =>
      bookings.filter(
        (b: Booking) =>
          b.status === 'completed' ||
          b.status === 'rejected' ||
          b.status === 'cancelled'
      ),
    [bookings]
  );

  // Danh sách hiển thị theo Tab và Từ khóa tìm kiếm
  const currentTabOrders = useMemo(() => {
    let sourceList: Booking[] = [];
    if (activeTab === 'pending') sourceList = pendingOrders;
    else if (activeTab === 'renting') sourceList = rentingOrders;
    else sourceList = historyOrders;

    if (!searchKeyword.trim()) return sourceList;

    const query = searchKeyword.trim().toLowerCase();
    return sourceList.filter((b: Booking) => {
      const code = (b.bookingCode || '').toLowerCase();
      const devName = (
        (b.deviceId as any)?.name ||
        (b.deviceId as any)?.title ||
        ''
      ).toLowerCase();
      const renName = ((b.renterId as any)?.name || '').toLowerCase();
      return code.includes(query) || devName.includes(query) || renName.includes(query);
    });
  }, [activeTab, pendingOrders, rentingOrders, historyOrders, searchKeyword]);

  // Tổng doanh thu dự kiến / thực tế
  const totalRentingRevenue = useMemo(
    () => rentingOrders.reduce((sum: number, b: Booking) => sum + (b.rentalFee || 0), 0),
    [rentingOrders]
  );

  // ── HÀNH ĐỘNG 1: DUYỆT ĐƠN THUÊ ──
  const handleApproveBooking = (booking: Booking) => {
    const renterName = (booking.renterId as any)?.name || 'khách thuê';
    Alert.alert(
      'Xác nhận duyệt đơn 📦',
      `Phê duyệt đơn thuê #${booking.bookingCode} của ${renterName}?\n\nThông báo xác nhận sẽ được gửi tức thì đến máy của khách.`,
      [
        { text: 'Hủy', style: 'cancel' },
        {
          text: 'Duyệt đơn ngay',
          style: 'default',
          onPress: async () => {
            try {
              setIsUpdatingOrder(true);
              await bookingService.updateBookingStatusByOwner(booking._id, 'approved');
              Alert.alert(
                'Phê duyệt thành công! 🎉',
                `Đơn #${booking.bookingCode} đã được duyệt. Hãy chuẩn bị máy sẵn sàng để bàn giao cho khách.`
              );
              await fetchOwnerBookings();
            } catch (err: any) {
              Alert.alert('Lỗi', err?.response?.data?.message || 'Không thể phê duyệt đơn lúc này.');
            } finally {
              setIsUpdatingOrder(false);
            }
          },
        },
      ]
    );
  };

  // ── HÀNH ĐỘNG 2: MỞ MODAL TỪ CHỐI ĐƠN ──
  const handleOpenRejectModal = (booking: Booking) => {
    setSelectedBookingToReject(booking);
    setSelectedRejectReason(REJECT_REASONS[0]);
    setCustomRejectReason('');
    setRejectModalVisible(true);
  };

  // Xác nhận từ chối đơn
  const handleConfirmReject = async () => {
    if (!selectedBookingToReject) return;
    const finalReason =
      selectedRejectReason === 'Lý do khác' && customRejectReason.trim()
        ? customRejectReason.trim()
        : selectedRejectReason;

    try {
      setIsUpdatingOrder(true);
      await bookingService.updateBookingStatusByOwner(
        selectedBookingToReject._id,
        'rejected',
        finalReason
      );
      Alert.alert(
        'Đã từ chối đơn',
        `Đơn thuê #${selectedBookingToReject.bookingCode} đã được từ chối.`
      );
      setRejectModalVisible(false);
      setSelectedBookingToReject(null);
      await fetchOwnerBookings();
    } catch (err: any) {
      Alert.alert('Lỗi', err?.response?.data?.message || 'Không thể từ chối đơn lúc này.');
    } finally {
      setIsUpdatingOrder(false);
    }
  };

  // ── HÀNH ĐỘNG 3: BÀN GIAO THIẾT BỊ (ACTIVE) ──
  const handleHandoverBooking = (booking: Booking) => {
    const deviceName =
      (booking.deviceId as any)?.name ||
      (booking.deviceId as any)?.title ||
      'thiết bị';
    const renterName = (booking.renterId as any)?.name || 'khách thuê';

    Alert.alert(
      'Bàn giao thiết bị 📱',
      `Xác nhận đối soát mã QR và bàn giao "${deviceName}" cho ${renterName}?\n\nĐơn thuê sẽ kích hoạt và bắt đầu tính thời gian thuê.`,
      [
        { text: 'Hủy', style: 'cancel' },
        {
          text: 'Xác nhận bàn giao',
          onPress: async () => {
            try {
              setIsUpdatingOrder(true);
              await bookingService.handoverBooking(booking._id);
              Alert.alert(
                'Thành công 🎉',
                `Đã bàn giao máy thành công. Đơn thuê #${booking.bookingCode} chính thức kích hoạt.`
              );
              await fetchOwnerBookings();
            } catch (err: any) {
              Alert.alert('Lỗi', err?.response?.data?.message || 'Không thể bàn giao đơn lúc này.');
            } finally {
              setIsUpdatingOrder(false);
            }
          },
        },
      ]
    );
  };

  // ── HÀNH ĐỘNG 4: NHẬN LẠI MÁY & HOÀN TẤT (COMPLETE) ──
  const handleCompleteBooking = (booking: Booking) => {
    const deviceName =
      (booking.deviceId as any)?.name ||
      (booking.deviceId as any)?.title ||
      'thiết bị';
    const depositAmount = (booking.depositFee || 0).toLocaleString('vi-VN');
    const incomeAmount = (booking.rentalFee || 0).toLocaleString('vi-VN');

    Alert.alert(
      'Xác nhận nhận lại máy & Hoàn tất 💰',
      `Bạn đã kiểm tra thiết bị "${deviceName}" nguyên vẹn?\n\n• Tiền cọc: ${depositAmount} đ sẽ được hoàn trả cho khách thuê.\n• Doanh thu: +${incomeAmount} đ sẽ được cộng vào ví của bạn.`,
      [
        { text: 'Kiểm tra lại', style: 'cancel' },
        {
          text: 'Xác nhận hoàn tất',
          onPress: async () => {
            try {
              setIsUpdatingOrder(true);
              await bookingService.completeBooking(booking._id);
              Alert.alert(
                'Đơn thuê hoàn tất 🎉',
                `Đơn thuê #${booking.bookingCode} đã kết thúc. Tiền cọc đã giải tỏa và doanh thu đã cộng vào ví của bạn.`
              );
              await fetchOwnerBookings();
            } catch (err: any) {
              Alert.alert('Lỗi', err?.response?.data?.message || 'Không thể hoàn tất đơn lúc này.');
            } finally {
              setIsUpdatingOrder(false);
            }
          },
        },
      ]
    );
  };

  const handleCardPress = (booking: Booking) => {
    if (onNavigateToBookingDetail) {
      onNavigateToBookingDetail(booking._id);
    } else if (navigation?.navigate) {
      navigation.navigate('BookingDetail', { bookingId: booking._id });
    }
  };

  // ── HÀNH ĐỘNG 5: MỞ MODAL ĐÁNH GIÁ Ý THỨC KHÁCH THUÊ (sau khi hoàn tất) ──
  const handleOpenRateRenter = async (booking: Booking) => {
    // Kiểm tra xem review cho đơn này đã tồn tại chưa
    const existing = reviewMap[booking._id];
    if (existing) {
      if (existing.renterTrustRating !== null && existing.renterTrustRating !== undefined) {
        Alert.alert('Đã đánh giá', 'Bạn đã đánh giá ý thức khách thuê cho đơn này rồi.');
        return;
      }
      // Review tồn tại nhưng Owner chưa rate → mở modal
      const reviewWithRenter: ReviewItem = {
        ...existing,
        renterId: (booking.renterId as any) || existing.renterId,
        deviceId: (booking.deviceId as any) || existing.deviceId,
      };
      setSelectedReviewToRate(reviewWithRenter);
      setRateRenterModalVisible(true);
    } else {
      // Đơn đã completed nhưng chưa có review record -> vẫn cho phép chủ máy chấm điểm trực tiếp
      const newReviewItem: any = {
        bookingId: booking._id,
        renterId: booking.renterId,
        deviceId: booking.deviceId,
      };
      setSelectedReviewToRate(newReviewItem);
      setRateRenterModalVisible(true);
    }
  };

  return (
    <View style={[styles.container, { paddingTop: topInset }]}>
      {/* ── 1. HEADER CHÍNH ── */}
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          {onOpenDrawer ? (
            <TouchableOpacity
              style={styles.headerIconBtn}
              onPress={onOpenDrawer}
              accessibilityLabel="Mở menu"
            >
              <Ionicons name="menu-outline" size={24} color={colors.light.textPrimary} />
            </TouchableOpacity>
          ) : onBack ? (
            <TouchableOpacity
              style={styles.headerIconBtn}
              onPress={onBack}
              accessibilityLabel="Quay lại"
            >
              <Ionicons name="arrow-back" size={22} color={colors.light.textPrimary} />
            </TouchableOpacity>
          ) : (
            <TouchableOpacity
              style={styles.headerIconBtn}
              onPress={() => navigation?.goBack?.()}
            >
              <Ionicons name="arrow-back" size={22} color={colors.light.textPrimary} />
            </TouchableOpacity>
          )}

          <View style={styles.headerTitleCol}>
            <Text style={styles.headerTitle}>Quản lý Đơn thuê</Text>
            <Text style={styles.headerSubtitle}>Vận hành & Duyệt đơn chủ máy</Text>
          </View>
        </View>

        <View style={styles.headerRight}>
          <TouchableOpacity
            style={styles.headerIconBtn}
            onPress={fetchOwnerBookings}
            disabled={loading || refreshing}
          >
            <Ionicons name="refresh-outline" size={20} color={colors.light.textSecondary} />
          </TouchableOpacity>

          {onNavigateToNotifications && (
            <TouchableOpacity
              style={styles.headerIconBtn}
              onPress={onNavigateToNotifications}
            >
              <Ionicons name="notifications-outline" size={20} color={colors.light.textPrimary} />
            </TouchableOpacity>
          )}
        </View>
      </View>

      {/* ── 2. QUICK METRICS CARD ── */}
      <View style={styles.metricsCard}>
        <View style={styles.metricItem}>
          <Text style={styles.metricLabel}>Chờ bạn duyệt</Text>
          <Text style={[styles.metricValue, { color: colors.light.warning }]}>
            {pendingOrders.length}
          </Text>
        </View>
        <View style={styles.metricDivider} />
        <View style={styles.metricItem}>
          <Text style={styles.metricLabel}>Đang cho thuê</Text>
          <Text style={[styles.metricValue, { color: colors.light.primary }]}>
            {rentingOrders.length}
          </Text>
        </View>
        <View style={styles.metricDivider} />
        <View style={styles.metricItem}>
          <Text style={styles.metricLabel}>Doanh thu giữ</Text>
          <Text style={[styles.metricValue, { color: colors.light.success }]}>
            {totalRentingRevenue > 0
              ? `${(totalRentingRevenue / 1000).toLocaleString('vi-VN')}k`
              : '0 đ'}
          </Text>
        </View>
      </View>

      {/* ── 3. SEARCH BAR ── */}
      <View style={styles.searchContainer}>
        <Ionicons name="search-outline" size={18} color={colors.light.textSecondary} />
        <TextInput
          style={styles.searchInput}
          placeholder="Tìm theo mã đơn, tên máy hoặc tên khách..."
          placeholderTextColor={colors.light.textSecondary}
          value={searchKeyword}
          onChangeText={setSearchKeyword}
          clearButtonMode="while-editing"
        />
        {searchKeyword.length > 0 && (
          <TouchableOpacity onPress={() => setSearchKeyword('')}>
            <Ionicons name="close-circle" size={16} color={colors.light.textSecondary} />
          </TouchableOpacity>
        )}
      </View>

      {/* ── 4. TAB BAR 3 PHÂN MỤC CHUẨN ── */}
      <View style={styles.tabBar}>
        <TouchableOpacity
          style={[styles.tabItem, activeTab === 'pending' && styles.tabItemActive]}
          onPress={() => setActiveTab('pending')}
        >
          <View style={styles.tabContentRow}>
            <Text
              style={[
                styles.tabLabel,
                activeTab === 'pending' && styles.tabLabelActive,
              ]}
            >
              Chờ duyệt
            </Text>
            {pendingOrders.length > 0 && (
              <View
                style={[
                  styles.tabBadge,
                  {
                    backgroundColor:
                      activeTab === 'pending'
                        ? colors.light.warning
                        : colors.light.border,
                  },
                ]}
              >
                <Text
                  style={[
                    styles.tabBadgeText,
                    {
                      color:
                        activeTab === 'pending'
                          ? '#FFFFFF'
                          : colors.light.textSecondary,
                    },
                  ]}
                >
                  {pendingOrders.length}
                </Text>
              </View>
            )}
          </View>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.tabItem, activeTab === 'renting' && styles.tabItemActive]}
          onPress={() => setActiveTab('renting')}
        >
          <View style={styles.tabContentRow}>
            <Text
              style={[
                styles.tabLabel,
                activeTab === 'renting' && styles.tabLabelActive,
              ]}
            >
              Đang cho thuê
            </Text>
            {rentingOrders.length > 0 && (
              <View
                style={[
                  styles.tabBadge,
                  {
                    backgroundColor:
                      activeTab === 'renting'
                        ? colors.light.primary
                        : colors.light.border,
                  },
                ]}
              >
                <Text
                  style={[
                    styles.tabBadgeText,
                    {
                      color:
                        activeTab === 'renting'
                          ? '#FFFFFF'
                          : colors.light.textSecondary,
                    },
                  ]}
                >
                  {rentingOrders.length}
                </Text>
              </View>
            )}
          </View>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.tabItem, activeTab === 'history' && styles.tabItemActive]}
          onPress={() => setActiveTab('history')}
        >
          <View style={styles.tabContentRow}>
            <Text
              style={[
                styles.tabLabel,
                activeTab === 'history' && styles.tabLabelActive,
              ]}
            >
              Lịch sử đơn
            </Text>
            <View
              style={[
                styles.tabBadge,
                {
                  backgroundColor:
                    activeTab === 'history'
                      ? colors.light.primaryLight
                      : colors.light.surface,
                },
              ]}
            >
              <Text
                style={[
                  styles.tabBadgeText,
                  {
                    color:
                      activeTab === 'history'
                        ? colors.light.primary
                        : colors.light.textSecondary,
                  },
                ]}
              >
                {historyOrders.length}
              </Text>
            </View>
          </View>
        </TouchableOpacity>
      </View>

      {/* ── 5. DANH SÁCH ĐƠN HÀNG ── */}
      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.light.primary} />
          <Text style={styles.loadingText}>Đang tải danh sách đơn thuê của bạn...</Text>
        </View>
      ) : (
        <FlatList
          data={currentTabOrders}
          keyExtractor={(item: Booking) => item._id}
          renderItem={({ item }: { item: Booking }) => (
            <OwnerApprovalCard
              booking={item}
              onApprove={handleApproveBooking}
              onReject={handleOpenRejectModal}
              onHandover={handleHandoverBooking}
              onComplete={handleCompleteBooking}
              onPress={handleCardPress}
              onRateRenter={handleOpenRateRenter}
              renterReview={reviewMap[item._id]}
              isUpdating={isUpdatingOrder}
            />
          )}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              colors={[colors.light.primary]}
              tintColor={colors.light.primary}
            />
          }
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <View style={styles.emptyIconBox}>
                <Ionicons
                  name={
                    activeTab === 'pending'
                      ? 'checkmark-done-circle-outline'
                      : activeTab === 'renting'
                      ? 'cube-outline'
                      : 'file-tray-outline'
                  }
                  size={48}
                  color={
                    activeTab === 'pending'
                      ? colors.light.success
                      : colors.light.textSecondary
                  }
                />
              </View>

              <Text style={styles.emptyTitle}>
                {activeTab === 'pending'
                  ? 'Không có đơn chờ duyệt'
                  : activeTab === 'renting'
                  ? 'Chưa có thiết bị đang cho thuê'
                  : 'Chưa có lịch sử đơn thuê'}
              </Text>

              <Text style={styles.emptySubtitle}>
                {activeTab === 'pending'
                  ? 'Tất cả yêu cầu thuê máy mới đã được xử lý. Khi có khách thuê mới, đơn sẽ lập tức xuất hiện tại đây.'
                  : activeTab === 'renting'
                  ? 'Các đơn đã duyệt chờ bàn giao hoặc đang trong thời gian thuê sẽ hiển thị tại tab này.'
                  : 'Lịch sử các đơn đã hoàn tất, đã hủy hoặc bị từ chối sẽ được lưu trữ tại đây.'}
              </Text>

              {searchKeyword.length > 0 && (
                <TouchableOpacity
                  style={styles.clearSearchBtn}
                  onPress={() => setSearchKeyword('')}
                >
                  <Text style={styles.clearSearchText}>Xóa bộ lọc tìm kiếm</Text>
                </TouchableOpacity>
              )}
            </View>
          }
        />
      )}

      {/* ── 6. MODAL TỪ CHỐI ĐƠN HÀNG KÈM LÝ DO ── */}
      <Modal
        visible={rejectModalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setRejectModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <View style={styles.modalHeaderTitleRow}>
                <Ionicons name="close-circle-outline" size={20} color={colors.light.error} />
                <Text style={styles.modalTitle}>Từ chối đơn thuê</Text>
              </View>
              <TouchableOpacity
                onPress={() => setRejectModalVisible(false)}
                style={styles.modalCloseBtn}
              >
                <Ionicons name="close" size={20} color={colors.light.textSecondary} />
              </TouchableOpacity>
            </View>

            {selectedBookingToReject && (
              <Text style={styles.modalDesc}>
                Vui lòng chọn lý do từ chối đơn #{selectedBookingToReject.bookingCode}. Thông báo
                kèm lý do sẽ được gửi trực tiếp đến khách thuê.
              </Text>
            )}

            <View style={styles.reasonRadioList}>
              {REJECT_REASONS.map((reason) => {
                const isSelected = selectedRejectReason === reason;
                return (
                  <TouchableOpacity
                    key={reason}
                    style={[
                      styles.reasonRadioItem,
                      isSelected && styles.reasonRadioItemSelected,
                    ]}
                    onPress={() => setSelectedRejectReason(reason)}
                    activeOpacity={0.7}
                  >
                    <Ionicons
                      name={isSelected ? 'radio-button-on' : 'radio-button-off'}
                      size={18}
                      color={isSelected ? colors.light.error : colors.light.textSecondary}
                    />
                    <Text
                      style={[
                        styles.reasonRadioText,
                        isSelected && styles.reasonRadioTextSelected,
                      ]}
                    >
                      {reason}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>

            {selectedRejectReason === 'Lý do khác' && (
              <TextInput
                style={styles.customReasonInput}
                placeholder="Nhập lý do từ chối chi tiết..."
                placeholderTextColor={colors.light.textSecondary}
                value={customRejectReason}
                onChangeText={setCustomRejectReason}
                multiline
                numberOfLines={3}
              />
            )}

            <View style={styles.modalActions}>
              <TouchableOpacity
                style={styles.modalCancelBtn}
                onPress={() => setRejectModalVisible(false)}
                disabled={isUpdatingOrder}
              >
                <Text style={styles.modalCancelText}>Hủy bỏ</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.modalConfirmBtn}
                onPress={handleConfirmReject}
                disabled={isUpdatingOrder}
              >
                {isUpdatingOrder ? (
                  <ActivityIndicator size="small" color="#FFFFFF" />
                ) : (
                  <Text style={styles.modalConfirmText}>Xác nhận từ chối</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* ── 7. MODAL CHỦ MÁY ĐÁNH GIÁ Ý THỨC KHÁCH THUÊ ── */}
      <OwnerRateRenterModal
        visible={rateRenterModalVisible}
        onClose={() => {
          setRateRenterModalVisible(false);
          setSelectedReviewToRate(null);
        }}
        review={selectedReviewToRate}
        onSuccess={() => {
          fetchOwnerBookings();
        }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.light.background,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: colors.light.border,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flex: 1,
  },
  headerIconBtn: {
    width: 38,
    height: 38,
    borderRadius: 10,
    backgroundColor: colors.light.surface,
    borderWidth: 1,
    borderColor: colors.light.border,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitleCol: {
    flex: 1,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: colors.light.textPrimary,
  },
  headerSubtitle: {
    fontSize: 12,
    color: colors.light.textSecondary,
    fontWeight: '500',
  },
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  metricsCard: {
    flexDirection: 'row',
    backgroundColor: colors.light.surface,
    marginHorizontal: 16,
    marginTop: 12,
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.light.border,
  },
  metricItem: {
    flex: 1,
    alignItems: 'center',
  },
  metricDivider: {
    width: 1,
    height: '80%',
    backgroundColor: colors.light.border,
    alignSelf: 'center',
  },
  metricLabel: {
    fontSize: 11,
    color: colors.light.textSecondary,
    fontWeight: '500',
    marginBottom: 4,
  },
  metricValue: {
    fontSize: 16,
    fontWeight: '800',
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.light.surface,
    marginHorizontal: 16,
    marginTop: 10,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: colors.light.border,
    gap: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: 13,
    color: colors.light.textPrimary,
    padding: 0,
  },
  tabBar: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    marginTop: 12,
    borderBottomWidth: 1,
    borderBottomColor: colors.light.border,
  },
  tabItem: {
    flex: 1,
    paddingVertical: 12,
    alignItems: 'center',
    borderBottomWidth: 2,
    borderBottomColor: 'transparent',
  },
  tabItemActive: {
    borderBottomColor: colors.light.primary,
  },
  tabContentRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  tabLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.light.textSecondary,
  },
  tabLabelActive: {
    color: colors.light.primary,
    fontWeight: '700',
  },
  tabBadge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 10,
  },
  tabBadgeText: {
    fontSize: 10,
    fontWeight: '700',
  },
  listContent: {
    padding: 16,
    paddingBottom: 36,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 12,
  },
  loadingText: {
    fontSize: 13,
    color: colors.light.textSecondary,
  },
  emptyContainer: {
    paddingVertical: 48,
    alignItems: 'center',
    paddingHorizontal: 24,
  },
  emptyIconBox: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: colors.light.surface,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.light.textPrimary,
    marginBottom: 8,
  },
  emptySubtitle: {
    fontSize: 13,
    color: colors.light.textSecondary,
    textAlign: 'center',
    lineHeight: 18,
  },
  clearSearchBtn: {
    marginTop: 16,
    paddingHorizontal: 16,
    paddingVertical: 8,
    backgroundColor: colors.light.primaryLight,
    borderRadius: 8,
  },
  clearSearchText: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.light.primaryDark,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.6)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalContent: {
    backgroundColor: colors.light.background,
    borderRadius: 16,
    padding: 20,
    width: '100%',
    maxWidth: 420,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 8,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: colors.light.border,
  },
  modalHeaderTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  modalTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: colors.light.textPrimary,
  },
  modalCloseBtn: {
    padding: 4,
  },
  modalDesc: {
    fontSize: 13,
    color: colors.light.textSecondary,
    marginVertical: 12,
    lineHeight: 18,
  },
  reasonRadioList: {
    gap: 10,
    marginBottom: 12,
  },
  reasonRadioItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    padding: 10,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: colors.light.border,
    backgroundColor: colors.light.surface,
  },
  reasonRadioItemSelected: {
    borderColor: colors.light.error,
    backgroundColor: '#FEF2F2',
  },
  reasonRadioText: {
    fontSize: 13,
    color: colors.light.textPrimary,
    flex: 1,
  },
  reasonRadioTextSelected: {
    fontWeight: '700',
    color: colors.light.error,
  },
  customReasonInput: {
    borderWidth: 1,
    borderColor: colors.light.border,
    borderRadius: 10,
    padding: 10,
    fontSize: 13,
    color: colors.light.textPrimary,
    backgroundColor: colors.light.surface,
    textAlignVertical: 'top',
    marginBottom: 16,
  },
  modalActions: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 8,
  },
  modalCancelBtn: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: colors.light.border,
    alignItems: 'center',
  },
  modalCancelText: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.light.textSecondary,
  },
  modalConfirmBtn: {
    flex: 1.4,
    paddingVertical: 12,
    borderRadius: 10,
    backgroundColor: colors.light.error,
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalConfirmText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#FFFFFF',
  },
});
