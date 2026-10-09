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
import { STRINGS } from '../../constants/strings';
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
  onScanQr?: (booking: Booking) => void;
  renterReview?: ReviewItem;
  isUpdating?: boolean;
}

const STATUS_CONFIG: Record<
  string,
  { label: string; color: string; bgColor: string; icon: keyof typeof Ionicons.glyphMap }
> = {
  pending: {
    label: STRINGS.OWNER_APPROVAL_CARD.STATUS.pending,
    color: colors.light.warning,
    bgColor: colors.light.warningLight,
    icon: 'time-outline',
  },
  approved: {
    label: STRINGS.OWNER_APPROVAL_CARD.STATUS.approved,
    color: colors.light.primary,
    bgColor: colors.light.primaryLight,
    icon: 'checkmark-circle-outline',
  },
  active: {
    label: STRINGS.OWNER_APPROVAL_CARD.STATUS.active,
    color: colors.light.primaryDark,
    bgColor: colors.light.primaryLight,
    icon: 'play-circle-outline',
  },
  completed: {
    label: STRINGS.OWNER_APPROVAL_CARD.STATUS.completed,
    color: colors.light.success,
    bgColor: colors.light.successLight,
    icon: 'checkmark-done-circle-outline',
  },
  rejected: {
    label: STRINGS.OWNER_APPROVAL_CARD.STATUS.rejected,
    color: colors.light.error,
    bgColor: colors.light.dangerLight,
    icon: 'close-circle-outline',
  },
  cancelled: {
    label: STRINGS.OWNER_APPROVAL_CARD.STATUS.cancelled,
    color: colors.light.textSecondary,
    bgColor: colors.light.surface,
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
  onScanQr,
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
  const deviceTitle = device.name || device.title || STRINGS.OWNER_APPROVAL_CARD.DEFAULT_DEVICE_TITLE;
  const renterName = renter.name || STRINGS.OWNER_APPROVAL_CARD.DEFAULT_RENTER_NAME;
  const renterAvatar =
    renter.avatar ||
    'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=200';

  const startDateStr = booking.startDate
    ? new Date(booking.startDate).toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
      })
    : '';
  const endDateStr = booking.endDate
    ? new Date(booking.endDate).toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
      })
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
      {/* ── 1. HEADER: Status Badge & Booking Code & Total ── */}
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
            {(booking.totalAmount || 0).toLocaleString('en-US')} {STRINGS.COMMON.CURRENCY_SUFFIX}
          </Text>
        </View>
      </View>

      {/* ── 2. BODY: Device info & rental duration ── */}
      <View style={styles.bodyRow}>
        <Image source={{ uri: deviceImage }} style={styles.deviceThumb} />

        <View style={styles.deviceInfoCol}>
          <Text style={styles.deviceTitle} numberOfLines={2}>
            {deviceTitle}
          </Text>

          <View style={styles.metaRow}>
            <Ionicons name="calendar-outline" size={13} color={colors.light.textSecondary} />
            <Text style={styles.durationText}>
              {booking.totalDays} {STRINGS.OWNER_APPROVAL_CARD.DAYS_UNIT} ({startDateStr} - {endDateStr})
            </Text>
          </View>

          <View style={styles.pricingPillsRow}>
            <View style={styles.pricePill}>
              <Text style={styles.pricePillText}>
                {STRINGS.OWNER_APPROVAL_CARD.RENT_LABEL((booking.rentalFee || 0).toLocaleString('en-US'))}
              </Text>
            </View>

            {(booking.depositFee ?? 0) > 0 && (
              <View style={styles.depositPill}>
                <Ionicons name="shield-checkmark-outline" size={11} color={colors.light.primary} />
                <Text style={styles.depositPillText}>
                  {STRINGS.OWNER_APPROVAL_CARD.DEPOSIT_LABEL((booking.depositFee || 0).toLocaleString('en-US'))}
                </Text>
              </View>
            )}
          </View>
        </View>
      </View>

      {/* ── 3. RENTER: Avatar, Name, Trust Score, Phone ── */}
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
                  <Text style={styles.verifiedText}>{STRINGS.OWNER_APPROVAL_CARD.VERIFIED_BADGE}</Text>
                </View>
              )}
            </View>

            <View style={styles.trustScoreRow}>
              <Ionicons name="star" size={12} color={colors.light.ratingStar} />
              <Text style={styles.trustScoreText}>
                {STRINGS.OWNER_APPROVAL_CARD.TRUST_SCORE_LABEL(renter.trustScore || 100)}
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

      {/* ── 4. DELIVERY METHOD ── */}
      {booking.deliveryMethod && (
        <View style={styles.deliveryRow}>
          <Ionicons
            name={booking.deliveryMethod === 'delivery' ? 'bicycle-outline' : 'storefront-outline'}
            size={13}
            color={colors.light.textSecondary}
          />
          <Text style={styles.deliveryLabel}>
            {booking.deliveryMethod === 'delivery'
              ? STRINGS.OWNER_APPROVAL_CARD.DELIVERY_PREFIX(
                  booking.deliveryAddress || STRINGS.OWNER_APPROVAL_CARD.DELIVERY_DEFAULT_ADDR
                )
              : STRINGS.OWNER_APPROVAL_CARD.PICKUP_LABEL}
          </Text>
        </View>
      )}

      {/* ── 4B. BEFORE-RENTAL PHOTOS BADGE ── */}
      {booking.handoverPhotos?.beforeRental && booking.handoverPhotos.beforeRental.length > 0 && (
        <View style={styles.beforeRentalBadgeRow}>
          <Ionicons name="shield-checkmark" size={13} color={colors.light.success} />
          <Text style={styles.beforeRentalBadgeText}>
            {STRINGS.OWNER_APPROVAL_CARD.BEFORE_RENTAL_PHOTOS(booking.handoverPhotos.beforeRental.length)}
          </Text>
        </View>
      )}

      {/* ── 5. COUNTDOWN TIMER (WHEN ACTIVE) ── */}
      {isActive && booking.endDate && (
        <View style={styles.countdownContainer}>
          <RentalCountdownTimer endDate={booking.endDate} />
        </View>
      )}

      {/* ── 6. REJECTION / CANCELLATION REASON ── */}
      {isRejected && (
        <View style={styles.reasonBox}>
          <Ionicons name="alert-circle-outline" size={14} color={colors.light.error} />
          <Text style={styles.reasonText}>
            {STRINGS.OWNER_APPROVAL_CARD.REJECTION_REASON_PREFIX}
            {(booking as any).rejectReason || STRINGS.OWNER_APPROVAL_CARD.REJECTION_REASON_DEFAULT}
          </Text>
        </View>
      )}

      {isCancelled && (
        <View style={styles.reasonBox}>
          <Ionicons name="information-circle-outline" size={14} color={colors.light.textSecondary} />
          <Text style={[styles.reasonText, { color: colors.light.textSecondary }]}>
            {STRINGS.OWNER_APPROVAL_CARD.CANCELLATION_REASON_PREFIX}
            {(booking as any).cancelReason || STRINGS.OWNER_APPROVAL_CARD.CANCELLATION_REASON_DEFAULT}
          </Text>
        </View>
      )}

      {/* ── 7. COMPLETED BANNER ── */}
      {isCompleted && (
        <View style={styles.completedNoteBox}>
          <Ionicons name="checkmark-done" size={14} color={colors.light.success} />
          <Text style={styles.completedNoteText}>
            {STRINGS.OWNER_APPROVAL_CARD.COMPLETED_BANNER}
          </Text>
        </View>
      )}

      {/* ── 7B. OWNER REVIEWS RENTER ── */}
      {isCompleted && renterReview?.renterTrustRating ? (
        <View style={styles.ratedTrustBox}>
          <View style={styles.ratedTrustHeader}>
            <Ionicons name="shield-checkmark" size={15} color={colors.light.primary} />
            <Text style={styles.ratedTrustTitle}>{STRINGS.OWNER_APPROVAL_CARD.RATED_RENTER_TITLE}</Text>
            <View style={styles.ratedStarBadge}>
              <Ionicons name="star" size={12} color={colors.light.ratingStar} />
              <Text style={styles.ratedStarText}>
                {STRINGS.OWNER_APPROVAL_CARD.STARS_SUFFIX(renterReview.renterTrustRating)}
              </Text>
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
              <Ionicons name="star" size={13} color={colors.light.warning} />
              <Text style={styles.rateRenterCtaTitle}>{STRINGS.OWNER_APPROVAL_CARD.RATE_CTA_TITLE}</Text>
            </View>
            <Text style={styles.rateRenterCtaSub}>
              {STRINGS.OWNER_APPROVAL_CARD.RATE_CTA_SUB}
            </Text>
          </View>
          <TouchableOpacity
            style={styles.btnRateRenter}
            onPress={() => onRateRenter(booking)}
            activeOpacity={0.85}
          >
            <Text style={styles.btnRateRenterText}>{STRINGS.OWNER_APPROVAL_CARD.RATE_NOW_BTN}</Text>
            <Ionicons name="arrow-forward" size={13} color={colors.light.white} />
          </TouchableOpacity>
        </View>
      ) : null}

      {/* ── 8. ACTION BUTTONS ── */}
      {isPending && (
        <View style={styles.actionsRow}>
          <TouchableOpacity
            style={styles.btnReject}
            onPress={() => onReject(booking)}
            disabled={isUpdating}
            activeOpacity={0.8}
          >
            <Ionicons name="close-circle-outline" size={16} color={colors.light.error} />
            <Text style={styles.btnRejectText}>{STRINGS.OWNER_APPROVAL_CARD.REJECT_BTN}</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.btnApprove}
            onPress={() => onApprove(booking)}
            disabled={isUpdating}
            activeOpacity={0.85}
          >
            {isUpdating ? (
              <ActivityIndicator size="small" color={colors.light.white} />
            ) : (
              <>
                <Ionicons name="checkmark-circle-outline" size={16} color={colors.light.white} />
                <Text style={styles.btnApproveText}>{STRINGS.OWNER_APPROVAL_CARD.APPROVE_BTN}</Text>
              </>
            )}
          </TouchableOpacity>
        </View>
      )}

      {isApproved && (
        <View style={styles.actionsRow}>
          {onScanQr && (
            <TouchableOpacity
              style={styles.btnScanHandover}
              onPress={() => onScanQr(booking)}
              disabled={isUpdating}
              activeOpacity={0.85}
            >
              <Ionicons name="qr-code-outline" size={16} color={colors.light.white} />
              <Text style={styles.btnScanHandoverText}>{STRINGS.OWNER_APPROVAL_CARD.SCAN_QR_BTN}</Text>
            </TouchableOpacity>
          )}

          {onHandover && (
            <TouchableOpacity
              style={[styles.btnHandover, !onScanQr && { flex: 1 }]}
              onPress={() => onHandover(booking)}
              disabled={isUpdating}
              activeOpacity={0.85}
            >
              {isUpdating ? (
                <ActivityIndicator size="small" color={colors.light.primary} />
              ) : (
                <>
                  <Ionicons name="checkmark-outline" size={16} color={colors.light.primary} />
                  <Text style={styles.btnHandoverText}>{STRINGS.OWNER_APPROVAL_CARD.MANUAL_ACTIVATE_BTN}</Text>
                </>
              )}
            </TouchableOpacity>
          )}
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
              <ActivityIndicator size="small" color={colors.light.white} />
            ) : (
              <>
                <Ionicons name="checkmark-done-circle-outline" size={16} color={colors.light.white} />
                <Text style={styles.btnCompleteText}>{STRINGS.OWNER_APPROVAL_CARD.RECEIVE_COMPLETE_BTN}</Text>
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
    shadowColor: colors.light.shadow,
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
  beforeRentalBadgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: colors.light.successLight,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    marginTop: 8,
    borderWidth: 1,
    borderColor: colors.light.successLight,
    alignSelf: 'flex-start',
  },
  beforeRentalBadgeText: {
    fontSize: 11,
    fontWeight: '600',
    color: colors.light.success,
  },
  countdownContainer: {
    marginTop: 10,
  },
  reasonBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: colors.light.dangerLight,
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
    backgroundColor: colors.light.successLight,
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
    backgroundColor: colors.light.dangerLight,
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
    color: colors.light.white,
  },
  btnScanHandover: {
    flex: 1.4,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 11,
    borderRadius: 10,
    backgroundColor: colors.light.primary,
  },
  btnScanHandoverText: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.light.white,
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
    color: colors.light.white,
  },
  ratedTrustBox: {
    backgroundColor: colors.light.successLight,
    borderWidth: 1,
    borderColor: colors.light.successLight,
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
    color: colors.light.success,
    flex: 1,
  },
  ratedStarBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: colors.light.warningLight,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
  },
  ratedStarText: {
    fontSize: 12,
    fontWeight: '800',
    color: colors.light.warning,
  },
  ratedFeedbackText: {
    fontSize: 12,
    color: colors.light.textPrimary,
    fontStyle: 'italic',
    marginTop: 4,
    marginLeft: 21,
  },
  rateRenterCtaBox: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: colors.light.warningLight,
    borderWidth: 1,
    borderColor: colors.light.warningLight,
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
    color: colors.light.warning,
  },
  rateRenterCtaSub: {
    fontSize: 11,
    color: colors.light.warning,
    marginTop: 2,
  },
  btnRateRenter: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: colors.light.warning,
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 8,
  },
  btnRateRenterText: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.light.white,
  },
});
