import React, { useState, useMemo } from 'react';
import {
  StyleSheet,
  View,
  Text,
  Modal,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../../theme/colors';
import { bookingService, Booking } from '../../services/bookingService';

interface ExtensionModalProps {
  visible: boolean;
  onClose: () => void;
  booking: Booking | null;
  onSuccess: () => void;
}

const QUICK_DAY_OPTIONS = [1, 2, 3, 5, 7];

export function ExtensionModal({
  visible,
  onClose,
  booking,
  onSuccess,
}: ExtensionModalProps) {
  const [additionalDays, setAdditionalDays] = useState(1);
  const [loading, setLoading] = useState(false);

  // Daily rate estimate
  const dailyRate = useMemo(() => {
    if (!booking) return 0;
    if (booking.pricePerDayAtBooking) return booking.pricePerDayAtBooking;
    if (booking.deviceId?.pricePerDay) return booking.deviceId.pricePerDay;
    if (booking.deviceId?.dailyRate) return booking.deviceId.dailyRate;
    if (booking.totalDays && booking.totalAmount) {
      return Math.round(booking.totalAmount / booking.totalDays);
    }
    return 100000;
  }, [booking]);

  // Current and new end dates
  const { currentEndDateStr, newEndDateStr, additionalFee } = useMemo(() => {
    if (!booking || !booking.endDate) {
      return { currentEndDateStr: '', newEndDateStr: '', additionalFee: 0 };
    }

    const currentEnd = new Date(booking.endDate);
    const newEnd = new Date(currentEnd.getTime() + additionalDays * 24 * 60 * 60 * 1000);

    const fee = additionalDays * dailyRate;

    return {
      currentEndDateStr: currentEnd.toLocaleDateString('vi-VN', {
        weekday: 'short',
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
      }),
      newEndDateStr: newEnd.toLocaleDateString('vi-VN', {
        weekday: 'short',
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
      }),
      additionalFee: fee,
    };
  }, [booking, additionalDays, dailyRate]);

  const isPendingExtension = booking?.extensionRequest?.status === 'pending';

  const handleIncrement = () => {
    setAdditionalDays((prev: number) => Math.min(prev + 1, 30));
  };

  const handleDecrement = () => {
    setAdditionalDays((prev: number) => Math.max(prev - 1, 1));
  };

  const handleSubmit = async () => {
    if (!booking) return;

    try {
      setLoading(true);
      await bookingService.requestExtension(booking._id, additionalDays);
      Alert.alert(
        'Đã gửi yêu cầu! ⏳',
        `Yêu cầu gia hạn thêm ${additionalDays} ngày đã được chuyển đến chủ máy. Bạn sẽ nhận được thông báo khi chủ máy phê duyệt.`,
        [
          {
            text: 'Đã hiểu',
            onPress: () => {
              onClose();
              onSuccess();
            },
          },
        ]
      );
    } catch (error: any) {
      const msg = error.response?.data?.message || 'Không thể gửi yêu cầu gia hạn lúc này';
      Alert.alert('Không thành công', msg);
    } finally {
      setLoading(false);
    }
  };

  if (!booking) return null;

  return (
    <Modal visible={visible} transparent={true} animationType="slide" onRequestClose={onClose}>
      <View style={styles.overlay}>
        <View style={styles.container}>
          {/* Header */}
          <View style={styles.header}>
            <View style={styles.headerIcon}>
              <Ionicons name="calendar" size={22} color={colors.light.primary} />
            </View>
            <View style={styles.headerTextContainer}>
              <Text style={styles.title}>Yêu cầu gia hạn thuê</Text>
              <Text style={styles.subtitle}>Đơn hàng #{booking.bookingCode}</Text>
            </View>
            <TouchableOpacity onPress={onClose} style={styles.closeButton}>
              <Ionicons name="close" size={22} color={colors.light.textSecondary} />
            </TouchableOpacity>
          </View>

          {isPendingExtension ? (
            <View style={styles.pendingNotice}>
              <Ionicons name="time" size={28} color={colors.light.warning} />
              <Text style={styles.pendingTitle}>Yêu cầu gia hạn đang chờ duyệt</Text>
              <Text style={styles.pendingDesc}>
                Bạn đã gửi yêu cầu thuê thêm {booking.extensionRequest?.requestedDays} ngày. Vui lòng
                chờ chủ máy phản hồi trước khi gửi yêu cầu mới.
              </Text>
              <TouchableOpacity style={styles.closeActionButton} onPress={onClose}>
                <Text style={styles.closeActionButtonText}>Đã hiểu</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <>
              {/* Stepper chọn số ngày */}
              <View style={styles.section}>
                <Text style={styles.sectionLabel}>Chọn số ngày muốn gia hạn thêm:</Text>
                <View style={styles.stepperRow}>
                  <TouchableOpacity
                    style={[styles.stepBtn, additionalDays <= 1 && styles.stepBtnDisabled]}
                    onPress={handleDecrement}
                    disabled={additionalDays <= 1}
                  >
                    <Ionicons name="remove" size={20} color={additionalDays <= 1 ? '#CBD5E1' : colors.light.textPrimary} />
                  </TouchableOpacity>

                  <View style={styles.stepValueBox}>
                    <Text style={styles.stepValueText}>+{additionalDays}</Text>
                    <Text style={styles.stepValueSub}>ngày</Text>
                  </View>

                  <TouchableOpacity
                    style={[styles.stepBtn, additionalDays >= 30 && styles.stepBtnDisabled]}
                    onPress={handleIncrement}
                    disabled={additionalDays >= 30}
                  >
                    <Ionicons name="add" size={20} color={additionalDays >= 30 ? '#CBD5E1' : colors.light.textPrimary} />
                  </TouchableOpacity>
                </View>

                {/* Quick Chips */}
                <View style={styles.chipsContainer}>
                  {QUICK_DAY_OPTIONS.map((days) => {
                    const isSelected = additionalDays === days;
                    return (
                      <TouchableOpacity
                        key={days}
                        style={[styles.chip, isSelected && styles.chipSelected]}
                        onPress={() => setAdditionalDays(days)}
                      >
                        <Text style={[styles.chipText, isSelected && styles.chipTextSelected]}>
                          +{days} ngày
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>
              </View>

              {/* Preview Card */}
              <View style={styles.previewCard}>
                <View style={styles.previewRow}>
                  <Text style={styles.previewLabel}>Hạn trả hiện tại:</Text>
                  <Text style={styles.previewValue}>{currentEndDateStr}</Text>
                </View>

                <View style={styles.previewRow}>
                  <Text style={styles.previewLabel}>Hạn trả mới dự kiến:</Text>
                  <Text style={[styles.previewValue, styles.previewHighlight]}>
                    {newEndDateStr}
                  </Text>
                </View>

                <View style={styles.divider} />

                <View style={styles.previewRow}>
                  <Text style={styles.previewLabel}>Đơn giá theo ngày:</Text>
                  <Text style={styles.previewValue}>
                    {dailyRate.toLocaleString('vi-VN')} đ/ngày
                  </Text>
                </View>

                <View style={styles.previewRow}>
                  <Text style={styles.previewFeeLabel}>Phụ phí gia hạn phát sinh:</Text>
                  <Text style={styles.previewFeeValue}>
                    +{additionalFee.toLocaleString('vi-VN')} đ
                  </Text>
                </View>
              </View>

              <Text style={styles.noticeText}>
                💡 Yêu cầu gia hạn sẽ được gửi đến chủ máy. Thời gian hoàn trả và phụ phí phát sinh
                sẽ chính thức được cập nhật sau khi chủ máy phê duyệt.
              </Text>

              {/* Action Buttons */}
              <View style={styles.actions}>
                <TouchableOpacity
                  style={styles.cancelBtn}
                  onPress={onClose}
                  disabled={loading}
                >
                  <Text style={styles.cancelBtnText}>Bỏ qua</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.confirmBtn, loading && { opacity: 0.7 }]}
                  onPress={handleSubmit}
                  disabled={loading}
                >
                  {loading ? (
                    <ActivityIndicator size="small" color="#FFFFFF" />
                  ) : (
                    <>
                      <Ionicons name="paper-plane" size={16} color="#FFFFFF" />
                      <Text style={styles.confirmBtnText}>Gửi yêu cầu gia hạn</Text>
                    </>
                  )}
                </TouchableOpacity>
              </View>
            </>
          )}
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.6)',
    justifyContent: 'flex-end',
  },
  container: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 20,
    paddingBottom: 32,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.1,
    shadowRadius: 10,
    elevation: 10,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
  },
  headerIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.light.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  headerTextContainer: {
    flex: 1,
  },
  title: {
    fontSize: 18,
    fontWeight: '800',
    color: colors.light.textPrimary,
  },
  subtitle: {
    fontSize: 13,
    color: colors.light.textSecondary,
    marginTop: 2,
  },
  closeButton: {
    padding: 4,
  },
  section: {
    marginBottom: 16,
  },
  sectionLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.light.textPrimary,
    marginBottom: 12,
  },
  stepperRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 16,
    marginBottom: 12,
  },
  stepBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: colors.light.surface,
    borderWidth: 1,
    borderColor: colors.light.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepBtnDisabled: {
    opacity: 0.4,
  },
  stepValueBox: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 4,
    paddingHorizontal: 20,
    paddingVertical: 6,
    backgroundColor: colors.light.primaryLight + '40',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.light.primaryLight,
  },
  stepValueText: {
    fontSize: 26,
    fontWeight: '800',
    color: colors.light.primaryDark,
  },
  stepValueSub: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.light.primaryDark,
  },
  chipsContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 8,
  },
  chip: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    backgroundColor: colors.light.surface,
    borderWidth: 1,
    borderColor: colors.light.border,
  },
  chipSelected: {
    backgroundColor: colors.light.primary,
    borderColor: colors.light.primary,
  },
  chipText: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.light.textSecondary,
  },
  chipTextSelected: {
    color: '#FFFFFF',
  },
  previewCard: {
    backgroundColor: colors.light.surface,
    borderRadius: 12,
    padding: 14,
    borderWidth: 1,
    borderColor: colors.light.border,
    marginBottom: 12,
  },
  previewRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginVertical: 4,
  },
  previewLabel: {
    fontSize: 13,
    color: colors.light.textSecondary,
  },
  previewValue: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.light.textPrimary,
  },
  previewHighlight: {
    color: colors.light.primary,
    fontWeight: '700',
  },
  divider: {
    height: 1,
    backgroundColor: colors.light.border,
    marginVertical: 8,
  },
  previewFeeLabel: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.light.textPrimary,
  },
  previewFeeValue: {
    fontSize: 16,
    fontWeight: '800',
    color: colors.light.primary,
  },
  noticeText: {
    fontSize: 12,
    color: colors.light.textSecondary,
    lineHeight: 18,
    marginBottom: 20,
  },
  actions: {
    flexDirection: 'row',
    gap: 12,
  },
  cancelBtn: {
    flex: 1,
    paddingVertical: 13,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 12,
    backgroundColor: colors.light.surface,
    borderWidth: 1,
    borderColor: colors.light.border,
  },
  cancelBtnText: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.light.textSecondary,
  },
  confirmBtn: {
    flex: 2,
    flexDirection: 'row',
    paddingVertical: 13,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    borderRadius: 12,
    backgroundColor: colors.light.primary,
  },
  confirmBtnText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  pendingNotice: {
    alignItems: 'center',
    paddingVertical: 24,
    paddingHorizontal: 16,
  },
  pendingTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.light.textPrimary,
    marginTop: 12,
    marginBottom: 6,
  },
  pendingDesc: {
    fontSize: 13,
    color: colors.light.textSecondary,
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 20,
  },
  closeActionButton: {
    backgroundColor: colors.light.primary,
    paddingHorizontal: 24,
    paddingVertical: 10,
    borderRadius: 10,
  },
  closeActionButtonText: {
    color: '#FFFFFF',
    fontWeight: '700',
    fontSize: 14,
  },
});
