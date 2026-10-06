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

const STATUS_CONFIG = {
  pending: { label: 'Chờ duyệt', color: colors.light.warning, icon: 'time-outline' },
  approved: { label: 'Đã duyệt', color: colors.light.primary, icon: 'checkmark-circle-outline' },
  active: { label: 'Đang thuê', color: colors.light.primary, icon: 'play-circle-outline' },
  completed: { label: 'Hoàn tất', color: colors.light.success, icon: 'checkmark-done-circle-outline' },
  cancelled: { label: 'Đã hủy', color: colors.light.error, icon: 'close-circle-outline' },
  rejected: { label: 'Bị từ chối', color: colors.light.error, icon: 'close-circle-outline' },
};

const PAYMENT_STATUS_CONFIG: Record<string, { label: string; color: string }> = {
  unpaid: { label: 'Chưa thanh toán', color: colors.light.warning },
  deposit_held: { label: 'Đã giữ tiền cọc (Escrow)', color: colors.light.primary },
  paid: { label: 'Đã thanh toán', color: colors.light.success },
  refunded: { label: 'Đã hoàn cọc / hoàn tiền', color: colors.light.textSecondary },
  disputed: { label: 'Đang khiếu nại', color: colors.light.error },
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
      console.error('Lỗi tải chi tiết đơn:', error);
      Alert.alert('Lỗi', 'Không thể tải thông tin đơn thuê');
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
      Alert.alert('Thông báo', 'Chủ máy chưa cập nhật số điện thoại.');
      return;
    }
    Linking.openURL(`tel:${phone}`);
  };

  const handleEmailOwner = (email?: string) => {
    if (!email) {
      Alert.alert('Thông báo', 'Chủ máy chưa cập nhật email.');
      return;
    }
    Linking.openURL(`mailto:${email}`);
  };

  const handleCancelBooking = () => {
    if (!booking) return;

    Alert.alert(
      'Xác nhận hủy đơn',
      `Bạn có chắc chắn muốn hủy đơn thuê #${booking.bookingCode}?`,
      [
        { text: 'Bỏ qua', style: 'cancel' },
        {
          text: 'Xác nhận hủy',
          style: 'destructive',
          onPress: async () => {
            try {
              setIsCancelling(true);
              await bookingService.cancelBooking(booking._id, 'Khách hàng hủy trên trang chi tiết');
              Alert.alert('Thành công', 'Đơn thuê đã được hủy.');
              fetchDetail();
            } catch (err: any) {
              Alert.alert('Lỗi', err.response?.data?.message || 'Không thể hủy đơn');
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
        <Text style={styles.loadingText}>Đang tải chi tiết đơn thuê...</Text>
      </View>
    );
  }

  if (!booking) {
    return (
      <View style={styles.errorContainer}>
        <Ionicons name="alert-circle-outline" size={54} color={colors.light.error} />
        <Text style={styles.errorText}>Không tìm thấy thông tin đơn thuê này.</Text>
        <TouchableOpacity style={styles.backButton} onPress={onBack}>
          <Text style={styles.backButtonText}>Quay lại</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const device = booking.deviceId || {};
  const owner = booking.ownerId || {};
  const statusConfig = STATUS_CONFIG[booking.status as keyof typeof STATUS_CONFIG] || STATUS_CONFIG.pending;
  const paymentConfig = PAYMENT_STATUS_CONFIG[booking.paymentStatus] || PAYMENT_STATUS_CONFIG.unpaid;

  const startDateFormatted = new Date(booking.startDate).toLocaleString('vi-VN', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });

  const endDateFormatted = new Date(booking.endDate).toLocaleString('vi-VN', {
    day: '2-digit',
    month: '2-digit',
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
          <Text style={styles.headerTitle}>Chi tiết đơn thuê</Text>
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
            <Text style={styles.cardTitle}>Thông tin thiết bị</Text>
          </View>

          <View style={styles.deviceRow}>
            <Image
              source={{ uri: device.images?.[0] || 'https://via.placeholder.com/150' }}
              style={styles.deviceImage}
            />
            <View style={styles.deviceInfo}>
              <Text style={styles.deviceName} numberOfLines={2}>
                {device.name || 'Thiết bị'}
              </Text>
              <Text style={styles.deviceSub}>
                {device.brand ? `${device.brand} • ` : ''}
                {device.category || 'Công nghệ'}
              </Text>
              <Text style={styles.devicePrice}>
                {(device.pricePerDay || booking.pricePerDayAtBooking || 0).toLocaleString('vi-VN')} đ/ngày
              </Text>
            </View>
          </View>

          {onNavigateToDeviceDetail && device._id && (
            <TouchableOpacity
              style={styles.viewDeviceBtn}
              onPress={() => onNavigateToDeviceDetail(device._id)}
            >
              <Text style={styles.viewDeviceBtnText}>Xem chi tiết trang sản phẩm</Text>
              <Ionicons name="chevron-forward" size={16} color={colors.light.primary} />
            </TouchableOpacity>
          )}
        </View>

        {/* ── 2. THỜI GIAN THUÊ & ĐỒNG HỒ ĐẾM NGƯỢC ── */}
        <View style={styles.card}>
          <View style={styles.cardHeaderRow}>
            <Ionicons name="time-outline" size={18} color={colors.light.primary} />
            <Text style={styles.cardTitle}>Thời gian thuê ({booking.totalDays} ngày)</Text>
          </View>

          <View style={styles.dateBlock}>
            <View style={styles.dateCol}>
              <Text style={styles.dateColLabel}>NHẬN MÁY</Text>
              <Text style={styles.dateColValue}>{startDateFormatted}</Text>
            </View>
            <Ionicons name="arrow-forward" size={18} color={colors.light.textSecondary} />
            <View style={styles.dateCol}>
              <Text style={styles.dateColLabel}>TRẢ MÁY</Text>
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
              <Ionicons name="hourglass" size={16} color="#D97706" />
              <View style={{ flex: 1 }}>
                <Text style={styles.extensionTitlePending}>Đang có yêu cầu gia hạn chờ duyệt</Text>
                <Text style={styles.extensionDescPending}>
                  Thuê thêm {booking.extensionRequest?.requestedDays} ngày (+
                  {booking.extensionRequest?.additionalFee?.toLocaleString('vi-VN')} đ). Hạn mới dự kiến:{' '}
                  {new Date(booking.extensionRequest?.requestedEndDate || '').toLocaleDateString('vi-VN')}.
                </Text>
              </View>
            </View>
          )}

          {isApprovedExtension && (
            <View style={styles.extensionInfoApproved}>
              <Ionicons name="checkmark-circle" size={16} color="#16A34A" />
              <Text style={styles.extensionTitleApproved}>
                Đã gia hạn thành công (+{booking.extensionRequest?.requestedDays} ngày)
              </Text>
            </View>
          )}
        </View>

        {/* ── 3. THÔNG TIN CHỦ MÁY (CHO THUÊ) ── */}
        <View style={styles.card}>
          <View style={styles.cardHeaderRow}>
            <Ionicons name="person-outline" size={18} color={colors.light.primary} />
            <Text style={styles.cardTitle}>Chủ thiết bị</Text>
          </View>

          <View style={styles.ownerRow}>
            <Image
              source={{ uri: owner.avatar || 'https://via.placeholder.com/100' }}
              style={styles.ownerAvatar}
            />
            <View style={styles.ownerInfo}>
              <Text style={styles.ownerName}>{owner.name || 'Chủ máy TechShare'}</Text>
              <View style={styles.ownerRatingRow}>
                <Ionicons name="star" size={14} color="#F59E0B" />
                <Text style={styles.ownerRatingText}>
                  {owner.rating ? Number(owner.rating).toFixed(1) : '5.0'} (
                  {owner.totalReviews || 0} đánh giá)
                </Text>
              </View>
              {owner.phone ? (
                <Text style={styles.ownerContactText}>SĐT: {owner.phone}</Text>
              ) : null}
            </View>
          </View>

          <View style={styles.ownerActionRow}>
            <TouchableOpacity
              style={styles.ownerActionBtn}
              onPress={() => handleCallOwner(owner.phone)}
            >
              <Ionicons name="call-outline" size={16} color={colors.light.primary} />
              <Text style={styles.ownerActionBtnText}>Gọi điện</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.ownerActionBtn, styles.ownerActionBtnEmail]}
              onPress={() => handleEmailOwner(owner.email)}
            >
              <Ionicons name="mail-outline" size={16} color="#0D9488" />
              <Text style={[styles.ownerActionBtnText, { color: '#0D9488' }]}>Email</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* ── 4. BẢNG CHI PHÍ & THANH TOÁN (SỐ TIỀN) ── */}
        <View style={styles.card}>
          <View style={styles.cardHeaderRow}>
            <Ionicons name="receipt-outline" size={18} color={colors.light.primary} />
            <Text style={styles.cardTitle}>Chi tiết số tiền</Text>
          </View>

          <View style={styles.feeRow}>
            <Text style={styles.feeLabel}>
              Tiền thuê máy ({booking.totalDays} ngày ×{' '}
              {(booking.pricePerDayAtBooking || device.pricePerDay || 0).toLocaleString('vi-VN')} đ):
            </Text>
            <Text style={styles.feeValue}>
              {(booking.rentalFee || 0).toLocaleString('vi-VN')} đ
            </Text>
          </View>

          {booking.depositFee ? (
            <View style={styles.feeRow}>
              <Text style={styles.feeLabel}>Tiền đặt cọc (hoàn lại khi trả máy):</Text>
              <Text style={styles.feeValue}>
                {booking.depositFee.toLocaleString('vi-VN')} đ
              </Text>
            </View>
          ) : null}

          {booking.voucherDiscount ? (
            <View style={styles.feeRow}>
              <Text style={[styles.feeLabel, { color: colors.light.success }]}>
                Mã giảm giá ({booking.voucherCode || 'Ưu đãi'}):
              </Text>
              <Text style={[styles.feeValue, { color: colors.light.success }]}>
                -{booking.voucherDiscount.toLocaleString('vi-VN')} đ
              </Text>
            </View>
          ) : null}

          <View style={styles.divider} />

          <View style={styles.feeTotalRow}>
            <Text style={styles.feeTotalLabel}>Tổng số tiền:</Text>
            <Text style={styles.feeTotalValue}>
              {(booking.totalAmount || 0).toLocaleString('vi-VN')} đ
            </Text>
          </View>

          <View style={styles.paymentStatusBadge}>
            <Text style={styles.paymentStatusTitle}>Trạng thái thanh toán:</Text>
            <Text style={[styles.paymentStatusValue, { color: paymentConfig.color }]}>
              {paymentConfig.label}
            </Text>
          </View>
        </View>

        {/* ── 5. PHƯƠNG THỨC GIAO NHẬN ── */}
        <View style={styles.card}>
          <View style={styles.cardHeaderRow}>
            <Ionicons name="location-outline" size={18} color={colors.light.primary} />
            <Text style={styles.cardTitle}>Phương thức giao nhận</Text>
          </View>

          <View style={styles.deliveryRow}>
            <Ionicons
              name={booking.deliveryMethod === 'delivery' ? 'bicycle' : 'storefront-outline'}
              size={20}
              color={colors.light.primary}
            />
            <Text style={styles.deliveryMethodText}>
              {booking.deliveryMethod === 'delivery'
                ? 'Giao hàng tận nơi'
                : 'Tự đến nhận thiết bị tại điểm hẹn'}
            </Text>
          </View>

          <Text style={styles.deliveryAddressText}>
            Địa chỉ: {booking.deliveryAddress || device.addressText || 'Liên hệ trực tiếp chủ máy'}
          </Text>
        </View>

        {/* ── 6. BIÊN BẢN BÀN GIAO & ẢNH NHẬN MÁY (beforeRental) ── */}
        {(booking.status === 'approved' ||
          booking.status === 'active' ||
          booking.status === 'completed') && (
          <View style={styles.card}>
            <View style={styles.cardHeaderRow}>
              <View style={styles.cardHeaderLeft}>
                <Ionicons name="shield-checkmark" size={18} color="#059669" />
                <Text style={styles.cardTitle}>Biên bản nhận máy (beforeRental)</Text>
              </View>
              {booking.handoverPhotos?.beforeRental && booking.handoverPhotos.beforeRental.length > 0 ? (
                <View style={styles.photoCountBadge}>
                  <Text style={styles.photoCountBadgeText}>
                    {booking.handoverPhotos.beforeRental.length}/4 ảnh
                  </Text>
                </View>
              ) : null}
            </View>

            {/* Nếu đã có ảnh nhận máy */}
            {booking.handoverPhotos?.beforeRental && booking.handoverPhotos.beforeRental.length > 0 ? (
              <View style={styles.handoverPhotosWrap}>
                <Text style={styles.handoverPhotosDesc}>
                  Ảnh hiện trạng 4 góc thiết bị khi nhận bàn giao (dùng đối chiếu lúc trả máy):
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
                        <Text style={styles.photoThumbTagText}>Góc {idx + 1}</Text>
                      </View>
                    </TouchableOpacity>
                  ))}
                </View>

                {booking.conditionNotes?.before ? (
                  <View style={styles.conditionNoteBox}>
                    <Text style={styles.conditionNoteTitle}>Ghi chú hiện trạng:</Text>
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
                    <Text style={styles.retakeBtnText}>Cập nhật / Chụp lại ảnh góc máy</Text>
                  </TouchableOpacity>
                )}
              </View>
            ) : (
              <View style={styles.emptyHandoverBox}>
                <View style={styles.emptyHandoverIcon}>
                  <Ionicons name="camera-outline" size={28} color="#64748B" />
                </View>
                <Text style={styles.emptyHandoverTitle}>Chưa lưu ảnh nhận bàn giao máy</Text>
                <Text style={styles.emptyHandoverDesc}>
                  Chụp 4 góc máy và phụ kiện kèm theo lúc nhận máy từ chủ máy để bảo vệ tiền cọc của bạn.
                </Text>
                <TouchableOpacity
                  style={styles.takePhotosCta}
                  onPress={() => setHandoverCameraModalVisible(true)}
                  activeOpacity={0.85}
                >
                  <Ionicons name="camera" size={18} color="#FFFFFF" />
                  <Text style={styles.takePhotosCtaText}>Chụp ảnh nhận máy ngay (4 góc)</Text>
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
                <Text style={styles.openQrCtaText}>Xuất trình mã QR bàn giao</Text>
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
                <Text style={styles.cancelBtnText}>Hủy đơn thuê</Text>
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
              <Ionicons name="qr-code" size={18} color="#FFFFFF" />
              <Text style={styles.qrPrimaryBtnText}>Mã QR nhận máy</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.cameraSecondaryBtn}
              onPress={() => setHandoverCameraModalVisible(true)}
              activeOpacity={0.85}
            >
              <Ionicons name="camera" size={18} color={colors.light.primary} />
              <Text style={styles.cameraSecondaryBtnText}>Chụp ảnh máy</Text>
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
              color={isPendingExtension ? colors.light.textSecondary : '#FFFFFF'}
            />
            <Text
              style={[
                styles.actionPrimaryBtnText,
                isPendingExtension && { color: colors.light.textSecondary },
              ]}
            >
              {isPendingExtension ? 'Chờ duyệt gia hạn' : 'Gia hạn thuê'}
            </Text>
          </TouchableOpacity>
        )}

        {booking.status === 'completed' && (
          booking.isReviewed ? (
            <TouchableOpacity style={styles.reRentBtn} onPress={handleReRent}>
              <Ionicons name="repeat" size={18} color="#FFFFFF" />
              <Text style={styles.reRentBtnText}>Thuê lại thiết bị này</Text>
            </TouchableOpacity>
          ) : (
            <TouchableOpacity
              style={styles.reviewActionBtn}
              onPress={() => setReviewModalVisible(true)}
            >
              <Ionicons name="star" size={18} color="#FFFFFF" />
              <Text style={styles.reviewActionBtnText}>Đánh giá chất lượng dịch vụ</Text>
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
              <Ionicons name="close" size={24} color="#FFFFFF" />
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
    backgroundColor: '#F8FAFC',
  },
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
    backgroundColor: '#FFFFFF',
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
    color: '#FFFFFF',
    fontWeight: '700',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
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
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    padding: 16,
    borderWidth: 1,
    borderColor: colors.light.border,
    shadowColor: '#000',
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
    backgroundColor: '#E2E8F0',
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
    backgroundColor: '#FEF3C7',
    padding: 10,
    borderRadius: 8,
    marginTop: 10,
  },
  extensionTitlePending: {
    fontSize: 13,
    fontWeight: '700',
    color: '#92400E',
  },
  extensionDescPending: {
    fontSize: 12,
    color: '#B45309',
    marginTop: 2,
    lineHeight: 16,
  },
  extensionInfoApproved: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#DCFCE7',
    padding: 8,
    borderRadius: 8,
    marginTop: 10,
  },
  extensionTitleApproved: {
    fontSize: 12,
    fontWeight: '700',
    color: '#15803D',
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
    backgroundColor: '#E2E8F0',
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
    backgroundColor: '#CCFBF1',
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
    backgroundColor: '#FFFFFF',
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
    color: '#FFFFFF',
  },
  reviewActionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 12,
    borderRadius: 10,
    backgroundColor: '#F59E0B',
  },
  reviewActionBtnText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#FFFFFF',
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
    color: '#FFFFFF',
  },

  // ── HANDOVER BIÊN BẢN & ẢNH NHẬN MÁY ──
  cardHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  photoCountBadge: {
    backgroundColor: '#ECFDF5',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#A7F3D0',
  },
  photoCountBadgeText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#059669',
  },
  handoverPhotosWrap: {
    marginTop: 4,
  },
  handoverPhotosDesc: {
    fontSize: 12,
    color: '#64748B',
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
    backgroundColor: '#0F172A',
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
    color: '#FFFFFF',
    textAlign: 'center',
  },
  conditionNoteBox: {
    backgroundColor: '#F8FAFC',
    borderRadius: 10,
    padding: 10,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    marginBottom: 10,
  },
  conditionNoteTitle: {
    fontSize: 11,
    fontWeight: '700',
    color: '#475569',
    marginBottom: 2,
  },
  conditionNoteContent: {
    fontSize: 12,
    color: '#0F172A',
    lineHeight: 17,
  },
  retakeBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 8,
    backgroundColor: '#EFF6FF',
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
    backgroundColor: '#F1F5F9',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  emptyHandoverTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#1E293B',
    marginBottom: 4,
  },
  emptyHandoverDesc: {
    fontSize: 12,
    color: '#64748B',
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
    color: '#FFFFFF',
  },
  openQrCta: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#F0F9FF',
    borderWidth: 1,
    borderColor: '#BAE6FD',
    borderRadius: 12,
    padding: 12,
    marginTop: 8,
  },
  openQrCtaText: {
    flex: 1,
    fontSize: 13,
    fontWeight: '600',
    color: '#0369A1',
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
    color: '#FFFFFF',
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
    backgroundColor: '#FFFFFF',
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
