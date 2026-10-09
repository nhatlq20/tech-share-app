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
import { theme, STRINGS, CONFIG } from '../../constants';
import { OwnerApprovalCard } from '../../components/booking/OwnerApprovalCard';
import { OwnerRateRenterModal } from '../../components/booking/OwnerRateRenterModal';
import { OwnerQrScannerModal } from '../../components/booking/OwnerQrScannerModal';
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

const REJECT_REASONS = STRINGS.BOOKING_MANAGE.REJECT_REASONS;

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

  // QR Scanner Modal State
  const [scannerVisible, setScannerVisible] = useState(false);

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

  // ── LOAD OWNER BOOKINGS FROM API ──
  const fetchOwnerBookings = useCallback(async () => {
    try {
      const data = await bookingService.getOwnerBookings();
      setBookings(data || []);

      // Load owner reviews map to check which completed orders were already reviewed
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
      console.warn('⚠️ [BookingManageScreen] Failed to fetch owner bookings:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchOwnerBookings();
  }, [fetchOwnerBookings]);

  // ── SOCKET LISTENER FOR REAL-TIME UPDATES ──
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

  // ── 3 STANDARD CATEGORY TABS ──
  // 1. Pending approval: status === 'pending'
  const pendingOrders = useMemo(
    () => bookings.filter((b: Booking) => b.status === 'pending'),
    [bookings]
  );

  // 2. Active & Renting: status === 'approved' (ready for handover) or 'active' (renting)
  const rentingOrders = useMemo(
    () => bookings.filter((b: Booking) => b.status === 'approved' || b.status === 'active'),
    [bookings]
  );

  // 3. Order History: completed, rejected, cancelled
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

  // Filtered orders by active tab & search query
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

  // Total active renting revenue
  const totalRentingRevenue = useMemo(
    () => rentingOrders.reduce((sum: number, b: Booking) => sum + (b.rentalFee || 0), 0),
    [rentingOrders]
  );

  // ── ACTION 1: APPROVE BOOKING ──
  const handleApproveBooking = (booking: Booking) => {
    const renterName = (booking.renterId as any)?.name || STRINGS.BOOKING_MANAGE.DEFAULT_RENTER_NAME;
    Alert.alert(
      STRINGS.BOOKING_MANAGE.CONFIRM_APPROVE_TITLE,
      STRINGS.BOOKING_MANAGE.CONFIRM_APPROVE_MSG(booking.bookingCode, renterName),
      [
        { text: STRINGS.COMMON.CANCEL, style: 'cancel' },
        {
          text: STRINGS.BOOKING_MANAGE.APPROVE_NOW,
          style: 'default',
          onPress: async () => {
            try {
              setIsUpdatingOrder(true);
              await bookingService.updateBookingStatusByOwner(booking._id, 'approved');
              Alert.alert(
                STRINGS.BOOKING_MANAGE.APPROVE_SUCCESS_TITLE,
                STRINGS.BOOKING_MANAGE.APPROVE_SUCCESS_MSG(booking.bookingCode)
              );
              await fetchOwnerBookings();
            } catch (err: any) {
              Alert.alert(
                STRINGS.COMMON.ERROR,
                err?.response?.data?.message || STRINGS.BOOKING_MANAGE.APPROVE_ERROR_DEFAULT
              );
            } finally {
              setIsUpdatingOrder(false);
            }
          },
        },
      ]
    );
  };

  // ── ACTION 2: OPEN REJECT MODAL ──
  const handleOpenRejectModal = (booking: Booking) => {
    setSelectedBookingToReject(booking);
    setSelectedRejectReason(REJECT_REASONS[0]);
    setCustomRejectReason('');
    setRejectModalVisible(true);
  };

  // Confirm Reject
  const handleConfirmReject = async () => {
    if (!selectedBookingToReject) return;
    const finalReason =
      selectedRejectReason === STRINGS.BOOKING_MANAGE.OTHER_REASON && customRejectReason.trim()
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
        STRINGS.BOOKING_MANAGE.REJECT_SUCCESS_TITLE,
        STRINGS.BOOKING_MANAGE.REJECT_SUCCESS_MSG(selectedBookingToReject.bookingCode)
      );
      setRejectModalVisible(false);
      setSelectedBookingToReject(null);
      await fetchOwnerBookings();
    } catch (err: any) {
      Alert.alert(
        STRINGS.COMMON.ERROR,
        err?.response?.data?.message || STRINGS.BOOKING_MANAGE.REJECT_ERROR_DEFAULT
      );
    } finally {
      setIsUpdatingOrder(false);
    }
  };

  // ── ACTION 3: HANDOVER DEVICE (MANUAL ACTIVATE) ──
  const handleHandoverBooking = (booking: Booking) => {
    const deviceName =
      (booking.deviceId as any)?.name ||
      (booking.deviceId as any)?.title ||
      STRINGS.BOOKING_MANAGE.DEFAULT_DEVICE_NAME;
    const renterName = (booking.renterId as any)?.name || STRINGS.BOOKING_MANAGE.DEFAULT_RENTER_NAME;

    Alert.alert(
      STRINGS.BOOKING_MANAGE.HANDOVER_TITLE,
      STRINGS.BOOKING_MANAGE.HANDOVER_MSG(deviceName, renterName),
      [
        { text: STRINGS.COMMON.CANCEL, style: 'cancel' },
        {
          text: STRINGS.BOOKING_MANAGE.CONFIRM_HANDOVER,
          onPress: async () => {
            try {
              setIsUpdatingOrder(true);
              await bookingService.handoverBooking(booking._id);
              Alert.alert(
                STRINGS.BOOKING_MANAGE.HANDOVER_SUCCESS_TITLE,
                STRINGS.BOOKING_MANAGE.HANDOVER_SUCCESS_MSG(booking.bookingCode)
              );
              await fetchOwnerBookings();
            } catch (err: any) {
              Alert.alert(
                STRINGS.COMMON.ERROR,
                err?.response?.data?.message || STRINGS.BOOKING_MANAGE.HANDOVER_ERROR_DEFAULT
              );
            } finally {
              setIsUpdatingOrder(false);
            }
          },
        },
      ]
    );
  };

  // ── ACTION 4: COMPLETE & RETURN ──
  const handleCompleteBooking = (booking: Booking) => {
    const deviceName =
      (booking.deviceId as any)?.name ||
      (booking.deviceId as any)?.title ||
      STRINGS.BOOKING_MANAGE.DEFAULT_DEVICE_NAME;
    const depositAmount = (booking.depositFee || 0).toLocaleString(CONFIG.CURRENCY.LOCALE);
    const incomeAmount = (booking.rentalFee || 0).toLocaleString(CONFIG.CURRENCY.LOCALE);

    Alert.alert(
      STRINGS.BOOKING_MANAGE.COMPLETE_TITLE,
      STRINGS.BOOKING_MANAGE.COMPLETE_MSG(deviceName, depositAmount, incomeAmount),
      [
        { text: STRINGS.BOOKING_MANAGE.RECHECK, style: 'cancel' },
        {
          text: STRINGS.BOOKING_MANAGE.CONFIRM_COMPLETE,
          onPress: async () => {
            try {
              setIsUpdatingOrder(true);
              await bookingService.completeBooking(booking._id);
              Alert.alert(
                STRINGS.BOOKING_MANAGE.COMPLETE_SUCCESS_TITLE,
                STRINGS.BOOKING_MANAGE.COMPLETE_SUCCESS_MSG(booking.bookingCode)
              );
              await fetchOwnerBookings();
            } catch (err: any) {
              Alert.alert(
                STRINGS.COMMON.ERROR,
                err?.response?.data?.message || STRINGS.BOOKING_MANAGE.COMPLETE_ERROR_DEFAULT
              );
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

  // ── ACTION 5: RATE RENTER TRUST (AFTER COMPLETION) ──
  const handleOpenRateRenter = async (booking: Booking) => {
    const existing = reviewMap[booking._id];
    if (existing) {
      if (existing.renterTrustRating !== null && existing.renterTrustRating !== undefined) {
        Alert.alert(STRINGS.BOOKING_MANAGE.ALREADY_RATED_TITLE, STRINGS.BOOKING_MANAGE.ALREADY_RATED_MSG);
        return;
      }
      const reviewWithRenter: ReviewItem = {
        ...existing,
        renterId: (booking.renterId as any) || existing.renterId,
        deviceId: (booking.deviceId as any) || existing.deviceId,
      };
      setSelectedReviewToRate(reviewWithRenter);
      setRateRenterModalVisible(true);
    } else {
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
      {/* ── 1. HEADER ── */}
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          {onOpenDrawer || (navigation as any)?.openDrawer ? (
            <TouchableOpacity
              style={styles.headerIconBtn}
              onPress={() => {
                if (onOpenDrawer) {
                  onOpenDrawer();
                } else if ((navigation as any)?.openDrawer) {
                  (navigation as any).openDrawer();
                }
              }}
              accessibilityLabel={STRINGS.OWNER_SIDEBAR.BRAND_TITLE}
            >
              <Ionicons name="menu-outline" size={24} color={theme.textPrimary} />
            </TouchableOpacity>
          ) : onBack ? (
            <TouchableOpacity
              style={styles.headerIconBtn}
              onPress={onBack}
              accessibilityLabel={STRINGS.NOTIFICATION_SCREEN.BACK_ACCESSIBILITY_LABEL}
            >
              <Ionicons name="arrow-back" size={22} color={theme.textPrimary} />
            </TouchableOpacity>
          ) : (
            <TouchableOpacity
              style={styles.headerIconBtn}
              onPress={() => navigation?.goBack?.()}
            >
              <Ionicons name="arrow-back" size={22} color={theme.textPrimary} />
            </TouchableOpacity>
          )}

          <View style={styles.headerTitleCol}>
            <Text style={styles.headerTitle}>{STRINGS.BOOKING_MANAGE.HEADER_TITLE}</Text>
            <Text style={styles.headerSubtitle}>{STRINGS.BOOKING_MANAGE.HEADER_SUBTITLE}</Text>
          </View>
        </View>

        <View style={styles.headerRight}>
          {/* Quick QR Scanner CTA */}
          <TouchableOpacity
            style={styles.headerScanBtn}
            onPress={() => setScannerVisible(true)}
            activeOpacity={0.85}
          >
            <Ionicons name="qr-code-outline" size={17} color={theme.white} />
            <Text style={styles.headerScanBtnText}>{STRINGS.BOOKING_MANAGE.SCAN_QR}</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.headerIconBtn}
            onPress={fetchOwnerBookings}
            disabled={loading || refreshing}
          >
            <Ionicons name="refresh-outline" size={20} color={theme.textSecondary} />
          </TouchableOpacity>

          {onNavigateToNotifications && (
            <TouchableOpacity
              style={styles.headerIconBtn}
              onPress={onNavigateToNotifications}
            >
              <Ionicons name="notifications-outline" size={20} color={theme.textPrimary} />
            </TouchableOpacity>
          )}
        </View>
      </View>

      {/* ── 2. QUICK METRICS CARD ── */}
      <View style={styles.metricsCard}>
        <View style={styles.metricItem}>
          <Text style={styles.metricLabel}>{STRINGS.BOOKING_MANAGE.METRIC_PENDING}</Text>
          <Text style={[styles.metricValue, { color: theme.warning }]}>
            {pendingOrders.length}
          </Text>
        </View>
        <View style={styles.metricDivider} />
        <View style={styles.metricItem}>
          <Text style={styles.metricLabel}>{STRINGS.BOOKING_MANAGE.METRIC_ACTIVE}</Text>
          <Text style={[styles.metricValue, { color: theme.primary }]}>
            {rentingOrders.length}
          </Text>
        </View>
        <View style={styles.metricDivider} />
        <View style={styles.metricItem}>
          <Text style={styles.metricLabel}>{STRINGS.BOOKING_MANAGE.METRIC_REVENUE}</Text>
          <Text style={[styles.metricValue, { color: theme.success }]}>
            {totalRentingRevenue > 0
              ? `${(totalRentingRevenue / 1000).toLocaleString(CONFIG.CURRENCY.LOCALE)}k`
              : `0 ${STRINGS.COMMON.CURRENCY_SUFFIX}`}
          </Text>
        </View>
      </View>

      {/* ── 3. SEARCH BAR ── */}
      <View style={styles.searchContainer}>
        <Ionicons name="search-outline" size={18} color={theme.textSecondary} />
        <TextInput
          style={styles.searchInput}
          placeholder={STRINGS.BOOKING_MANAGE.SEARCH_PLACEHOLDER}
          placeholderTextColor={theme.textSecondary}
          value={searchKeyword}
          onChangeText={setSearchKeyword}
          clearButtonMode="while-editing"
        />
        {searchKeyword.length > 0 && (
          <TouchableOpacity onPress={() => setSearchKeyword('')}>
            <Ionicons name="close-circle" size={16} color={theme.textSecondary} />
          </TouchableOpacity>
        )}
      </View>

      {/* ── 4. TAB BAR ── */}
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
              {STRINGS.BOOKING_MANAGE.TAB_PENDING}
            </Text>
            {pendingOrders.length > 0 && (
              <View
                style={[
                  styles.tabBadge,
                  {
                    backgroundColor:
                      activeTab === 'pending'
                        ? theme.warning
                        : theme.border,
                  },
                ]}
              >
                <Text
                  style={[
                    styles.tabBadgeText,
                    {
                      color:
                        activeTab === 'pending'
                          ? theme.white
                          : theme.textSecondary,
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
              {STRINGS.BOOKING_MANAGE.TAB_RENTING}
            </Text>
            {rentingOrders.length > 0 && (
              <View
                style={[
                  styles.tabBadge,
                  {
                    backgroundColor:
                      activeTab === 'renting'
                        ? theme.primary
                        : theme.border,
                  },
                ]}
              >
                <Text
                  style={[
                    styles.tabBadgeText,
                    {
                      color:
                        activeTab === 'renting'
                          ? theme.white
                          : theme.textSecondary,
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
              {STRINGS.BOOKING_MANAGE.TAB_HISTORY}
            </Text>
            <View
              style={[
                styles.tabBadge,
                {
                  backgroundColor:
                    activeTab === 'history'
                      ? theme.colors.primaryLight
                      : theme.surface,
                },
              ]}
            >
              <Text
                style={[
                  styles.tabBadgeText,
                  {
                    color:
                      activeTab === 'history'
                        ? theme.primary
                        : theme.textSecondary,
                  },
                ]}
              >
                {historyOrders.length}
              </Text>
            </View>
          </View>
        </TouchableOpacity>
      </View>

      {/* ── 5. ORDER LIST ── */}
      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={theme.primary} />
          <Text style={styles.loadingText}>{STRINGS.BOOKING_MANAGE.LOADING_ORDERS}</Text>
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
              onScanQr={() => setScannerVisible(true)}
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
              colors={[theme.primary]}
              tintColor={theme.primary}
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
                      ? theme.success
                      : theme.textSecondary
                  }
                />
              </View>

              <Text style={styles.emptyTitle}>
                {activeTab === 'pending'
                  ? STRINGS.BOOKING_MANAGE.EMPTY_PENDING_TITLE
                  : activeTab === 'renting'
                  ? STRINGS.BOOKING_MANAGE.EMPTY_RENTING_TITLE
                  : STRINGS.BOOKING_MANAGE.EMPTY_HISTORY_TITLE}
              </Text>

              <Text style={styles.emptySubtitle}>
                {activeTab === 'pending'
                  ? STRINGS.BOOKING_MANAGE.EMPTY_PENDING_SUB
                  : activeTab === 'renting'
                  ? STRINGS.BOOKING_MANAGE.EMPTY_RENTING_SUB
                  : STRINGS.BOOKING_MANAGE.EMPTY_HISTORY_SUB}
              </Text>

              {searchKeyword.length > 0 && (
                <TouchableOpacity
                  style={styles.clearSearchBtn}
                  onPress={() => setSearchKeyword('')}
                >
                  <Text style={styles.clearSearchText}>{STRINGS.BOOKING_MANAGE.CLEAR_SEARCH}</Text>
                </TouchableOpacity>
              )}
            </View>
          }
        />
      )}

      {/* ── 6. REJECT BOOKING MODAL ── */}
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
                <Ionicons name="close-circle-outline" size={20} color={theme.danger} />
                <Text style={styles.modalTitle}>{STRINGS.BOOKING_MANAGE.REJECT_MODAL_TITLE}</Text>
              </View>
              <TouchableOpacity
                onPress={() => setRejectModalVisible(false)}
                style={styles.modalCloseBtn}
              >
                <Ionicons name="close" size={20} color={theme.textSecondary} />
              </TouchableOpacity>
            </View>

            {selectedBookingToReject && (
              <Text style={styles.modalDesc}>
                {STRINGS.BOOKING_MANAGE.REJECT_MODAL_DESC(selectedBookingToReject.bookingCode)}
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
                      color={isSelected ? theme.danger : theme.textSecondary}
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

            {selectedRejectReason === STRINGS.BOOKING_MANAGE.OTHER_REASON && (
              <TextInput
                style={styles.customReasonInput}
                placeholder={STRINGS.BOOKING_MANAGE.CUSTOM_REASON_PLACEHOLDER}
                placeholderTextColor={theme.textSecondary}
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
                <Text style={styles.modalCancelText}>{STRINGS.COMMON.CANCEL}</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.modalConfirmBtn}
                onPress={handleConfirmReject}
                disabled={isUpdatingOrder}
              >
                {isUpdatingOrder ? (
                  <ActivityIndicator size="small" color={theme.white} />
                ) : (
                  <Text style={styles.modalConfirmText}>{STRINGS.BOOKING_MANAGE.CONFIRM_REJECT}</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* ── 7. OWNER RATE RENTER MODAL ── */}
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

      {/* ── 8. OWNER HANDOVER QR SCANNER MODAL ── */}
      <OwnerQrScannerModal
        visible={scannerVisible}
        onClose={() => setScannerVisible(false)}
        onHandoverSuccess={() => {
          fetchOwnerBookings();
        }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.background,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.sm + 4,
    borderBottomWidth: 1,
    borderBottomColor: theme.border,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.sm + 4,
    flex: 1,
  },
  headerIconBtn: {
    width: 38,
    height: 38,
    borderRadius: theme.radii.sm + 2,
    backgroundColor: theme.surface,
    borderWidth: 1,
    borderColor: theme.border,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerScanBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.primary,
    paddingHorizontal: theme.spacing.sm + 4,
    paddingVertical: theme.spacing.sm,
    borderRadius: theme.radii.sm + 2,
    gap: theme.spacing.xs + 2,
  },
  headerScanBtnText: {
    color: theme.white,
    fontSize: theme.typography.sizes.xs,
    fontWeight: theme.typography.weights.bold,
  },
  headerTitleCol: {
    flex: 1,
  },
  headerTitle: {
    fontSize: theme.typography.sizes.subheading,
    fontWeight: theme.typography.weights.heavy,
    color: theme.textPrimary,
  },
  headerSubtitle: {
    fontSize: theme.typography.sizes.xs,
    color: theme.textSecondary,
    fontWeight: theme.typography.weights.medium,
  },
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.sm,
  },
  metricsCard: {
    flexDirection: 'row',
    backgroundColor: theme.surface,
    marginHorizontal: theme.spacing.md,
    marginTop: theme.spacing.sm + 4,
    padding: theme.spacing.sm + 4,
    borderRadius: theme.radii.md,
    borderWidth: 1,
    borderColor: theme.border,
  },
  metricItem: {
    flex: 1,
    alignItems: 'center',
  },
  metricDivider: {
    width: 1,
    height: '80%',
    backgroundColor: theme.border,
    alignSelf: 'center',
  },
  metricLabel: {
    fontSize: 11,
    color: theme.textSecondary,
    fontWeight: theme.typography.weights.medium,
    marginBottom: theme.spacing.xs,
  },
  metricValue: {
    fontSize: theme.typography.sizes.base,
    fontWeight: theme.typography.weights.heavy,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.surface,
    marginHorizontal: theme.spacing.md,
    marginTop: theme.spacing.sm + 2,
    paddingHorizontal: theme.spacing.sm + 4,
    paddingVertical: theme.spacing.sm,
    borderRadius: theme.radii.sm + 2,
    borderWidth: 1,
    borderColor: theme.border,
    gap: theme.spacing.sm,
  },
  searchInput: {
    flex: 1,
    fontSize: theme.typography.sizes.sm,
    color: theme.textPrimary,
    padding: 0,
  },
  tabBar: {
    flexDirection: 'row',
    paddingHorizontal: theme.spacing.md,
    marginTop: theme.spacing.sm + 4,
    borderBottomWidth: 1,
    borderBottomColor: theme.border,
  },
  tabItem: {
    flex: 1,
    paddingVertical: theme.spacing.sm + 4,
    alignItems: 'center',
    borderBottomWidth: 2,
    borderBottomColor: theme.transparent,
  },
  tabItemActive: {
    borderBottomColor: theme.primary,
  },
  tabContentRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.xs + 2,
  },
  tabLabel: {
    fontSize: theme.typography.sizes.sm,
    fontWeight: theme.typography.weights.semibold,
    color: theme.textSecondary,
  },
  tabLabelActive: {
    color: theme.primary,
    fontWeight: theme.typography.weights.bold,
  },
  tabBadge: {
    paddingHorizontal: theme.spacing.xs + 2,
    paddingVertical: theme.spacing.xs / 2,
    borderRadius: theme.radii.sm + 2,
  },
  tabBadgeText: {
    fontSize: 10,
    fontWeight: theme.typography.weights.bold,
  },
  listContent: {
    padding: theme.spacing.md,
    paddingBottom: theme.spacing.xl + 4,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: theme.spacing.sm + 4,
  },
  loadingText: {
    fontSize: theme.typography.sizes.sm,
    color: theme.textSecondary,
  },
  emptyContainer: {
    paddingVertical: 48,
    alignItems: 'center',
    paddingHorizontal: theme.spacing.lg,
  },
  emptyIconBox: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: theme.surface,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: theme.spacing.md,
  },
  emptyTitle: {
    fontSize: theme.typography.sizes.base,
    fontWeight: theme.typography.weights.bold,
    color: theme.textPrimary,
    marginBottom: theme.spacing.sm,
  },
  emptySubtitle: {
    fontSize: theme.typography.sizes.sm,
    color: theme.textSecondary,
    textAlign: 'center',
    lineHeight: 18,
  },
  clearSearchBtn: {
    marginTop: theme.spacing.md,
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.sm,
    backgroundColor: theme.colors.primaryLight,
    borderRadius: theme.radii.sm,
  },
  clearSearchText: {
    fontSize: theme.typography.sizes.xs,
    fontWeight: theme.typography.weights.bold,
    color: theme.colors.primaryDark,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: theme.overlay,
    justifyContent: 'center',
    alignItems: 'center',
    padding: theme.spacing.lg - 4,
  },
  modalContent: {
    backgroundColor: theme.background,
    borderRadius: theme.radii.lg,
    padding: theme.spacing.lg - 4,
    width: '100%',
    maxWidth: 420,
    shadowColor: theme.shadow,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 8,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingBottom: theme.spacing.sm + 4,
    borderBottomWidth: 1,
    borderBottomColor: theme.border,
  },
  modalHeaderTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.sm,
  },
  modalTitle: {
    fontSize: theme.typography.sizes.base,
    fontWeight: theme.typography.weights.heavy,
    color: theme.textPrimary,
  },
  modalCloseBtn: {
    padding: theme.spacing.xs,
  },
  modalDesc: {
    fontSize: theme.typography.sizes.sm,
    color: theme.textSecondary,
    marginVertical: theme.spacing.sm + 4,
    lineHeight: 18,
  },
  reasonRadioList: {
    gap: theme.spacing.sm + 2,
    marginBottom: theme.spacing.sm + 4,
  },
  reasonRadioItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.sm + 2,
    padding: theme.spacing.sm + 2,
    borderRadius: theme.radii.sm + 2,
    borderWidth: 1,
    borderColor: theme.border,
    backgroundColor: theme.surface,
  },
  reasonRadioItemSelected: {
    borderColor: theme.danger,
    backgroundColor: theme.dangerLight,
  },
  reasonRadioText: {
    fontSize: theme.typography.sizes.sm,
    color: theme.textPrimary,
    flex: 1,
  },
  reasonRadioTextSelected: {
    fontWeight: theme.typography.weights.bold,
    color: theme.danger,
  },
  customReasonInput: {
    borderWidth: 1,
    borderColor: theme.border,
    borderRadius: theme.radii.sm + 2,
    padding: theme.spacing.sm + 2,
    fontSize: theme.typography.sizes.sm,
    color: theme.textPrimary,
    backgroundColor: theme.surface,
    textAlignVertical: 'top',
    marginBottom: theme.spacing.md,
  },
  modalActions: {
    flexDirection: 'row',
    gap: theme.spacing.sm + 2,
    marginTop: theme.spacing.sm,
  },
  modalCancelBtn: {
    flex: 1,
    paddingVertical: theme.spacing.sm + 4,
    borderRadius: theme.radii.sm + 2,
    borderWidth: 1,
    borderColor: theme.border,
    alignItems: 'center',
  },
  modalCancelText: {
    fontSize: theme.typography.sizes.sm,
    fontWeight: theme.typography.weights.bold,
    color: theme.textSecondary,
  },
  modalConfirmBtn: {
    flex: 1.4,
    paddingVertical: theme.spacing.sm + 4,
    borderRadius: theme.radii.sm + 2,
    backgroundColor: theme.danger,
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalConfirmText: {
    fontSize: theme.typography.sizes.sm,
    fontWeight: theme.typography.weights.bold,
    color: theme.white,
  },
});
