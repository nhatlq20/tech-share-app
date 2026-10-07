import React, { useState, useEffect, useCallback } from 'react';
import {
  StyleSheet,
  View,
  Text,
  TouchableOpacity,
  FlatList,
  RefreshControl,
  ActivityIndicator,
  Modal,
  TextInput,
  Alert,
  Platform,
  StatusBar,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../../theme/colors';
import { STRINGS } from '../../constants/strings';
import { BookingItemCard } from '../../components/booking/BookingItemCard';
import { ExtensionModal } from '../../components/booking/ExtensionModal';
import { ReviewModal } from '../../components/booking/ReviewModal';
import { bookingService, Booking } from '../../services/bookingService';

interface MyBookingsScreenProps {
  onNavigateToBookingDetail?: (bookingId: string) => void;
  onNavigateToDeviceDetail?: (deviceId: string) => void;
  onNavigateToBookingCreate?: (deviceId: string) => void;
  onNavigateToHome?: () => void;
}

const TABS = [
  { id: 'all', label: STRINGS.MY_BOOKINGS.TABS.ALL, status: '' },
  { id: 'pending', label: STRINGS.MY_BOOKINGS.TABS.PENDING, status: 'pending' },
  { id: 'approved', label: STRINGS.MY_BOOKINGS.TABS.APPROVED, status: 'approved' },
  { id: 'active', label: STRINGS.MY_BOOKINGS.TABS.ACTIVE, status: 'active' },
  { id: 'completed', label: STRINGS.MY_BOOKINGS.TABS.COMPLETED, status: 'completed' },
  { id: 'cancelled', label: STRINGS.MY_BOOKINGS.TABS.CANCELLED, status: 'cancelled' },
];

const CANCEL_REASONS = STRINGS.MY_BOOKINGS.CANCEL_REASONS;

export function MyBookingsScreen({
  onNavigateToHome,
  onNavigateToBookingDetail,
  onNavigateToDeviceDetail,
  onNavigateToBookingCreate,
}: MyBookingsScreenProps) {
  const insets = useSafeAreaInsets();
  const topInset = Math.max(
    insets.top,
    Platform.OS === 'android' ? StatusBar.currentHeight || 24 : 20
  );
  const [activeTab, setActiveTab] = useState('all');
  const [bookings, setBookings] = useState([] as Booking[]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const [cancelModalVisible, setCancelModalVisible] = useState(false);
  const [selectedBookingToCancel, setSelectedBookingToCancel] = useState(null as Booking | null);
  const [cancelReason, setCancelReason] = useState('');
  const [isSubmittingCancel, setIsSubmittingCancel] = useState(false);

  const [extensionModalVisible, setExtensionModalVisible] = useState(false);
  const [selectedBookingToExtend, setSelectedBookingToExtend] = useState(null as Booking | null);

  const [reviewModalVisible, setReviewModalVisible] = useState(false);
  const [selectedBookingToReview, setSelectedBookingToReview] = useState(null as Booking | null);

  const openExtendModal = (booking: Booking) => {
    setSelectedBookingToExtend(booking);
    setExtensionModalVisible(true);
  };

  const openReviewModal = (booking: Booking) => {
    setSelectedBookingToReview(booking);
    setReviewModalVisible(true);
  };

  const fetchBookings = useCallback(async (tabId: string) => {
    try {
      setLoading(true);
      const tab = TABS.find((t) => t.id === tabId);
      const status = tab?.status || '';
      const data = await bookingService.getMyBookings(status);
      setBookings(data || []);
    } catch (error) {
      console.warn('Lỗi tải danh sách đơn thuê:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      fetchBookings(activeTab);
    }, [activeTab, fetchBookings])
  );

  const onRefresh = async () => {
    setRefreshing(true);
    await fetchBookings(activeTab);
    setRefreshing(false);
  };

  const handlePressBooking = (booking: Booking) => {
    if (onNavigateToBookingDetail) {
      onNavigateToBookingDetail(booking._id);
    } else if (onNavigateToDeviceDetail && booking.deviceId?._id) {
      onNavigateToDeviceDetail(booking.deviceId._id);
    }
  };

  const handleReRent = (booking: Booking) => {
    const deviceId =
      booking.deviceId?._id ||
      (typeof booking.deviceId === 'string' ? booking.deviceId : null);
    if (!deviceId) return;
    if (onNavigateToBookingCreate) {
      onNavigateToBookingCreate(deviceId);
    } else if (onNavigateToDeviceDetail) {
      onNavigateToDeviceDetail(deviceId);
    }
  };

  const openCancelModal = (booking: Booking) => {
    setSelectedBookingToCancel(booking);
    setCancelReason('');
    setCancelModalVisible(true);
  };

  const handleConfirmCancel = async () => {
    if (!selectedBookingToCancel) return;
    if (!cancelReason.trim()) {
      Alert.alert(STRINGS.MY_BOOKINGS.ALERT_CANCEL_SELECT_REASON, STRINGS.MY_BOOKINGS.ALERT_CANCEL_SELECT_REASON);
      return;
    }

    try {
      setIsSubmittingCancel(true);
      await bookingService.cancelBooking(selectedBookingToCancel._id, cancelReason);
      Alert.alert(STRINGS.MY_BOOKINGS.ALERT_CANCEL_SUCCESS, STRINGS.MY_BOOKINGS.ALERT_CANCEL_SUCCESS);
      setCancelModalVisible(false);
      fetchBookings(activeTab);
    } catch (error: any) {
      Alert.alert(STRINGS.COMMON.ERROR, error.response?.data?.message || STRINGS.MY_BOOKINGS.ALERT_CANCEL_ERROR_DEFAULT);
    } finally {
      setIsSubmittingCancel(false);
    }
  };

  const renderEmpty = () => {
    if (loading) return null;
    return (
      <View style={styles.emptyContainer}>
        <View style={styles.iconCircle}>
          <Ionicons name="receipt-outline" size={54} color={colors.light.primary} />
        </View>
        <Text style={styles.title}>{STRINGS.MY_BOOKINGS.EMPTY_TITLE}</Text>
        <Text style={styles.description}>
          {STRINGS.MY_BOOKINGS.EMPTY_DESC}
        </Text>
        {onNavigateToHome && activeTab === 'all' && (
          <TouchableOpacity
            style={styles.actionButton}
            onPress={onNavigateToHome}
            activeOpacity={0.8}
          >
            <Ionicons name="sparkles" size={18} color={colors.light.white} />
            <Text style={styles.actionButtonText}>{STRINGS.MY_BOOKINGS.EXPLORE_DEVICES}</Text>
          </TouchableOpacity>
        )}
      </View>
    );
  };

  return (
    <View style={styles.container}>
      {/* HEADER */}
      <View style={[styles.header, { paddingTop: topInset + 8 }]}>
        <View style={styles.headerTitleRow}>
          <Ionicons name="receipt" size={24} color={colors.light.primary} />
          <Text style={styles.headerTitle}>{STRINGS.MY_BOOKINGS.TITLE}</Text>
        </View>
      </View>

      {/* TABS */}
      <View style={styles.tabsContainer}>
        <FlatList
          data={TABS}
          horizontal
          showsHorizontalScrollIndicator={false}
          keyExtractor={(item: any) => item.id}
          contentContainerStyle={styles.tabsContent}
          renderItem={({ item }: { item: any }) => {
            const isActive = activeTab === item.id;
            return (
              <TouchableOpacity
                style={[styles.tabButton, isActive && styles.tabButtonActive]}
                onPress={() => setActiveTab(item.id)}
              >
                <Text style={[styles.tabText, isActive && styles.tabTextActive]}>
                  {item.label}
                </Text>
              </TouchableOpacity>
            );
          }}
        />
      </View>

      {/* CONTENT */}
      {loading && !refreshing ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.light.primary} />
        </View>
      ) : (
        <FlatList
          data={bookings}
          keyExtractor={(item: Booking) => item._id}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
          renderItem={({ item }: { item: Booking }) => (
            <BookingItemCard 
              booking={item} 
              onPress={() => handlePressBooking(item)}
              onCancel={() => openCancelModal(item)}
              onExtend={() => openExtendModal(item)}
              onReview={() => openReviewModal(item)}
              onReRent={() => handleReRent(item)}
            />
          )}
          ListEmptyComponent={renderEmpty}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              colors={[colors.light.primary]}
              tintColor={colors.light.primary}
            />
          }
        />
      )}

      {/* EXTENSION MODAL */}
      <ExtensionModal
        visible={extensionModalVisible}
        booking={selectedBookingToExtend}
        onClose={() => setExtensionModalVisible(false)}
        onSuccess={() => fetchBookings(activeTab)}
      />

      {/* REVIEW MODAL */}
      <ReviewModal
        visible={reviewModalVisible}
        booking={selectedBookingToReview}
        onClose={() => setReviewModalVisible(false)}
        onSuccess={() => fetchBookings(activeTab)}
      />

      {/* CANCEL MODAL */}
      <Modal
        visible={cancelModalVisible}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setCancelModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>{STRINGS.BOOKING_DETAIL.CANCEL_BOOKING}</Text>
            <Text style={styles.modalDesc}>
              {STRINGS.MY_BOOKINGS.CANCEL_MODAL_DESC(selectedBookingToCancel?.bookingCode || '')}
            </Text>

            <View style={styles.reasonsContainer}>
              {CANCEL_REASONS.map((reason, index) => (
                <TouchableOpacity
                  key={index}
                  style={[
                    styles.reasonChip,
                    cancelReason === reason && styles.reasonChipActive
                  ]}
                  onPress={() => setCancelReason(reason)}
                >
                  <Text
                    style={[
                      styles.reasonChipText,
                      cancelReason === reason && styles.reasonChipTextActive
                    ]}
                  >
                    {reason}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            <TextInput
              style={styles.reasonInput}
              placeholder={STRINGS.MY_BOOKINGS.REASON_PLACEHOLDER}
              placeholderTextColor={colors.light.textMuted}
              value={cancelReason}
              onChangeText={setCancelReason}
              multiline
            />

            <View style={styles.modalActions}>
              <TouchableOpacity
                style={styles.modalBtnCancel}
                onPress={() => setCancelModalVisible(false)}
                disabled={isSubmittingCancel}
              >
                <Text style={styles.modalBtnCancelText}>{STRINGS.HANDOVER_QR.CLOSE}</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalBtnConfirm, isSubmittingCancel && { opacity: 0.7 }]}
                onPress={handleConfirmCancel}
                disabled={isSubmittingCancel}
              >
                {isSubmittingCancel ? (
                  <ActivityIndicator size="small" color={colors.light.white} />
                ) : (
                  <Text style={styles.modalBtnConfirmText}>{STRINGS.BOOKING_DETAIL.CONFIRM_CANCEL_ACTION}</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.light.background,
  },
  header: {
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 12,
    backgroundColor: colors.light.surface,
  },
  headerTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  headerTitle: {
    fontSize: 22,
    fontWeight: '800',
    color: colors.light.textPrimary,
  },
  tabsContainer: {
    backgroundColor: colors.light.surface,
    borderBottomWidth: 1,
    borderBottomColor: colors.light.border,
  },
  tabsContent: {
    paddingHorizontal: 12,
    paddingBottom: 12,
  },
  tabButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: colors.light.background,
    marginRight: 8,
  },
  tabButtonActive: {
    backgroundColor: colors.light.primary,
  },
  tabText: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.light.textSecondary,
  },
  tabTextActive: {
    color: colors.light.white,
  },
  listContent: {
    padding: 16,
    flexGrow: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 32,
    gap: 12,
    marginTop: 60,
  },
  iconCircle: {
    width: 96,
    height: 96,
    borderRadius: 48,
    backgroundColor: colors.light.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  title: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.light.textPrimary,
  },
  description: {
    fontSize: 13,
    color: colors.light.textSecondary,
    textAlign: 'center',
    lineHeight: 20,
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: colors.light.primary,
    paddingHorizontal: 20,
    paddingVertical: 11,
    borderRadius: 12,
    marginTop: 12,
  },
  actionButtonText: {
    color: colors.light.white,
    fontSize: 14,
    fontWeight: '700',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    padding: 16,
  },
  modalContent: {
    backgroundColor: colors.light.surface,
    borderRadius: 12,
    padding: 20,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.light.textPrimary,
    marginBottom: 8,
  },
  modalDesc: {
    fontSize: 14,
    color: colors.light.textSecondary,
    marginBottom: 16,
  },
  reasonsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 16,
  },
  reasonChip: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.light.border,
  },
  reasonChipActive: {
    backgroundColor: colors.light.primaryLight,
    borderColor: colors.light.primary,
  },
  reasonChipText: {
    fontSize: 13,
    color: colors.light.textSecondary,
  },
  reasonChipTextActive: {
    color: colors.light.primaryDark,
    fontWeight: '600',
  },
  reasonInput: {
    borderWidth: 1,
    borderColor: colors.light.border,
    borderRadius: 8,
    padding: 12,
    minHeight: 80,
    textAlignVertical: 'top',
    marginBottom: 20,
  },
  modalActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 12,
  },
  modalBtnCancel: {
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
  modalBtnCancelText: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.light.textSecondary,
  },
  modalBtnConfirm: {
    backgroundColor: colors.light.error,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 8,
    minWidth: 100,
    alignItems: 'center',
  },
  modalBtnConfirmText: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.light.white,
  },
});
