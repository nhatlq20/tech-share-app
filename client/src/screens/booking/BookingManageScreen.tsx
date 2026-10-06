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

const REJECT_REASONS = [
  'Device under maintenance or unavailable',
  'Unexpected personal scheduling conflict',
  'Inconvenient pickup/handover time or location',
  'Renter unresponsive to verification requests',
  'Other reason',
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
    const renterName = (booking.renterId as any)?.name || 'renter';
    Alert.alert(
      'Confirm Approval 📦',
      `Approve booking #${booking.bookingCode} for ${renterName}?\n\nInstant confirmation notification will be sent to the renter.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Approve Now',
          style: 'default',
          onPress: async () => {
            try {
              setIsUpdatingOrder(true);
              await bookingService.updateBookingStatusByOwner(booking._id, 'approved');
              Alert.alert(
                'Approved Successfully! 🎉',
                `Booking #${booking.bookingCode} is approved. Please prepare the device for handover.`
              );
              await fetchOwnerBookings();
            } catch (err: any) {
              Alert.alert(
                'Error',
                err?.response?.data?.message || 'Unable to approve booking at this time.'
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
      selectedRejectReason === 'Other reason' && customRejectReason.trim()
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
        'Booking Rejected',
        `Booking #${selectedBookingToReject.bookingCode} has been rejected.`
      );
      setRejectModalVisible(false);
      setSelectedBookingToReject(null);
      await fetchOwnerBookings();
    } catch (err: any) {
      Alert.alert(
        'Error',
        err?.response?.data?.message || 'Unable to reject booking at this time.'
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
      'device';
    const renterName = (booking.renterId as any)?.name || 'renter';

    Alert.alert(
      'Device Handover 📱',
      `Confirm handover of "${deviceName}" to ${renterName}?\n\nThe booking will activate and the rental period begins now.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Confirm Handover',
          onPress: async () => {
            try {
              setIsUpdatingOrder(true);
              await bookingService.handoverBooking(booking._id);
              Alert.alert(
                'Handover Successful 🎉',
                `Device handed over. Booking #${booking.bookingCode} is now active.`
              );
              await fetchOwnerBookings();
            } catch (err: any) {
              Alert.alert(
                'Error',
                err?.response?.data?.message || 'Unable to handover booking at this time.'
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
      'device';
    const depositAmount = (booking.depositFee || 0).toLocaleString('en-US');
    const incomeAmount = (booking.rentalFee || 0).toLocaleString('en-US');

    Alert.alert(
      'Receive Device & Complete 💰',
      `Have you inspected "${deviceName}" and confirmed it is returned in good condition?\n\n• Deposit: ${depositAmount} VND will be refunded to renter.\n• Earnings: +${incomeAmount} VND will be credited to your wallet.`,
      [
        { text: 'Recheck', style: 'cancel' },
        {
          text: 'Confirm & Complete',
          onPress: async () => {
            try {
              setIsUpdatingOrder(true);
              await bookingService.completeBooking(booking._id);
              Alert.alert(
                'Rental Completed 🎉',
                `Booking #${booking.bookingCode} is completed. Deposit refunded and earnings credited.`
              );
              await fetchOwnerBookings();
            } catch (err: any) {
              Alert.alert(
                'Error',
                err?.response?.data?.message || 'Unable to complete booking at this time.'
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
        Alert.alert('Already Rated', 'You have already rated the renter for this booking.');
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
              accessibilityLabel="Open owner navigation drawer"
            >
              <Ionicons name="menu-outline" size={24} color={colors.light.textPrimary} />
            </TouchableOpacity>
          ) : onBack ? (
            <TouchableOpacity
              style={styles.headerIconBtn}
              onPress={onBack}
              accessibilityLabel="Back"
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
            <Text style={styles.headerTitle}>Booking Management</Text>
            <Text style={styles.headerSubtitle}>Approve, Handover & Track</Text>
          </View>
        </View>

        <View style={styles.headerRight}>
          {/* Quick QR Scanner CTA */}
          <TouchableOpacity
            style={styles.headerScanBtn}
            onPress={() => setScannerVisible(true)}
            activeOpacity={0.85}
          >
            <Ionicons name="qr-code-outline" size={17} color="#FFFFFF" />
            <Text style={styles.headerScanBtnText}>Scan QR</Text>
          </TouchableOpacity>

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
          <Text style={styles.metricLabel}>Pending</Text>
          <Text style={[styles.metricValue, { color: colors.light.warning }]}>
            {pendingOrders.length}
          </Text>
        </View>
        <View style={styles.metricDivider} />
        <View style={styles.metricItem}>
          <Text style={styles.metricLabel}>Active Rentals</Text>
          <Text style={[styles.metricValue, { color: colors.light.primary }]}>
            {rentingOrders.length}
          </Text>
        </View>
        <View style={styles.metricDivider} />
        <View style={styles.metricItem}>
          <Text style={styles.metricLabel}>Active Revenue</Text>
          <Text style={[styles.metricValue, { color: colors.light.success }]}>
            {totalRentingRevenue > 0
              ? `${(totalRentingRevenue / 1000).toLocaleString('en-US')}k`
              : '0 VND'}
          </Text>
        </View>
      </View>

      {/* ── 3. SEARCH BAR ── */}
      <View style={styles.searchContainer}>
        <Ionicons name="search-outline" size={18} color={colors.light.textSecondary} />
        <TextInput
          style={styles.searchInput}
          placeholder="Search by code, device or renter name..."
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
              Pending
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
              Active & Renting
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
              History
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

      {/* ── 5. ORDER LIST ── */}
      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.light.primary} />
          <Text style={styles.loadingText}>Loading your booking orders...</Text>
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
                  ? 'No pending bookings'
                  : activeTab === 'renting'
                  ? 'No devices currently rented'
                  : 'No order history yet'}
              </Text>

              <Text style={styles.emptySubtitle}>
                {activeTab === 'pending'
                  ? 'All rental requests have been reviewed. When a renter books a device, it will appear here.'
                  : activeTab === 'renting'
                  ? 'Approved bookings waiting for handover or active ongoing rentals will appear here.'
                  : 'Completed, cancelled, or rejected booking records are archived here.'}
              </Text>

              {searchKeyword.length > 0 && (
                <TouchableOpacity
                  style={styles.clearSearchBtn}
                  onPress={() => setSearchKeyword('')}
                >
                  <Text style={styles.clearSearchText}>Clear search filter</Text>
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
                <Ionicons name="close-circle-outline" size={20} color={colors.light.error} />
                <Text style={styles.modalTitle}>Reject Booking Request</Text>
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
                Select a reason for declining booking #{selectedBookingToReject.bookingCode}.
                This reason will be provided to the renter.
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

            {selectedRejectReason === 'Other reason' && (
              <TextInput
                style={styles.customReasonInput}
                placeholder="Enter detailed reason for rejection..."
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
                <Text style={styles.modalCancelText}>Cancel</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.modalConfirmBtn}
                onPress={handleConfirmReject}
                disabled={isUpdatingOrder}
              >
                {isUpdatingOrder ? (
                  <ActivityIndicator size="small" color="#FFFFFF" />
                ) : (
                  <Text style={styles.modalConfirmText}>Confirm Rejection</Text>
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
  headerScanBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.light.primary,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 10,
    gap: 6,
  },
  headerScanBtnText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '700',
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
