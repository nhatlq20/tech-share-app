import React from 'react';
import { StyleSheet, View, Text, TouchableOpacity, Image } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../../theme/colors';
import { RentalCountdownTimer } from './RentalCountdownTimer';
import { Booking } from '../../services/bookingService';

interface BookingItemCardProps {
  booking: Booking;
  onPress: () => void;
  onCancel?: () => void;
  onExtend?: () => void;
  onReview?: () => void;
  onReRent?: () => void;
}

const STATUS_CONFIG = {
  pending: { label: 'Chờ duyệt', color: colors.light.warning, icon: 'time-outline' },
  approved: { label: 'Đã duyệt', color: colors.light.primary, icon: 'checkmark-circle-outline' },
  active: { label: 'Đang thuê', color: colors.light.primary, icon: 'play-circle-outline' },
  completed: { label: 'Hoàn tất', color: colors.light.success, icon: 'star-outline' },
  cancelled: { label: 'Đã hủy', color: colors.light.error, icon: 'close-circle-outline' },
  rejected: { label: 'Từ chối', color: colors.light.error, icon: 'close-circle-outline' },
};

export function BookingItemCard({ booking, onPress, onCancel, onExtend, onReview, onReRent }: BookingItemCardProps) {
  const statusConfig = STATUS_CONFIG[booking.status as keyof typeof STATUS_CONFIG] || STATUS_CONFIG.pending;
  const deviceName = booking.deviceId?.name || 'Thiết bị';
  const deviceImage = booking.deviceId?.images?.[0] || 'https://via.placeholder.com/150';
  const isActive = booking.status === 'active';
  const isPendingExtension = booking.extensionRequest?.status === 'pending';
  const isApprovedExtension = booking.extensionRequest?.status === 'approved';

  return (
    <TouchableOpacity style={styles.card} onPress={onPress} activeOpacity={0.85}>
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <Ionicons name="receipt-outline" size={16} color={colors.light.textSecondary} />
          <Text style={styles.bookingCode}>#{booking.bookingCode}</Text>
        </View>
        <View style={[styles.statusBadge, { backgroundColor: statusConfig.color + '20' }]}>
          <Ionicons name={statusConfig.icon as any} size={14} color={statusConfig.color} />
          <Text style={[styles.statusText, { color: statusConfig.color }]}>{statusConfig.label}</Text>
        </View>
      </View>

      {/* Body: Image & Info */}
      <View style={styles.body}>
        <Image source={{ uri: deviceImage }} style={styles.image} />
        <View style={styles.info}>
          <Text style={styles.deviceName} numberOfLines={2}>
            {deviceName}
          </Text>
          <Text style={styles.dateText}>
            Từ: {new Date(booking.startDate).toLocaleDateString('vi-VN')}
          </Text>
          <Text style={styles.dateText}>
            Đến: {new Date(booking.endDate).toLocaleDateString('vi-VN')} ({booking.totalDays} ngày)
          </Text>
        </View>
      </View>

      {/* Countdown Timer for active rentals */}
      {isActive && (
        <View style={styles.timerWrapper}>
          <RentalCountdownTimer endDate={booking.endDate} />
        </View>
      )}

      {/* Extension status indicator */}
      {isPendingExtension && (
        <View style={styles.extensionPendingTag}>
          <Ionicons name="hourglass" size={14} color="#D97706" />
          <Text style={styles.extensionPendingText}>
            Đang chờ duyệt gia hạn +{booking.extensionRequest?.requestedDays} ngày (+
            {booking.extensionRequest?.additionalFee?.toLocaleString('vi-VN')} đ)
          </Text>
        </View>
      )}

      {isApprovedExtension && (
        <View style={styles.extensionApprovedTag}>
          <Ionicons name="checkmark-circle" size={14} color="#16A34A" />
          <Text style={styles.extensionApprovedText}>
            Đã gia hạn thành công (+{booking.extensionRequest?.requestedDays} ngày)
          </Text>
        </View>
      )}

      {/* Footer Total */}
      <View style={styles.footer}>
        <Text style={styles.totalLabel}>Tổng tiền:</Text>
        <Text style={styles.totalAmount}>
          {booking.totalAmount?.toLocaleString('vi-VN')} đ
        </Text>
      </View>

      {/* Action Row */}
      {(booking.status === 'pending' || isActive || booking.status === 'completed') && (
        <View style={styles.actionRow}>
          {booking.status === 'pending' && onCancel && (
            <TouchableOpacity style={styles.cancelButton} onPress={onCancel}>
              <Ionicons name="close-circle-outline" size={15} color={colors.light.error} />
              <Text style={styles.cancelButtonText}>Hủy đơn</Text>
            </TouchableOpacity>
          )}

          {isActive && onExtend && (
            <TouchableOpacity
              style={[
                styles.extendButton,
                isPendingExtension && styles.extendButtonDisabled,
              ]}
              onPress={onExtend}
              disabled={isPendingExtension}
            >
              <Ionicons
                name={isPendingExtension ? 'time-outline' : 'calendar-outline'}
                size={15}
                color={isPendingExtension ? colors.light.textSecondary : colors.light.primary}
              />
              <Text
                style={[
                  styles.extendButtonText,
                  isPendingExtension && styles.extendButtonTextDisabled,
                ]}
              >
                {isPendingExtension ? 'Chờ duyệt gia hạn' : 'Gia hạn thuê'}
              </Text>
            </TouchableOpacity>
          )}

          {booking.status === 'completed' && (
            booking.isReviewed ? (
              <View style={styles.completedActions}>
                <View style={styles.reviewedBadge}>
                  <Ionicons name="checkmark-done-circle" size={15} color={colors.light.success} />
                  <Text style={styles.reviewedBadgeText}>Đã đánh giá</Text>
                </View>
                {onReRent && (
                  <TouchableOpacity style={styles.reRentButton} onPress={onReRent} activeOpacity={0.8}>
                    <Ionicons name="repeat" size={15} color="#FFFFFF" />
                    <Text style={styles.reRentButtonText}>Thuê lại</Text>
                  </TouchableOpacity>
                )}
              </View>
            ) : onReview ? (
              <TouchableOpacity style={styles.reviewButton} onPress={onReview}>
                <Ionicons name="star" size={14} color="#FFFFFF" />
                <Text style={styles.reviewButtonText}>Đánh giá dịch vụ</Text>
              </TouchableOpacity>
            ) : null
          )}
        </View>
      )}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    padding: 16,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: colors.light.border,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 6,
    elevation: 2,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: colors.light.border,
    paddingBottom: 8,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  bookingCode: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.light.textPrimary,
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  statusText: {
    fontSize: 12,
    fontWeight: '600',
  },
  body: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 8,
  },
  image: {
    width: 76,
    height: 76,
    borderRadius: 10,
    backgroundColor: colors.light.background,
  },
  info: {
    flex: 1,
    justifyContent: 'center',
  },
  deviceName: {
    fontSize: 15,
    fontWeight: '700',
    color: colors.light.textPrimary,
    marginBottom: 6,
  },
  dateText: {
    fontSize: 12,
    color: colors.light.textSecondary,
    marginBottom: 2,
  },
  timerWrapper: {
    marginTop: 4,
    marginBottom: 4,
  },
  extensionPendingTag: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#FEF3C7',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    marginTop: 6,
    marginBottom: 4,
  },
  extensionPendingText: {
    fontSize: 12,
    color: '#92400E',
    fontWeight: '600',
    flex: 1,
  },
  extensionApprovedTag: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#DCFCE7',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    marginTop: 6,
    marginBottom: 4,
  },
  extensionApprovedText: {
    fontSize: 12,
    color: '#15803D',
    fontWeight: '600',
    flex: 1,
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderTopWidth: 1,
    borderTopColor: colors.light.border,
    paddingTop: 10,
    marginTop: 6,
  },
  totalLabel: {
    fontSize: 13,
    color: colors.light.textSecondary,
  },
  totalAmount: {
    fontSize: 16,
    fontWeight: '800',
    color: colors.light.primary,
  },
  actionRow: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    alignItems: 'center',
    gap: 8,
    borderTopWidth: 1,
    borderTopColor: colors.light.border,
    paddingTop: 10,
    marginTop: 10,
  },
  cancelButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.light.error,
  },
  cancelButtonText: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.light.error,
  },
  extendButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.light.primary,
    backgroundColor: colors.light.primaryLight + '30',
  },
  extendButtonDisabled: {
    borderColor: colors.light.border,
    backgroundColor: colors.light.surface,
  },
  extendButtonText: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.light.primary,
  },
  extendButtonTextDisabled: {
    color: colors.light.textSecondary,
    fontWeight: '600',
  },
  reviewButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 8,
    backgroundColor: '#F59E0B',
  },
  reviewButtonText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  reviewedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    backgroundColor: '#DCFCE7',
  },
  reviewedBadgeText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#15803D',
  },
  completedActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  reRentButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    backgroundColor: colors.light.primary,
  },
  reRentButtonText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#FFFFFF',
  },
});
