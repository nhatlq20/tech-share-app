import React from 'react';
import { StyleSheet, View, Text, TouchableOpacity, Image } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../../theme/colors';

interface BookingItemCardProps {
  booking: any;
  onPress: () => void;
  onCancel?: () => void;
}

const STATUS_CONFIG = {
  pending: { label: 'Chờ duyệt', color: colors.light.warning, icon: 'time-outline' },
  approved: { label: 'Đã duyệt', color: colors.light.primary, icon: 'checkmark-circle-outline' },
  active: { label: 'Đang thuê', color: colors.light.primary, icon: 'play-circle-outline' },
  completed: { label: 'Hoàn tất', color: colors.light.success, icon: 'star-outline' },
  cancelled: { label: 'Đã hủy', color: colors.light.error, icon: 'close-circle-outline' },
};

export function BookingItemCard({ booking, onPress, onCancel }: BookingItemCardProps) {
  const statusConfig = STATUS_CONFIG[booking.status as keyof typeof STATUS_CONFIG] || STATUS_CONFIG.pending;
  const deviceName = booking.deviceId?.name || 'Thiết bị';
  const deviceImage = booking.deviceId?.images?.[0] || 'https://via.placeholder.com/150';

  return (
    <TouchableOpacity style={styles.card} onPress={onPress} activeOpacity={0.8}>
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

      <View style={styles.footer}>
        <Text style={styles.totalLabel}>Tổng tiền:</Text>
        <Text style={styles.totalAmount}>
          {booking.totalAmount?.toLocaleString('vi-VN')} đ
        </Text>
      </View>
      
      {booking.status === 'pending' && onCancel && (
        <View style={styles.actionRow}>
          <TouchableOpacity
            style={styles.cancelButton}
            onPress={onCancel}
          >
            <Text style={styles.cancelButtonText}>Hủy đơn</Text>
          </TouchableOpacity>
        </View>
      )}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
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
    fontWeight: '600',
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
    marginBottom: 12,
  },
  image: {
    width: 72,
    height: 72,
    borderRadius: 8,
    backgroundColor: colors.light.background,
  },
  info: {
    flex: 1,
    justifyContent: 'center',
  },
  deviceName: {
    fontSize: 15,
    fontWeight: '600',
    color: colors.light.textPrimary,
    marginBottom: 8,
  },
  dateText: {
    fontSize: 12,
    color: colors.light.textSecondary,
    marginBottom: 2,
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderTopWidth: 1,
    borderTopColor: colors.light.border,
    paddingTop: 12,
  },
  totalLabel: {
    fontSize: 13,
    color: colors.light.textSecondary,
  },
  totalAmount: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.light.primary,
  },
  actionRow: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    borderTopWidth: 1,
    borderTopColor: colors.light.border,
    paddingTop: 12,
    marginTop: 12,
  },
  cancelButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.light.error,
  },
  cancelButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.light.error,
  },
});
