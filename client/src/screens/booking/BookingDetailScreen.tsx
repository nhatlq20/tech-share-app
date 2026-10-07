import React, { useState, useEffect, useCallback } from 'react';
import {
  StyleSheet,
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  Image,
  ActivityIndicator,
  Alert,
  Linking,
  Platform,
  RefreshControl,
  Modal,
  Pressable,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../../theme/colors';
import { STRINGS } from '../../constants/strings';
import { bookingService, Booking } from '../../services/bookingService';
import { RentalCountdownTimer } from '../../components/booking/RentalCountdownTimer';
import { ExtensionModal } from '../../components/booking/ExtensionModal';
import { ReviewModal } from '../../components/booking/ReviewModal';
import { HandoverQrModal } from '../../components/booking/HandoverQrModal';
import { HandoverCameraModal } from '../../components/booking/HandoverCameraModal';

interface BookingDetailScreenProps {
  bookingId: string;
  onBack: () => void;
  onNavigateToDeviceDetail?: (deviceId: string) => void;
  onNavigateToBookingCreate?: (deviceId: string) => void;
}

const STATUS_CONFIG: Record<string, { label: string; color: string; icon: string }> = {
  pending: { label: STRINGS.BOOKING_DETAIL.STATUS.pending, color: colors.light.warning, icon: 'time-outline' },
  approved: { label: STRINGS.BOOKING_DETAIL.STATUS.approved, color: colors.light.primary, icon: 'checkmark-circle-outline' },
  active: { label: STRINGS.BOOKING_DETAIL.STATUS.active, color: colors.light.primary, icon: 'play-circle-outline' },
  completed: { label: STRINGS.BOOKING_DETAIL.STATUS.completed, color: colors.light.success, icon: 'checkmark-done-circle-outline' },
  cancelled: { label: STRINGS.BOOKING_DETAIL.STATUS.cancelled, color: colors.light.error, icon: 'close-circle-outline' },
  rejected: { label: STRINGS.BOOKING_DETAIL.STATUS.rejected, color: colors.light.error, icon: 'close-circle-outline' },
};

const PAYMENT_STATUS_CONFIG: Record<string, { label: string; color: string }> = {
  unpaid: { label: STRINGS.BOOKING_DETAIL.PAYMENT_STATUS_LABELS.unpaid, color: colors.light.warning },
  deposit_held: { label: STRINGS.BOOKING_DETAIL.PAYMENT_STATUS_LABELS.deposit_held, color: colors.light.primary },
  paid: { label: STRINGS.BOOKING_DETAIL.PAYMENT_STATUS_LABELS.paid, color: colors.light.success },
  refunded: { label: STRINGS.BOOKING_DETAIL.PAYMENT_STATUS_LABELS.refunded, color: colors.light.textSecondary },
  disputed: { label: STRINGS.BOOKING_DETAIL.PAYMENT_STATUS_LABELS.disputed, color: colors.light.error },
};

export function BookingDetailScreen({
  bookingId,
  onBack,
  onNavigateToDeviceDetail,
  onNavigateToBookingCreate,
}: BookingDetailScreenProps) {
  const [booking, setBooking] = useState(null as Booking | null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const [extensionModalVisible, setExtensionModalVisible] = useState(false);
  const [reviewModalVisible, setReviewModalVisible] = useState(false);
  const [qrModalVisible, setQrModalVisible] = useState(false);
  const [handoverCameraModalVisible, setHandoverCameraModalVisible] = useState(false);
  const [previewImage, setPreviewImage] = useState(null as string | null);
  const [isCancelling, setIsCancelling] = useState(false);

  const fetchDetail = useCallback(async () => {
    try {
      const data = await bookingService.getBookingById(bookingId);
      setBooking(data);
    } catch (error: any) {
      console.error('Failed to load booking details:', error);
      Alert.alert(STRINGS.BOOKING_DETAIL.ALERT_ERROR_TITLE, STRINGS.BOOKING_DETAIL.LOAD_ERROR_MSG);
    } finally {
      setLoading(false);
    }
  }, [bookingId]);

  useEffect(() => {
    fetchDetail();
  }, [fetchDetail]);

  const onRefresh = async () => {
    setRefreshing(true);
    await fetchDetail();
    setRefreshing(false);
  };

  const handleCallOwner = (phone?: string) => {
    if (!phone) {
      Alert.alert(STRINGS.BOOKING_DETAIL.ALERT_NOTICE_TITLE, STRINGS.BOOKING_DETAIL.OWNER_PHONE_NA);
      return;
    }
    Linking.openURL(`tel:${phone}`);
  };

  const handleEmailOwner = (email?: string) => {
    if (!email) {
      Alert.alert(STRINGS.BOOKING_DETAIL.ALERT_NOTICE_TITLE, STRINGS.BOOKING_DETAIL.OWNER_EMAIL_NA);
      return;
    }
    Linking.openURL(`mailto:${email}`);
  };

  const handleCancelBooking = () => {
    if (!booking) return;

    Alert.alert(
      STRINGS.BOOKING_DETAIL.CONFIRM_CANCEL_TITLE,
      STRINGS.BOOKING_DETAIL.CONFIRM_CANCEL_MSG(booking.bookingCode),
      [
        { text: STRINGS.BOOKING_DETAIL.KEEP_BOOKING, style: 'cancel' },
        {
          text: STRINGS.BOOKING_DETAIL.CONFIRM_CANCEL_ACTION,
          style: 'destructive',
          onPress: async () => {
            try {
              setIsCancelling(true);
              await bookingService.cancelBooking(booking._id, STRINGS.BOOKING_DETAIL.CANCEL_REASON_DEFAULT);
              Alert.alert(STRINGS.BOOKING_DETAIL.ALERT_SUCCESS_TITLE, STRINGS.BOOKING_DETAIL.CANCEL_SUCCESS);
              fetchDetail();
            } catch (err: any) {
              Alert.alert(
                STRINGS.BOOKING_DETAIL.ALERT_ERROR_TITLE,
                err.response?.data?.message || STRINGS.BOOKING_DETAIL.CANCEL_ERROR
              );
            } finally {
              setIsCancelling(false);
            }
          },
        },
      ]
    );
  };

  const handleReRent = () => {
    if (!booking) return;
    const deviceId = booking.deviceId?._id || (typeof booking.deviceId === 'string' ? booking.deviceId : null);
    if (!deviceId) return;
    if (onNavigateToBookingCreate) {
      onNavigateToBookingCreate(deviceId);
    } else if (onNavigateToDeviceDetail) {
      onNavigateToDeviceDetail(deviceId);
    }
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={colors.light.primary} />
        <Text style={styles.loadingText}>{STRINGS.BOOKING_DETAIL.LOADING}</Text>
      </View>
    );
  }

  if (!booking) {
    return (
      <View style={styles.errorContainer}>
        <Ionicons name="alert-circle-outline" size={54} color={colors.light.error} />
        <Text style={styles.errorText}>{STRINGS.BOOKING_DETAIL.NOT_FOUND}</Text>
        <TouchableOpacity style={styles.backButton} onPress={onBack}>
          <Text style={styles.backButtonText}>{STRINGS.BOOKING_DETAIL.GO_BACK}</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const device = booking.deviceId || {};
  const owner = booking.ownerId || {};
  const statusConfig = STATUS_CONFIG[booking.status as keyof typeof STATUS_CONFIG] || STATUS_CONFIG.pending;
  const paymentConfig = PAYMENT_STATUS_CONFIG[booking.paymentStatus] || PAYMENT_STATUS_CONFIG.unpaid;

  const startDateFormatted = new Date(booking.startDate).toLocaleString('en-US', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });

  const endDateFormatted = new Date(booking.endDate).toLocaleString('en-US', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });

  const isActive = booking.status === 'active';
  const isPendingExtension = booking.extensionRequest?.status === 'pending';
  const isApprovedExtension = booking.extensionRequest?.status === 'approved';

  return (
    <View style={styles.container}>
      {/* ── TOP HEADER ── */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.headerBackBtn} onPress={onBack}>
          <Ionicons name="arrow-back" size={24} color={colors.light.textPrimary} />
        </TouchableOpacity>
        <View style={styles.headerTitleBox}>
          <Text style={styles.headerTitle}>{STRINGS.BOOKING_DETAIL.TITLE}</Text>
          <Text style={styles.headerSubtitle}>#{booking.bookingCode}</Text>
        </View>
        <View style={[styles.statusBadge, { backgroundColor: statusConfig.color + '20' }]}>
          <Ionicons name={statusConfig.icon as any} size={14} color={statusConfig.color} />
          <Text style={[styles.statusText, { color: statusConfig.color }]}>{statusConfig.label}</Text>
        </View>
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            colors={[colors.light.primary]}
          />
        }
      >
        {/* ── 1. THÔNG TIN THIẾT BỊ (MÁY) ── */}
        <View style={styles.card}>
          <View style={styles.cardHeaderRow}>
            <Ionicons name="camera-outline" size={18} color={colors.light.primary} />
            <Text style={styles.cardTitle}>{STRINGS.BOOKING_DETAIL.DEVICE_INFO}</Text>
          </View>

          <View style={styles.deviceRow}>
            <Image
              source={{ uri: device.images?.[0] || 'https://via.placeholder.com/150' }}
              style={styles.deviceImage}
            />
            <View style={styles.deviceInfo}>
              <Text style={styles.deviceName} numberOfLines={2}>
                {device.name || STRINGS.BOOKING_DETAIL.DEFAULT_DEVICE_NAME}
              </Text>
              <Text style={styles.deviceSub}>
                {device.brand ? `${device.brand} • ` : ''}
                {device.category || STRINGS.BOOKING_DETAIL.DEFAULT_CATEGORY}
              </Text>
              <Text style={styles.devicePrice}>
                {(device.pricePerDay || booking.pricePerDayAtBooking || 0).toLocaleString('en-US')}{' '}
                {STRINGS.BOOKING_DETAIL.VND_PER_DAY}
              </Text>
            </View>
          </View>

          {onNavigateToDeviceDetail && device._id && (
            <TouchableOpacity
              style={styles.viewDeviceBtn}
              onPress={() => onNavigateToDeviceDetail(device._id)}
            >
              <Text style={styles.viewDeviceBtnText}>{STRINGS.BOOKING_DETAIL.VIEW_DEVICE_DETAILS}</Text>
              <Ionicons name="chevron-forward" size={16} color={colors.light.primary} />
            </TouchableOpacity>
          )}
        </View>

        {/* ── 2. THỜI GIAN THUÊ & ĐỒNG HỒ ĐẾM NGƯỢC ── */}
        <View style={styles.card}>
          <View style={styles.cardHeaderRow}>
            <Ionicons name="time-outline" size={18} color={colors.light.primary} />
            <Text style={styles.cardTitle}>
              {STRINGS.BOOKING_DETAIL.RENTAL_PERIOD} ({booking.totalDays}{' '}
              {STRINGS.BOOKING_DETAIL.DAY_UNIT(booking.totalDays)})
            </Text>
          </View>

          <View style={styles.dateBlock}>
            <View style={styles.dateCol}>
              <Text style={styles.dateColLabel}>{STRINGS.BOOKING_DETAIL.PICKUP}</Text>
              <Text style={styles.dateColValue}>{startDateFormatted}</Text>
            </View>
            <Ionicons name="arrow-forward" size={18} color={colors.light.textSecondary} />
            <View style={styles.dateCol}>
              <Text style={styles.dateColLabel}>{STRINGS.BOOKING_DETAIL.RETURN}</Text>
              <Text style={styles.dateColValue}>{endDateFormatted}</Text>
            </View>
          </View>

          {/* Countdown timer for active rental */}
          {isActive && (
            <View style={styles.timerSection}>
              <RentalCountdownTimer endDate={booking.endDate} />
            </View>
          )}

          {/* Extension requests info */}
          {isPendingExtension && (
            <View style={styles.extensionInfoPending}>
              <Ionicons name="hourglass" size={16} color={colors.light.warning} />
              <View style={{ flex: 1 }}>
                <Text style={styles.extensionTitlePending}>{STRINGS.BOOKING_DETAIL.EXTENSION_PENDING_TITLE}</Text>
                <Text style={styles.extensionDescPending}>
                  {STRINGS.BOOKING_DETAIL.EXTENSION_PENDING_DESC(
                    booking.extensionRequest?.requestedDays || 0,
                    booking.extensionRequest?.additionalFee || 0,
                    new Date(booking.extensionRequest?.requestedEndDate || '').toLocaleDateString('en-US')
                  )}
                </Text>
              </View>
            </View>
          )}

          {isApprovedExtension && (
            <View style={styles.extensionInfoApproved}>
              <Ionicons name="checkmark-circle" size={16} color={colors.light.success} />
              <Text style={styles.extensionTitleApproved}>
                {STRINGS.BOOKING_DETAIL.EXTENSION_APPROVED_TITLE(booking.extensionRequest?.requestedDays || 0)}
              </Text>
            </View>
          )}
        </View>

        {/* ── 3. THÔNG TIN CHỦ MÁY (CHO THUÊ) ── */}
        <View style={styles.card}>
          <View style={styles.cardHeaderRow}>
            <Ionicons name="person-outline" size={18} color={colors.light.primary} />
            <Text style={styles.cardTitle}>{STRINGS.BOOKING_DETAIL.DEVICE_OWNER}</Text>
          </View>

          <View style={styles.ownerRow}>
            <Image
              source={{ uri: owner.avatar || 'https://via.placeholder.com/100' }}
              style={styles.ownerAvatar}
            />
            <View style={styles.ownerInfo}>
              <Text style={styles.ownerName}>{owner.name || STRINGS.BOOKING_DETAIL.DEFAULT_OWNER_NAME}</Text>
              <View style={styles.ownerRatingRow}>
                <Ionicons name="star" size={14} color={colors.light.ratingStar} />
                <Text style={styles.ownerRatingText}>
                  {owner.rating ? Number(owner.rating).toFixed(1) : '5.0'}{' '}
                  {STRINGS.BOOKING_DETAIL.REVIEWS_SUFFIX(owner.totalReviews || 0)}
                </Text>
              </View>
              {owner.phone ? (
                <Text style={styles.ownerContactText}>
                  {STRINGS.BOOKING_DETAIL.PHONE_PREFIX}
                  {owner.phone}
                </Text>
              ) : null}
            </View>
          </View>

          <View style={styles.ownerActionRow}>
            <TouchableOpacity
              style={styles.ownerActionBtn}
              onPress={() => handleCallOwner(owner.phone)}
            >
              <Ionicons name="call-outline" size={16} color={colors.light.primary} />
              <Text style={styles.ownerActionBtnText}>{STRINGS.BOOKING_DETAIL.CALL}</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.ownerActionBtn, styles.ownerActionBtnEmail]}
              onPress={() => handleEmailOwner(owner.email)}
            >
              <Ionicons name="mail-outline" size={16} color={colors.light.primary} />
              <Text style={[styles.ownerActionBtnText, { color: colors.light.primary }]}>
                {STRINGS.BOOKING_DETAIL.EMAIL}
              </Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* ── 4. BẢNG CHI PHÍ & THANH TOÁN (SỐ TIỀN) ── */}
        <View style={styles.card}>
          <View style={styles.cardHeaderRow}>
            <Ionicons name="receipt-outline" size={18} color={colors.light.primary} />
            <Text style={styles.cardTitle}>{STRINGS.BOOKING_DETAIL.PAYMENT_DETAILS}</Text>
          </View>

          <View style={styles.feeRow}>
            <Text style={styles.feeLabel}>
              {STRINGS.BOOKING_DETAIL.RENTAL_FEE} ({booking.totalDays}{' '}
              {STRINGS.BOOKING_DETAIL.DAY_UNIT(booking.totalDays)} ×{' '}
              {(booking.pricePerDayAtBooking || device.pricePerDay || 0).toLocaleString('en-US')} VND):
            </Text>
            <Text style={styles.feeValue}>
              {(booking.rentalFee || 0).toLocaleString('en-US')} VND
            </Text>
          </View>

          {booking.depositFee ? (
            <View style={styles.feeRow}>
              <Text style={styles.feeLabel}>{STRINGS.BOOKING_DETAIL.SECURITY_DEPOSIT}</Text>
              <Text style={styles.feeValue}>
                {booking.depositFee.toLocaleString('en-US')} VND
              </Text>
            </View>
          ) : null}

          {booking.voucherDiscount ? (
            <View style={styles.feeRow}>
              <Text style={[styles.feeLabel, { color: colors.light.success }]}>
                {STRINGS.BOOKING_DETAIL.DISCOUNT_VOUCHER} ({booking.voucherCode || 'Promo'}):
              </Text>
              <Text style={[styles.feeValue, { color: colors.light.success }]}>
                -{booking.voucherDiscount.toLocaleString('en-US')} VND
              </Text>
            </View>
          ) : null}

          <View style={styles.divider} />

          <View style={styles.feeTotalRow}>
            <Text style={styles.feeTotalLabel}>{STRINGS.BOOKING_DETAIL.TOTAL_AMOUNT}</Text>
            <Text style={styles.feeTotalValue}>
              {(booking.totalAmount || 0).toLocaleString('en-US')} VND
            </Text>
          </View>

          <View style={styles.paymentStatusBadge}>
            <Text style={styles.paymentStatusTitle}>{STRINGS.BOOKING_DETAIL.PAYMENT_STATUS}</Text>
            <Text style={[styles.paymentStatusValue, { color: paymentConfig.color }]}>
              {paymentConfig.label}
            </Text>
          </View>
        </View>

        {/* ── 5. PHƯƠNG THỨC GIAO NHẬN ── */}
        <View style={styles.card}>
          <View style={styles.cardHeaderRow}>
            <Ionicons name="location-outline" size={18} color={colors.light.primary} />
            <Text style={styles.cardTitle}>{STRINGS.BOOKING_DETAIL.HANDOVER_METHOD}</Text>
          </View>

          <View style={styles.deliveryRow}>
            <Ionicons
              name={booking.deliveryMethod === 'delivery' ? 'bicycle' : 'storefront-outline'}
              size={20}
              color={colors.light.primary}
            />
            <Text style={styles.deliveryMethodText}>
              {booking.deliveryMethod === 'delivery'
                ? STRINGS.BOOKING_DETAIL.DOORSTEP_DELIVERY
                : STRINGS.BOOKING_DETAIL.SELF_PICKUP}
            </Text>
          </View>

          <Text style={styles.deliveryAddressText}>
            {STRINGS.BOOKING_DETAIL.ADDRESS_PREFIX}
            {booking.deliveryAddress || device.addressText || STRINGS.BOOKING_DETAIL.CONTACT_OWNER}
          </Text>
        </View>

        {/* ── 6. BIÊN BẢN BÀN GIAO & ẢNH NHẬN MÁY (beforeRental) ── */}
        {(booking.status === 'approved' ||
          booking.status === 'active' ||
          booking.status === 'completed') && (
          <View style={styles.card}>
            <View style={styles.cardHeaderRow}>
              <View style={styles.cardHeaderLeft}>
                <Ionicons name="shield-checkmark" size={18} color={colors.light.success} />
                <Text style={styles.cardTitle}>{STRINGS.BOOKING_DETAIL.HANDOVER_RECORD}</Text>
              </View>
              {booking.handoverPhotos?.beforeRental && booking.handoverPhotos.beforeRental.length > 0 ? (
                <View style={styles.photoCountBadge}>
                  <Text style={styles.photoCountBadgeText}>
                    {STRINGS.BOOKING_DETAIL.PHOTOS_COUNT(booking.handoverPhotos.beforeRental.length)}
                  </Text>
                </View>
              ) : null}
            </View>

            {/* Nếu đã có ảnh nhận máy */}
            {booking.handoverPhotos?.beforeRental && booking.handoverPhotos.beforeRental.length > 0 ? (
              <View style={styles.handoverPhotosWrap}>
                <Text style={styles.handoverPhotosDesc}>
                  {STRINGS.BOOKING_DETAIL.PHOTOS_DESC}
                </Text>

                <View style={styles.photoGrid}>
                  {booking.handoverPhotos.beforeRental.map((url: string, idx: number) => (
                    <TouchableOpacity
                      key={idx}
                      style={styles.photoThumbItem}
                      onPress={() => setPreviewImage(url)}
                      activeOpacity={0.85}
                    >
                      <Image source={{ uri: url }} style={styles.photoThumbImage} />
                      <View style={styles.photoThumbTag}>
                        <Text style={styles.photoThumbTagText}>
                          {STRINGS.BOOKING_DETAIL.ANGLE_PREFIX}{idx + 1}
                        </Text>
                      </View>
                    </TouchableOpacity>
                  ))}
                </View>

                {booking.conditionNotes?.before ? (
                  <View style={styles.conditionNoteBox}>
                    <Text style={styles.conditionNoteTitle}>{STRINGS.BOOKING_DETAIL.CONDITION_NOTES}</Text>
                    <Text style={styles.conditionNoteContent}>
                      {booking.conditionNotes.before}
                    </Text>
                  </View>
                ) : null}

                {(booking.status === 'approved' || booking.status === 'active') && (
                  <TouchableOpacity
                    style={styles.retakeBtn}
                    onPress={() => setHandoverCameraModalVisible(true)}
                    activeOpacity={0.8}
                  >
                    <Ionicons name="camera-outline" size={16} color={colors.light.primary} />
                    <Text style={styles.retakeBtnText}>{STRINGS.BOOKING_DETAIL.UPDATE_RETAKE_PHOTOS}</Text>
                  </TouchableOpacity>
                )}
              </View>
            ) : (
              <View style={styles.emptyHandoverBox}>
                <View style={styles.emptyHandoverIcon}>
                  <Ionicons name="camera-outline" size={28} color={colors.light.textSecondary} />
                </View>
                <Text style={styles.emptyHandoverTitle}>{STRINGS.BOOKING_DETAIL.NO_PHOTOS_TITLE}</Text>
                <Text style={styles.emptyHandoverDesc}>
                  {STRINGS.BOOKING_DETAIL.NO_PHOTOS_DESC}
                </Text>
                <TouchableOpacity
                  style={styles.takePhotosCta}
                  onPress={() => setHandoverCameraModalVisible(true)}
                  activeOpacity={0.85}
                >
                  <Ionicons name="camera" size={18} color={colors.light.white} />
                  <Text style={styles.takePhotosCtaText}>{STRINGS.BOOKING_DETAIL.TAKE_PHOTOS_CTA}</Text>
                </TouchableOpacity>
              </View>
            )}

            {/* Nút mở nhanh mã QR bàn giao trong Card */}
            {(booking.status === 'approved' || booking.status === 'active') && (
              <TouchableOpacity
                style={styles.openQrCta}
                onPress={() => setQrModalVisible(true)}
                activeOpacity={0.85}
              >
                <Ionicons name="qr-code-outline" size={18} color={colors.light.primary} />
                <Text style={styles.openQrCtaText}>{STRINGS.BOOKING_DETAIL.SHOW_QR_CTA}</Text>
                <Ionicons name="chevron-forward" size={16} color={colors.light.primary} />
              </TouchableOpacity>
            )}
          </View>
        )}
      </ScrollView>

      {/* ── BOTTOM ACTION BAR ── */}
      <View style={styles.bottomBar}>
        {booking.status === 'pending' && (
          <TouchableOpacity
            style={[styles.cancelBtn, isCancelling && { opacity: 0.6 }]}
            onPress={handleCancelBooking}
            disabled={isCancelling}
          >
            {isCancelling ? (
              <ActivityIndicator size="small" color={colors.light.error} />
            ) : (
              <>
                <Ionicons name="close-circle-outline" size={18} color={colors.light.error} />
                <Text style={styles.cancelBtnText}>{STRINGS.BOOKING_DETAIL.CANCEL_BOOKING}</Text>
              </>
            )}
          </TouchableOpacity>
        )}

        {booking.status === 'approved' && (
          <View style={styles.approvedActionRow}>
            <TouchableOpacity
              style={styles.qrPrimaryBtn}
              onPress={() => setQrModalVisible(true)}
              activeOpacity={0.85}
            >
              <Ionicons name="qr-code" size={18} color={colors.light.white} />
              <Text style={styles.qrPrimaryBtnText}>{STRINGS.BOOKING_DETAIL.HANDOVER_QR_BTN}</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.cameraSecondaryBtn}
              onPress={() => setHandoverCameraModalVisible(true)}
              activeOpacity={0.85}
            >
              <Ionicons name="camera" size={18} color={colors.light.primary} />
              <Text style={styles.cameraSecondaryBtnText}>{STRINGS.BOOKING_DETAIL.TAKE_PHOTOS_BTN}</Text>
            </TouchableOpacity>
          </View>
        )}

        {isActive && (
          <TouchableOpacity
            style={[styles.actionPrimaryBtn, isPendingExtension && { backgroundColor: colors.light.surface }]}
            onPress={() => setExtensionModalVisible(true)}
            disabled={isPendingExtension}
          >
            <Ionicons
              name="calendar-outline"
              size={18}
              color={isPendingExtension ? colors.light.textSecondary : colors.light.white}
            />
            <Text
              style={[
                styles.actionPrimaryBtnText,
                isPendingExtension && { color: colors.light.textSecondary },
              ]}
            >
              {isPendingExtension ? STRINGS.BOOKING_DETAIL.EXTENSION_PENDING : STRINGS.BOOKING_DETAIL.EXTEND_RENTAL}
            </Text>
          </TouchableOpacity>
        )}

        {booking.status === 'completed' && (
          booking.isReviewed ? (
            <TouchableOpacity style={styles.reRentBtn} onPress={handleReRent}>
              <Ionicons name="repeat" size={18} color={colors.light.white} />
              <Text style={styles.reRentBtnText}>{STRINGS.BOOKING_DETAIL.RENT_AGAIN}</Text>
            </TouchableOpacity>
          ) : (
            <TouchableOpacity
              style={styles.reviewActionBtn}
              onPress={() => setReviewModalVisible(true)}
            >
              <Ionicons name="star" size={18} color={colors.light.white} />
              <Text style={styles.reviewActionBtnText}>{STRINGS.BOOKING_DETAIL.REVIEW_QUALITY_BTN}</Text>
            </TouchableOpacity>
          )
        )}
      </View>

      {/* MODALS */}
      <ExtensionModal
        visible={extensionModalVisible}
        booking={booking}
        onClose={() => setExtensionModalVisible(false)}
        onSuccess={fetchDetail}
      />

      <ReviewModal
        visible={reviewModalVisible}
        booking={booking}
        onClose={() => setReviewModalVisible(false)}
        onSuccess={fetchDetail}
      />

      <HandoverQrModal
        visible={qrModalVisible}
        booking={booking}
        onClose={() => setQrModalVisible(false)}
      />

      <HandoverCameraModal
        visible={handoverCameraModalVisible}
        booking={booking}
        onClose={() => setHandoverCameraModalVisible(false)}
        onSuccess={fetchDetail}
      />

      {/* FULL IMAGE PREVIEW MODAL */}
      <Modal
        visible={Boolean(previewImage)}
        transparent
        animationType="fade"
        onRequestClose={() => setPreviewImage(null)}
      >
        <Pressable style={styles.previewBackdrop} onPress={() => setPreviewImage(null)}>
          <View style={styles.previewContainer}>
            <TouchableOpacity style={styles.previewCloseBtn} onPress={() => setPreviewImage(null)}>
              <Ionicons name="close" size={24} color={colors.light.white} />
            </TouchableOpacity>
            {previewImage && (
              <Image source={{ uri: previewImage }} style={styles.fullPreviewImage} resizeMode="contain" />
            )}
          </View>
        </Pressable>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.light.background,
  },
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
    backgroundColor: colors.light.surface,
  },
  loadingText: {
    fontSize: 14,
    color: colors.light.textSecondary,
  },
  errorContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
    gap: 12,
  },
  errorText: {
    fontSize: 15,
    color: colors.light.textSecondary,
    textAlign: 'center',
  },
  backButton: {
    backgroundColor: colors.light.primary,
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 8,
    marginTop: 8,
  },
  backButtonText: {
    color: colors.light.white,
    fontWeight: '700',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.light.surface,
    paddingHorizontal: 16,
    paddingTop: Platform.OS === 'ios' ? 44 : 14,
    paddingBottom: 14,
    borderBottomWidth: 1,
    borderBottomColor: colors.light.border,
    gap: 12,
  },
  headerBackBtn: {
    padding: 4,
  },
  headerTitleBox: {
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
    marginTop: 1,
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 12,
  },
  statusText: {
    fontSize: 12,
    fontWeight: '700',
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 40,
    gap: 14,
  },
  card: {
    backgroundColor: colors.light.surface,
    borderRadius: 14,
    padding: 16,
    borderWidth: 1,
    borderColor: colors.light.border,
    shadowColor: colors.light.shadow,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 4,
    elevation: 2,
  },
  cardHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: colors.light.border,
    paddingBottom: 8,
  },
  cardTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.light.textPrimary,
  },
  deviceRow: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 8,
  },
  deviceImage: {
    width: 74,
    height: 74,
    borderRadius: 10,
    backgroundColor: colors.light.borderSubtle,
  },
  deviceInfo: {
    flex: 1,
    justifyContent: 'center',
  },
  deviceName: {
    fontSize: 15,
    fontWeight: '700',
    color: colors.light.textPrimary,
    marginBottom: 4,
  },
  deviceSub: {
    fontSize: 12,
    color: colors.light.textSecondary,
    marginBottom: 4,
  },
  devicePrice: {
    fontSize: 14,
    fontWeight: '800',
    color: colors.light.primary,
  },
  viewDeviceBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: 10,
    marginTop: 6,
    borderTopWidth: 1,
    borderTopColor: colors.light.border,
  },
  viewDeviceBtnText: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.light.primary,
  },
  dateBlock: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: colors.light.surface,
    padding: 12,
    borderRadius: 10,
  },
  dateCol: {
    flex: 1,
  },
  dateColLabel: {
    fontSize: 10,
    fontWeight: '700',
    color: colors.light.textSecondary,
    marginBottom: 4,
  },
  dateColValue: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.light.textPrimary,
  },
  timerSection: {
    marginTop: 10,
  },
  extensionInfoPending: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
    backgroundColor: colors.light.warningLight,
    padding: 10,
    borderRadius: 8,
    marginTop: 10,
  },
  extensionTitlePending: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.light.warning,
  },
  extensionDescPending: {
    fontSize: 12,
    color: colors.light.warning,
    marginTop: 2,
    lineHeight: 16,
  },
  extensionInfoApproved: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: colors.light.successLight,
    padding: 8,
    borderRadius: 8,
    marginTop: 10,
  },
  extensionTitleApproved: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.light.success,
  },
  ownerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 12,
  },
  ownerAvatar: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: colors.light.borderSubtle,
  },
  ownerInfo: {
    flex: 1,
  },
  ownerName: {
    fontSize: 15,
    fontWeight: '700',
    color: colors.light.textPrimary,
  },
  ownerRatingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 2,
  },
  ownerRatingText: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.light.textSecondary,
  },
  ownerContactText: {
    fontSize: 12,
    color: colors.light.textSecondary,
    marginTop: 2,
  },
  ownerActionRow: {
    flexDirection: 'row',
    gap: 10,
  },
  ownerActionBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: colors.light.primaryLight + '50',
    paddingVertical: 8,
    borderRadius: 8,
  },
  ownerActionBtnEmail: {
    backgroundColor: colors.light.primaryLight,
  },
  ownerActionBtnText: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.light.primary,
  },
  feeRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginVertical: 4,
  },
  feeLabel: {
    fontSize: 13,
    color: colors.light.textSecondary,
    flex: 1,
  },
  feeValue: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.light.textPrimary,
  },
  divider: {
    height: 1,
    backgroundColor: colors.light.border,
    marginVertical: 10,
  },
  feeTotalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  feeTotalLabel: {
    fontSize: 15,
    fontWeight: '800',
    color: colors.light.textPrimary,
  },
  feeTotalValue: {
    fontSize: 18,
    fontWeight: '800',
    color: colors.light.primary,
  },
  paymentStatusBadge: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: colors.light.surface,
    padding: 10,
    borderRadius: 8,
  },
  paymentStatusTitle: {
    fontSize: 12,
    color: colors.light.textSecondary,
  },
  paymentStatusValue: {
    fontSize: 12,
    fontWeight: '700',
  },
  deliveryRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 6,
  },
  deliveryMethodText: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.light.textPrimary,
  },
  deliveryAddressText: {
    fontSize: 13,
    color: colors.light.textSecondary,
    lineHeight: 18,
  },
  bottomBar: {
    backgroundColor: colors.light.surface,
    borderTopWidth: 1,
    borderTopColor: colors.light.border,
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: Platform.OS === 'ios' ? 28 : 12,
  },
  cancelBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 12,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: colors.light.error,
  },
  cancelBtnText: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.light.error,
  },
  actionPrimaryBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 12,
    borderRadius: 10,
    backgroundColor: colors.light.primary,
  },
  actionPrimaryBtnText: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.light.white,
  },
  reviewActionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 12,
    borderRadius: 10,
    backgroundColor: colors.light.ratingStar,
  },
  reviewActionBtnText: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.light.white,
  },
  reRentBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 12,
    borderRadius: 10,
    backgroundColor: colors.light.primary,
  },
  reRentBtnText: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.light.white,
  },

  // ── HANDOVER BIÊN BẢN & ẢNH NHẬN MÁY ──
  cardHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  photoCountBadge: {
    backgroundColor: colors.light.successLight,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.light.success,
  },
  photoCountBadgeText: {
    fontSize: 11,
    fontWeight: '700',
    color: colors.light.success,
  },
  handoverPhotosWrap: {
    marginTop: 4,
  },
  handoverPhotosDesc: {
    fontSize: 12,
    color: colors.light.textSecondary,
    lineHeight: 17,
    marginBottom: 10,
  },
  photoGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 10,
  },
  photoThumbItem: {
    width: '23%',
    aspectRatio: 1,
    borderRadius: 10,
    overflow: 'hidden',
    position: 'relative',
    backgroundColor: colors.light.card,
  },
  photoThumbImage: {
    width: '100%',
    height: '100%',
    resizeMode: 'cover',
  },
  photoThumbTag: {
    position: 'absolute',
    bottom: 2,
    left: 2,
    right: 2,
    backgroundColor: 'rgba(0,0,0,0.6)',
    borderRadius: 4,
    paddingVertical: 1,
  },
  photoThumbTagText: {
    fontSize: 8,
    fontWeight: '700',
    color: colors.light.white,
    textAlign: 'center',
  },
  conditionNoteBox: {
    backgroundColor: colors.light.background,
    borderRadius: 10,
    padding: 10,
    borderWidth: 1,
    borderColor: colors.light.borderDefault,
    marginBottom: 10,
  },
  conditionNoteTitle: {
    fontSize: 11,
    fontWeight: '700',
    color: colors.light.textSecondary,
    marginBottom: 2,
  },
  conditionNoteContent: {
    fontSize: 12,
    color: colors.light.textPrimary,
    lineHeight: 17,
  },
  retakeBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 8,
    backgroundColor: colors.light.primaryLight,
    borderRadius: 8,
    marginBottom: 6,
  },
  retakeBtnText: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.light.primary,
  },
  emptyHandoverBox: {
    alignItems: 'center',
    paddingVertical: 14,
    paddingHorizontal: 8,
  },
  emptyHandoverIcon: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: colors.light.borderSubtle,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  emptyHandoverTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.light.textPrimary,
    marginBottom: 4,
  },
  emptyHandoverDesc: {
    fontSize: 12,
    color: colors.light.textSecondary,
    textAlign: 'center',
    lineHeight: 17,
    marginBottom: 12,
  },
  takePhotosCta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: colors.light.primary,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 12,
  },
  takePhotosCtaText: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.light.white,
  },
  openQrCta: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: colors.light.primaryLight,
    borderWidth: 1,
    borderColor: colors.light.borderDefault,
    borderRadius: 12,
    padding: 12,
    marginTop: 8,
  },
  openQrCtaText: {
    flex: 1,
    fontSize: 13,
    fontWeight: '600',
    color: colors.light.primaryDark,
    marginLeft: 8,
  },
  approvedActionRow: {
    flexDirection: 'row',
    gap: 10,
  },
  qrPrimaryBtn: {
    flex: 3,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 12,
    borderRadius: 10,
    backgroundColor: colors.light.primary,
  },
  qrPrimaryBtnText: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.light.white,
  },
  cameraSecondaryBtn: {
    flex: 2,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 12,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: colors.light.primary,
    backgroundColor: colors.light.card,
  },
  cameraSecondaryBtnText: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.light.primary,
  },

  // ── PREVIEW MODAL ──
  previewBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.92)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 16,
  },
  previewContainer: {
    width: '100%',
    height: '80%',
    position: 'relative',
    justifyContent: 'center',
    alignItems: 'center',
  },
  previewCloseBtn: {
    position: 'absolute',
    top: -30,
    right: 10,
    zIndex: 10,
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(255, 255, 255, 0.25)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  fullPreviewImage: {
    width: '100%',
    height: '100%',
  },
});
