import React from 'react';
import {
  StyleSheet,
  View,
  Text,
  TouchableOpacity,
  Image,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../../theme/colors';
import { Booking } from '../../services/bookingService';
import { ReviewItem } from '../../services/reviewService';
import { RentalCountdownTimer } from './RentalCountdownTimer';

export interface OwnerApprovalCardProps {
  booking: Booking;
  onApprove: (booking: Booking) => void;
  onReject: (booking: Booking) => void;
  onHandover?: (booking: Booking) => void;
  onComplete?: (booking: Booking) => void;
  onPress?: (booking: Booking) => void;
  onRateRenter?: (booking: Booking) => void;
  renterReview?: ReviewItem;
  isUpdating?: boolean;
}

const STATUS_CONFIG: Record<
  string,
  { label: string; color: string; bgColor: string; icon: keyof typeof Ionicons.glyphMap }
> = {
  pending: {
    label: 'Chờ bạn duyệt',
    color: colors.light.warning,
    bgColor: '#FEF3C7',
    icon: 'time-outline',
  },
  approved: {
    label: 'Đã duyệt • Bàn giao',
    color: colors.light.primary,
    bgColor: colors.light.primaryLight,
    icon: 'checkmark-circle-outline',
  },
  active: {
    label: 'Đang thuê • Nhận lại máy',
    color: colors.light.primaryDark,
    bgColor: colors.light.primaryLight,
    icon: 'play-circle-outline',
  },
  completed: {
    label: 'Đã hoàn tất',
    color: colors.light.success,
    bgColor: '#DCFCE7',
    icon: 'checkmark-done-circle-outline',
  },
  rejected: {
    label: 'Đã từ chối',
    color: colors.light.error,
    bgColor: '#FEE2E2',
    icon: 'close-circle-outline',
  },
  cancelled: {
    label: 'Khách đã hủy',
    color: colors.light.textSecondary,
    bgColor: '#F1F5F9',
    icon: 'ban-outline',
  },
};

export function OwnerApprovalCard({
  booking,
  onApprove,
  onReject,
  onHandover,
  onComplete,
  onPress,
  onRateRenter,
  renterReview,
  isUpdating = false,
}: OwnerApprovalCardProps) {
  const statusCfg = STATUS_CONFIG[booking.status] || STATUS_CONFIG.pending;
  const isPending = booking.status === 'pending';
  const isApproved = booking.status === 'approved';
  const isActive = booking.status === 'active';
  const isCompleted = booking.status === 'completed';
  const isRejected = booking.status === 'rejected';
  const isCancelled = booking.status === 'cancelled';

  const device = (booking.deviceId as any) || {};
  const renter = (booking.renterId as any) || {};

  const deviceImage =
    device.images?.[0] ||
    'https://images.unsplash.com/photo-1516035069371-29a1b244cc32?w=400';
  const deviceTitle = device.name || device.title || 'Thiết bị công nghệ';
  const renterName = renter.name || 'Khách thuê';
  const renterAvatar =
    renter.avatar ||
    'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=200';

  const startDateStr = booking.startDate
    ? new Date(booking.startDate).toLocaleDateString('vi-VN')
    : '';
  const endDateStr = booking.endDate
    ? new Date(booking.endDate).toLocaleDateString('vi-VN')
    : '';

  return (
    <TouchableOpacity
      style={[
        styles.card,
        isPending && styles.cardPending,
        isApproved && styles.cardApproved,
        isActive && styles.cardActive,
      ]}
      onPress={() => onPress && onPress(booking)}
      activeOpacity={onPress ? 0.85 : 1}
    >
      {/* ── 1. HEADER: Trạng thái & Mã đơn & Tổng tiền ── */}
      <View style={styles.headerRow}>
        <View style={[styles.statusBadge, { backgroundColor: statusCfg.bgColor }]}>
          <Ionicons name={statusCfg.icon} size={14} color={statusCfg.color} />
          <Text style={[styles.statusBadgeText, { color: statusCfg.color }]}>
            {statusCfg.label}
          </Text>
        </View>

        <View style={styles.headerRight}>
          <Text style={styles.bookingCode}>#{booking.bookingCode || 'TS'}</Text>
          <Text style={styles.totalPrice}>
            {(booking.totalAmount || 0).toLocaleString('vi-VN')} đ
          </Text>
        </View>
      </View>

      {/* ── 2. BODY: Thông tin thiết bị & Thời gian thuê ── */}
      <View style={styles.bodyRow}>
        <Image source={{ uri: deviceImage }} style={styles.deviceThumb} />

        <View style={styles.deviceInfoCol}>
          <Text style={styles.deviceTitle} numberOfLines={2}>
            {deviceTitle}
          </Text>

          <View style={styles.metaRow}>
            <Ionicons name="calendar-outline" size={13} color={colors.light.textSecondary} />
            <Text style={styles.durationText}>
              {booking.totalDays} ngày ({startDateStr} - {endDateStr})
            </Text>
          </View>

          <View style={styles.pricingPillsRow}>
            <View style={styles.pricePill}>
              <Text style={styles.pricePillText}>
                Tiền thuê: {(booking.rentalFee || 0).toLocaleString('vi-VN')} đ
              </Text>
            </View>

            {(booking.depositFee ?? 0) > 0 && (
              <View style={styles.depositPill}>
                <Ionicons name="shield-checkmark-outline" size={11} color={colors.light.primary} />
                <Text style={styles.depositPillText}>
                  Cọc: {(booking.depositFee || 0).toLocaleString('vi-VN')} đ
                </Text>
              </View>
            )}
          </View>
        </View>
      </View>

      {/* ── 3. KHÁCH THUÊ: Avatar, Tên, Điểm uy tín, SĐT ── */}
      <View style={styles.renterCard}>
        <View style={styles.renterLeft}>
          <Image source={{ uri: renterAvatar }} style={styles.renterAvatar} />
          <View style={styles.renterMeta}>
            <View style={styles.renterNameRow}>
              <Text style={styles.renterName} numberOfLines={1}>
                {renterName}
              </Text>
              {renter.isVerified && (
                <View style={styles.verifiedBadge}>
                  <Ionicons name="checkmark-circle" size={13} color={colors.light.primary} />
                  <Text style={styles.verifiedText}>Đã xác minh</Text>
                </View>
              )}
            </View>

            <View style={styles.trustScoreRow}>
              <Ionicons name="star" size={12} color={colors.light.ratingStar} />
              <Text style={styles.trustScoreText}>
                5.0 • Điểm uy tín: {renter.trustScore || 100}
              </Text>
            </View>
          </View>
        </View>

        {renter.phone && (
          <View style={styles.renterPhoneBox}>
            <Ionicons name="call-outline" size={12} color={colors.light.textSecondary} />
            <Text style={styles.renterPhoneText}>{renter.phone}</Text>
          </View>
        )}
      </View>

      {/* ── 4. PHƯƠNG THỨC GIAO NHẬN ── */}
      {booking.deliveryMethod && (
        <View style={styles.deliveryRow}>
          <Ionicons
            name={booking.deliveryMethod === 'delivery' ? 'bicycle-outline' : 'storefront-outline'}
            size={13}
            color={colors.light.textSecondary}
          />
          <Text style={styles.deliveryLabel}>
            {booking.deliveryMethod === 'delivery'
              ? `Giao tận nơi: ${booking.deliveryAddress || 'Theo địa chỉ khách'}`
              : 'Khách đến tự nhận tại điểm của chủ máy'}
          </Text>
        </View>
      )}

      {/* ── 5. ĐỒNG HỒ ĐẾM NGƯỢC (KHI ĐANG ACTIVE) ── */}
      {isActive && booking.endDate && (
        <View style={styles.countdownContainer}>
          <RentalCountdownTimer endDate={booking.endDate} />
        </View>
      )}

      {/* ── 6. LÝ DO TỪ CHỐI / HỦY (NẾU CÓ) ── */}
      {isRejected && (
        <View style={styles.reasonBox}>
          <Ionicons name="alert-circle-outline" size={14} color={colors.light.error} />
          <Text style={styles.reasonText}>
            Lý do từ chối: {(booking as any).rejectReason || 'Chủ máy bận hoặc chưa sẵn sàng'}
          </Text>
        </View>
      )}

      {isCancelled && (
        <View style={styles.reasonBox}>
          <Ionicons name="information-circle-outline" size={14} color={colors.light.textSecondary} />
          <Text style={[styles.reasonText, { color: colors.light.textSecondary }]}>
            Lý do hủy: {(booking as any).cancelReason || 'Khách đã hủy yêu cầu'}
          </Text>
        </View>
      )}

      {/* ── 7. HOÀN CỌC THÀNH CÔNG (KHI HOÀN TẤT) ── */}
      {isCompleted && (
        <View style={styles.completedNoteBox}>
          <Ionicons name="checkmark-done" size={14} color={colors.light.success} />
          <Text style={styles.completedNoteText}>
            Đơn thuê đã hoàn tất • Tiền cọc đã hoàn về ví khách • Doanh thu đã cộng ví chủ
          </Text>
        </View>
      )}

      {/* ── 7B. CHIỀU 2: CHỦ MÁY ĐÁNH GIÁ Ý THỨC KHÁCH THUÊ ── */}
      {isCompleted && renterReview?.renterTrustRating ? (
        <View style={styles.ratedTrustBox}>
          <View style={styles.ratedTrustHeader}>
            <Ionicons name="shield-checkmark" size={15} color={colors.light.primary} />
            <Text style={styles.ratedTrustTitle}>Đã chấm ý thức khách:</Text>
            <View style={styles.ratedStarBadge}>
              <Ionicons name="star" size={12} color="#FBBF24" />
              <Text style={styles.ratedStarText}>{renterReview.renterTrustRating}/5 sao</Text>
            </View>
          </View>
          {!!renterReview.renterFeedback && (
            <Text style={styles.ratedFeedbackText} numberOfLines={2}>
              "{renterReview.renterFeedback}"
            </Text>
          )}
        </View>
      ) : isCompleted && onRateRenter ? (
        <View style={styles.rateRenterCtaBox}>
          <View style={styles.rateRenterCtaTextCol}>
            <View style={styles.rateRenterTagRow}>
              <Ionicons name="star" size={13} color="#F59E0B" />
              <Text style={styles.rateRenterCtaTitle}>Chấm điểm ý thức khách thuê</Text>
            </View>
            <Text style={styles.rateRenterCtaSub}>
              Cộng hoặc trừ điểm tín nhiệm khách thuê
            </Text>
          </View>
          <TouchableOpacity
            style={styles.btnRateRenter}
            onPress={() => onRateRenter(booking)}
            activeOpacity={0.85}
          >
            <Text style={styles.btnRateRenterText}>Đánh giá ngay</Text>
            <Ionicons name="arrow-forward" size={13} color="#FFFFFF" />
          </TouchableOpacity>
        </View>
      ) : null}

      {/* ── 8. HÀNG NÚT THAO TÁC THEO TRẠNG THÁI ── */}
      {isPending && (
        <View style={styles.actionsRow}>
          <TouchableOpacity
            style={styles.btnReject}
            onPress={() => onReject(booking)}
            disabled={isUpdating}
            activeOpacity={0.8}
          >
            <Ionicons name="close-circle-outline" size={16} color={colors.light.error} />
            <Text style={styles.btnRejectText}>Từ chối</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.btnApprove}
            onPress={() => onApprove(booking)}
            disabled={isUpdating}
            activeOpacity={0.85}
          >
            {isUpdating ? (
              <ActivityIndicator size="small" color="#FFFFFF" />
            ) : (
              <>
                <Ionicons name="checkmark-circle-outline" size={16} color="#FFFFFF" />
                <Text style={styles.btnApproveText}>Duyệt đơn ngay</Text>
              </>
            )}
          </TouchableOpacity>
        </View>
      )}

      {isApproved && onHandover && (
        <View style={styles.actionsRow}>
          <TouchableOpacity
            style={styles.btnHandover}
            onPress={() => onHandover(booking)}
            disabled={isUpdating}
            activeOpacity={0.85}
          >
            {isUpdating ? (
              <ActivityIndicator size="small" color={colors.light.primary} />
            ) : (
              <>
                <Ionicons name="qr-code-outline" size={16} color={colors.light.primary} />
                <Text style={styles.btnHandoverText}>Bàn giao máy (Kích hoạt)</Text>
              </>
            )}
          </TouchableOpacity>
        </View>
      )}

      {isActive && onComplete && (
        <View style={styles.actionsRow}>
          <TouchableOpacity
            style={styles.btnComplete}
            onPress={() => onComplete(booking)}
            disabled={isUpdating}
            activeOpacity={0.85}
          >
            {isUpdating ? (
              <ActivityIndicator size="small" color="#FFFFFF" />
            ) : (
              <>
                <Ionicons name="checkmark-done-circle-outline" size={16} color="#FFFFFF" />
                <Text style={styles.btnCompleteText}>Nhận máy & Hoàn tất</Text>
              </>
            )}
          </TouchableOpacity>
        </View>
      )}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.light.background,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: colors.light.border,
    padding: 14,
    marginBottom: 14,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 6,
    elevation: 2,
  },
  cardPending: {
    borderColor: colors.light.warning,
    borderLeftWidth: 4,
    borderLeftColor: colors.light.warning,
  },
  cardApproved: {
    borderColor: colors.light.primaryLight,
    borderLeftWidth: 4,
    borderLeftColor: colors.light.primary,
  },
  cardActive: {
    borderColor: colors.light.primaryLight,
    borderLeftWidth: 4,
    borderLeftColor: colors.light.primaryDark,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingBottom: 10,
    borderBottomWidth: 1,
    borderBottomColor: colors.light.border,
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 20,
    gap: 4,
  },
  statusBadgeText: {
    fontSize: 11,
    fontWeight: '700',
  },
  headerRight: {
    alignItems: 'flex-end',
  },
  bookingCode: {
    fontSize: 11,
    fontWeight: '600',
    color: colors.light.textSecondary,
  },
  totalPrice: {
    fontSize: 14,
    fontWeight: '800',
    color: colors.light.primary,
  },
  bodyRow: {
    flexDirection: 'row',
    marginTop: 12,
    gap: 12,
  },
  deviceThumb: {
    width: 74,
    height: 74,
    borderRadius: 10,
    backgroundColor: colors.light.surface,
  },
  deviceInfoCol: {
    flex: 1,
    justifyContent: 'space-between',
  },
  deviceTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.light.textPrimary,
    lineHeight: 18,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 4,
  },
  durationText: {
    fontSize: 12,
    color: colors.light.textSecondary,
    fontWeight: '500',
  },
  pricingPillsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginTop: 6,
  },
  pricePill: {
    backgroundColor: colors.light.surface,
    paddingHorizontal: 7,
    paddingVertical: 3,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: colors.light.border,
  },
  pricePillText: {
    fontSize: 11,
    fontWeight: '600',
    color: colors.light.textPrimary,
  },
  depositPill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.light.primaryLight,
    paddingHorizontal: 7,
    paddingVertical: 3,
    borderRadius: 6,
    gap: 3,
  },
  depositPillText: {
    fontSize: 11,
    fontWeight: '600',
    color: colors.light.primaryDark,
  },
  renterCard: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: colors.light.surface,
    padding: 10,
    borderRadius: 10,
    marginTop: 12,
    borderWidth: 1,
    borderColor: colors.light.border,
  },
  renterLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flex: 1,
  },
  renterAvatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: colors.light.border,
  },
  renterMeta: {
    flex: 1,
  },
  renterNameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  renterName: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.light.textPrimary,
    maxWidth: 130,
  },
  verifiedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
    backgroundColor: colors.light.primaryLight,
    paddingHorizontal: 5,
    paddingVertical: 1,
    borderRadius: 10,
  },
  verifiedText: {
    fontSize: 9,
    fontWeight: '600',
    color: colors.light.primary,
  },
  trustScoreRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 2,
  },
  trustScoreText: {
    fontSize: 11,
    fontWeight: '600',
    color: colors.light.textSecondary,
  },
  renterPhoneBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    paddingHorizontal: 8,
    paddingVertical: 4,
    backgroundColor: colors.light.background,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: colors.light.border,
  },
  renterPhoneText: {
    fontSize: 11,
    fontWeight: '600',
    color: colors.light.textSecondary,
  },
  deliveryRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    marginTop: 8,
    paddingHorizontal: 4,
  },
  deliveryLabel: {
    fontSize: 11,
    color: colors.light.textSecondary,
    fontStyle: 'italic',
    flex: 1,
  },
  countdownContainer: {
    marginTop: 10,
  },
  reasonBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#FEE2E2',
    padding: 8,
    borderRadius: 8,
    marginTop: 10,
  },
  reasonText: {
    fontSize: 11,
    fontWeight: '500',
    color: colors.light.error,
    flex: 1,
  },
  completedNoteBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#DCFCE7',
    padding: 8,
    borderRadius: 8,
    marginTop: 10,
  },
  completedNoteText: {
    fontSize: 11,
    fontWeight: '600',
    color: colors.light.success,
    flex: 1,
  },
  actionsRow: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 12,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: colors.light.border,
  },
  btnReject: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 10,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: colors.light.error,
    backgroundColor: '#FEF2F2',
  },
  btnRejectText: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.light.error,
  },
  btnApprove: {
    flex: 1.6,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 10,
    borderRadius: 10,
    backgroundColor: colors.light.primary,
  },
  btnApproveText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  btnHandover: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 11,
    borderRadius: 10,
    borderWidth: 1.5,
    borderColor: colors.light.primary,
    backgroundColor: colors.light.primaryLight,
  },
  btnHandoverText: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.light.primaryDark,
  },
  btnComplete: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 11,
    borderRadius: 10,
    backgroundColor: colors.light.success,
  },
  btnCompleteText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  ratedTrustBox: {
    backgroundColor: '#F0FDF4',
    borderWidth: 1,
    borderColor: '#BBF7D0',
    borderRadius: 10,
    padding: 10,
    marginTop: 10,
  },
  ratedTrustHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  ratedTrustTitle: {
    fontSize: 12,
    fontWeight: '600',
    color: '#166534',
    flex: 1,
  },
  ratedStarBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#FEF3C7',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
  },
  ratedStarText: {
    fontSize: 12,
    fontWeight: '800',
    color: '#92400E',
  },
  ratedFeedbackText: {
    fontSize: 12,
    color: '#374151',
    fontStyle: 'italic',
    marginTop: 4,
    marginLeft: 21,
  },
  rateRenterCtaBox: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#FFFBEB',
    borderWidth: 1,
    borderColor: '#FDE68A',
    borderRadius: 10,
    padding: 10,
    marginTop: 10,
    gap: 8,
  },
  rateRenterCtaTextCol: {
    flex: 1,
  },
  rateRenterTagRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  rateRenterCtaTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: '#92400E',
  },
  rateRenterCtaSub: {
    fontSize: 11,
    color: '#B45309',
    marginTop: 2,
  },
  btnRateRenter: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#D97706',
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 8,
  },
  btnRateRenterText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#FFFFFF',
  },
});
