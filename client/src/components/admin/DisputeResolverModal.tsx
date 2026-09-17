import React, { useState, useEffect } from 'react';
import {
  StyleSheet,
  View,
  Text,
  Modal,
  TouchableOpacity,
  ScrollView,
  Image,
  TextInput,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../../theme/colors';
import { DisputeItem, DisputeDecision } from '../../types';
import { adminService } from '../../services/adminService';

interface DisputeResolverModalProps {
  visible: boolean;
  dispute: DisputeItem | null;
  onClose: () => void;
  onResolved: (
    disputeId: string,
    decision: DisputeDecision,
    deductAmount: number,
    refundAmount: number
  ) => void;
}

export function DisputeResolverModal({
  visible,
  dispute,
  onClose,
  onResolved,
}: DisputeResolverModalProps) {
  const [decision, setDecision] = useState('partial_deduct' as DisputeDecision);
  const [deductAmountText, setDeductAmountText] = useState('');
  const [adminNote, setAdminNote] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (dispute) {
      setDecision('partial_deduct');
      setDeductAmountText(String(dispute.requestedDeductAmount || 1500000));
      setAdminNote('');
    }
  }, [dispute]);

  if (!dispute) return null;

  const booking = dispute.bookingId;
  const depositFee = booking?.depositFee || 0;
  const requestedAmount = dispute.requestedDeductAmount || 0;

  // Tính toán số tiền bồi thường và hoàn trả dựa trên lựa chọn
  let finalDeduct = 0;
  let finalRefund = depositFee;

  if (decision === 'full_refund') {
    finalDeduct = 0;
    finalRefund = depositFee;
  } else if (decision === 'full_deduct') {
    finalDeduct = depositFee;
    finalRefund = 0;
  } else if (decision === 'partial_deduct') {
    const raw = Number(deductAmountText.replace(/[^0-9]/g, '')) || 0;
    finalDeduct = Math.min(Math.max(raw, 0), depositFee);
    finalRefund = depositFee - finalDeduct;
  }

  // Lấy ảnh trước và sau thuê
  const beforeImages = booking?.handoverPhotos?.beforeRental?.length
    ? booking.handoverPhotos.beforeRental
    : ['https://images.unsplash.com/photo-1516035069371-29a1b244cc32?w=800'];

  const afterImages = [
    ...(booking?.handoverPhotos?.afterRental || []),
    ...(dispute.evidenceImages || []),
  ];
  if (afterImages.length === 0) {
    afterImages.push('https://images.unsplash.com/photo-1502920917128-1aa500764cbd?w=800');
  }

  const handleSubmitResolution = async () => {
    Alert.alert(
      'Xác nhận ban hành phán quyết',
      `Bạn có chắc chắn muốn giải quyết tranh chấp đơn #${booking?.bookingCode || ''}?\n\n• Bồi thường chủ máy: ${finalDeduct.toLocaleString('vi-VN')} đ\n• Hoàn lại khách thuê: ${finalRefund.toLocaleString('vi-VN')} đ\n\nTiền ký quỹ sẽ được điều chuyển ngay lập tức.`,
      [
        { text: 'Hủy', style: 'cancel' },
        {
          text: 'Xác nhận thi hành',
          onPress: async () => {
            setLoading(true);
            try {
              const res = await adminService.resolveDispute(dispute._id, {
                decision,
                finalDeductAmount: finalDeduct,
                note: adminNote || `Admin phán quyết: ${decision}`,
              });

              if (res && res.success) {
                Alert.alert(
                  'Thành công! 🎉',
                  'Đã ban hành phán quyết trọng tài và điều chuyển tiền ký quỹ thành công.'
                );
                onResolved(dispute._id, decision, finalDeduct, finalRefund);
                onClose();
              } else {
                Alert.alert('Thông báo', res?.message || 'Không thể giải quyết tranh chấp.');
              }
            } catch (err: any) {
              Alert.alert('Lỗi', err.message || 'Đã có lỗi xảy ra khi gọi API.');
            } finally {
              setLoading(false);
            }
          },
        },
      ]
    );
  };

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <View style={styles.modalOverlay}>
        <View style={styles.modalContainer}>
          {/* Header */}
          <View style={styles.modalHeader}>
            <View style={styles.modalTitleRow}>
              <View style={styles.scaleIconWrapper}>
                <Ionicons name="scale-outline" size={20} color={colors.light.primary} />
              </View>
              <View>
                <Text style={styles.modalTitle}>Phân Xử Tranh Chấp Tiền Cọc</Text>
                <Text style={styles.modalSubtitle}>
                  Đơn #{booking?.bookingCode} • {booking?.deviceId?.name || 'Thiết bị'}
                </Text>
              </View>
            </View>
            <TouchableOpacity onPress={onClose} style={styles.closeBtn} activeOpacity={0.7}>
              <Ionicons name="close" size={22} color={colors.light.textSecondary} />
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.modalScroll} showsVerticalScrollIndicator={false}>
            {/* Thông tin 2 bên và số tiền cọc */}
            <View style={styles.partiesCard}>
              <View style={styles.partyItem}>
                <Text style={styles.partyRoleLabel}>Chủ máy (Bên yêu cầu)</Text>
                <Text style={styles.partyName}>{booking?.ownerId?.name || 'Chủ máy'}</Text>
                <Text style={styles.partyPhone}>{booking?.ownerId?.phone || '0912345678'}</Text>
              </View>
              <View style={styles.partyDivider} />
              <View style={styles.partyItem}>
                <Text style={styles.partyRoleLabel}>Khách thuê (Bên thuê)</Text>
                <Text style={styles.partyName}>{booking?.renterId?.name || 'Khách thuê'}</Text>
                <Text style={styles.partyPhone}>{booking?.renterId?.phone || '0901234567'}</Text>
              </View>
            </View>

            {/* Hộp Tài chính Ký quỹ */}
            <View style={styles.escrowCard}>
              <View style={styles.escrowCol}>
                <Text style={styles.escrowLabel}>Tổng tiền cọc Escrow giữ</Text>
                <Text style={styles.escrowValuePrimary}>
                  {depositFee.toLocaleString('vi-VN')} đ
                </Text>
              </View>
              <View style={styles.escrowCol}>
                <Text style={styles.escrowLabel}>Chủ máy yêu cầu trừ cọc</Text>
                <Text style={styles.escrowValueWarning}>
                  {requestedAmount.toLocaleString('vi-VN')} đ
                </Text>
              </View>
            </View>

            {/* Lý do tranh chấp */}
            <View style={styles.reasonBox}>
              <View style={styles.reasonHeader}>
                <Ionicons name="chatbox-ellipses-outline" size={16} color={colors.light.error} />
                <Text style={styles.reasonTitle}>Nội dung khiếu nại từ chủ máy:</Text>
              </View>
              <Text style={styles.reasonContent}>"{dispute.reason}"</Text>
            </View>

            {/* ĐỐI CHIẾU ẢNH 2 CỘT */}
            <Text style={styles.sectionHeading}>📸 ĐỐI CHIẾU HÌNH ẢNH TRƯỚC VÀ SAU THUÊ</Text>
            <View style={styles.comparisonGrid}>
              {/* Cột trái: Ảnh lúc bàn giao trước thuê */}
              <View style={styles.comparisonCol}>
                <View style={styles.colHeaderRow}>
                  <Ionicons name="checkmark-circle" size={14} color={colors.light.success} />
                  <Text style={styles.colHeaderGreen}>Ảnh trước bàn giao</Text>
                </View>
                <Image source={{ uri: beforeImages[0] }} style={styles.proofImg} />
                <View style={styles.proofBadgeGreen}>
                  <Text style={styles.proofBadgeGreenText}>Nguyên vẹn lúc nhận máy</Text>
                </View>
              </View>

              {/* Cột phải: Ảnh thu hồi sau thuê & Bằng chứng */}
              <View style={styles.comparisonCol}>
                <View style={styles.colHeaderRow}>
                  <Ionicons name="alert-circle" size={14} color={colors.light.error} />
                  <Text style={styles.colHeaderRed}>Ảnh thu hồi & Bằng chứng</Text>
                </View>
                <Image source={{ uri: afterImages[0] }} style={styles.proofImg} />
                <View style={styles.proofBadgeRed}>
                  <Text style={styles.proofBadgeRedText}>Tổn hại sau sử dụng</Text>
                </View>
              </View>
            </View>

            {/* 3 LỰA CHỌN PHÁN QUYẾT */}
            <Text style={styles.sectionHeading}>⚖️ PHÁN QUYẾT CỦA QUẢN TRỊ VIÊN</Text>

            {/* Lựa chọn 1: Trừ một phần (Khuyến nghị cho trường hợp trầy xước nhẹ) */}
            <TouchableOpacity
              style={[
                styles.choiceCard,
                decision === 'partial_deduct' && styles.choiceCardSelected,
              ]}
              onPress={() => setDecision('partial_deduct')}
              activeOpacity={0.8}
            >
              <View style={styles.choiceHeaderRow}>
                <View
                  style={[
                    styles.radioCircle,
                    decision === 'partial_deduct' && styles.radioCircleActive,
                  ]}
                >
                  {decision === 'partial_deduct' && <View style={styles.radioDot} />}
                </View>
                <View style={styles.choiceTitleCol}>
                  <Text style={styles.choiceTitle}>Trừ một phần cọc bồi thường chủ máy</Text>
                  <Text style={styles.choiceDesc}>
                    Chủ máy nhận tiền bồi thường sửa chữa, phần cọc còn lại hoàn trả khách thuê.
                  </Text>
                </View>
              </View>

              {decision === 'partial_deduct' && (
                <View style={styles.deductInputBox}>
                  <Text style={styles.inputLabel}>Nhập số tiền trừ cọc đền bù chủ máy (VNĐ):</Text>
                  <View style={styles.inputRow}>
                    <TextInput
                      style={styles.numericInput}
                      keyboardType="numeric"
                      value={deductAmountText}
                      onChangeText={(val: string) => setDeductAmountText(val)}
                      placeholder="Nhập số tiền (ví dụ: 1500000)"
                      placeholderTextColor={colors.light.textSecondary}
                    />
                    <Text style={styles.currencySuffix}>đ</Text>
                  </View>

                  {/* Bảng tính toán tức thì */}
                  <View style={styles.calculationPreview}>
                    <View style={styles.calcRow}>
                      <Text style={styles.calcLabel}>Chủ máy nhận đền bù:</Text>
                      <Text style={styles.calcValueOwner}>
                        +{finalDeduct.toLocaleString('vi-VN')} đ
                      </Text>
                    </View>
                    <View style={styles.calcRow}>
                      <Text style={styles.calcLabel}>Khách thuê được hoàn lại:</Text>
                      <Text style={styles.calcValueRenter}>
                        +{finalRefund.toLocaleString('vi-VN')} đ
                      </Text>
                    </View>
                  </View>
                </View>
              )}
            </TouchableOpacity>

            {/* Lựa chọn 2: Hoàn 100% cọc cho khách */}
            <TouchableOpacity
              style={[styles.choiceCard, decision === 'full_refund' && styles.choiceCardSelected]}
              onPress={() => setDecision('full_refund')}
              activeOpacity={0.8}
            >
              <View style={styles.choiceHeaderRow}>
                <View
                  style={[
                    styles.radioCircle,
                    decision === 'full_refund' && styles.radioCircleActive,
                  ]}
                >
                  {decision === 'full_refund' && <View style={styles.radioDot} />}
                </View>
                <View style={styles.choiceTitleCol}>
                  <Text style={styles.choiceTitle}>Hoàn 100% Cọc cho Khách thuê</Text>
                  <Text style={styles.choiceDesc}>
                    Bằng chứng không đủ cơ sở hoặc thiết bị hao mòn tự nhiên. Khách nhận lại toàn bộ{' '}
                    {depositFee.toLocaleString('vi-VN')} đ.
                  </Text>
                </View>
              </View>
            </TouchableOpacity>

            {/* Lựa chọn 3: Trừ 100% cọc đền bù chủ máy */}
            <TouchableOpacity
              style={[styles.choiceCard, decision === 'full_deduct' && styles.choiceCardSelected]}
              onPress={() => setDecision('full_deduct')}
              activeOpacity={0.8}
            >
              <View style={styles.choiceHeaderRow}>
                <View
                  style={[
                    styles.radioCircle,
                    decision === 'full_deduct' && styles.radioCircleActive,
                  ]}
                >
                  {decision === 'full_deduct' && <View style={styles.radioDot} />}
                </View>
                <View style={styles.choiceTitleCol}>
                  <Text style={styles.choiceTitle}>Trừ 100% Cọc bồi thường Chủ máy</Text>
                  <Text style={styles.choiceDesc}>
                    Thiết bị hỏng hóc nặng hoặc mất mát linh kiện. Chủ máy nhận toàn bộ{' '}
                    {depositFee.toLocaleString('vi-VN')} đ.
                  </Text>
                </View>
              </View>
            </TouchableOpacity>

            {/* Ghi chú của Admin */}
            <View style={styles.noteInputBox}>
              <Text style={styles.inputLabel}>Ghi chú biên bản phán quyết (tùy chọn):</Text>
              <TextInput
                style={styles.textNoteInput}
                multiline
                numberOfLines={2}
                value={adminNote}
                onChangeText={setAdminNote}
                placeholder="Ghi rõ lý do phán quyết để thông báo cho cả 2 bên..."
                placeholderTextColor={colors.light.textSecondary}
              />
            </View>
          </ScrollView>

          {/* Footer Action Buttons */}
          <View style={styles.modalFooter}>
            <TouchableOpacity
              style={styles.btnCancel}
              onPress={onClose}
              disabled={loading}
              activeOpacity={0.8}
            >
              <Text style={styles.btnCancelText}>Đóng</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.btnSubmit}
              onPress={handleSubmitResolution}
              disabled={loading}
              activeOpacity={0.8}
            >
              {loading ? (
                <ActivityIndicator color="#FFFFFF" size="small" />
              ) : (
                <>
                  <Ionicons name="shield-checkmark" size={18} color="#FFFFFF" />
                  <Text style={styles.btnSubmitText}>Ban hành Phán Quyết</Text>
                </>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.65)',
    justifyContent: 'flex-end',
  },
  modalContainer: {
    backgroundColor: colors.light.background,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: '90%',
    paddingBottom: 20,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: 18,
    paddingBottom: 14,
    borderBottomWidth: 1,
    borderBottomColor: colors.light.border,
  },
  modalTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flex: 1,
  },
  scaleIconWrapper: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: colors.light.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.light.textPrimary,
  },
  modalSubtitle: {
    fontSize: 12,
    color: colors.light.textSecondary,
    marginTop: 2,
  },
  closeBtn: {
    padding: 6,
  },
  modalScroll: {
    paddingHorizontal: 20,
    paddingTop: 16,
  },
  partiesCard: {
    flexDirection: 'row',
    backgroundColor: colors.light.surface,
    borderRadius: 12,
    padding: 12,
    borderWidth: 1,
    borderColor: colors.light.border,
    marginBottom: 12,
  },
  partyItem: {
    flex: 1,
  },
  partyDivider: {
    width: 1,
    backgroundColor: colors.light.border,
    marginHorizontal: 12,
  },
  partyRoleLabel: {
    fontSize: 11,
    color: colors.light.textSecondary,
    marginBottom: 2,
  },
  partyName: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.light.textPrimary,
  },
  partyPhone: {
    fontSize: 11,
    color: colors.light.textSecondary,
    marginTop: 2,
  },
  escrowCard: {
    flexDirection: 'row',
    backgroundColor: colors.light.surface,
    borderRadius: 12,
    padding: 14,
    borderWidth: 1,
    borderColor: colors.light.border,
    marginBottom: 12,
    gap: 12,
  },
  escrowCol: {
    flex: 1,
  },
  escrowLabel: {
    fontSize: 11,
    color: colors.light.textSecondary,
    marginBottom: 4,
  },
  escrowValuePrimary: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.light.primary,
  },
  escrowValueWarning: {
    fontSize: 16,
    fontWeight: '700',
    color: '#D97706',
  },
  reasonBox: {
    backgroundColor: '#FEF2F2',
    borderRadius: 10,
    padding: 12,
    borderWidth: 1,
    borderColor: '#FEE2E2',
    marginBottom: 16,
  },
  reasonHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 4,
  },
  reasonTitle: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.light.error,
  },
  reasonContent: {
    fontSize: 12,
    color: '#991B1B',
    lineHeight: 18,
    fontStyle: 'italic',
  },
  sectionHeading: {
    fontSize: 11,
    fontWeight: '700',
    color: colors.light.textSecondary,
    letterSpacing: 0.5,
    marginBottom: 10,
    marginTop: 6,
  },
  comparisonGrid: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 18,
  },
  comparisonCol: {
    flex: 1,
    backgroundColor: colors.light.surface,
    borderRadius: 10,
    padding: 8,
    borderWidth: 1,
    borderColor: colors.light.border,
  },
  colHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginBottom: 6,
  },
  colHeaderGreen: {
    fontSize: 10,
    fontWeight: '700',
    color: colors.light.success,
  },
  colHeaderRed: {
    fontSize: 10,
    fontWeight: '700',
    color: colors.light.error,
  },
  proofImg: {
    width: '100%',
    height: 100,
    borderRadius: 8,
    backgroundColor: colors.light.border,
    marginBottom: 6,
  },
  proofBadgeGreen: {
    backgroundColor: '#DCFCE7',
    paddingVertical: 3,
    paddingHorizontal: 6,
    borderRadius: 4,
    alignItems: 'center',
  },
  proofBadgeGreenText: {
    fontSize: 9,
    fontWeight: '700',
    color: '#15803D',
  },
  proofBadgeRed: {
    backgroundColor: '#FEE2E2',
    paddingVertical: 3,
    paddingHorizontal: 6,
    borderRadius: 4,
    alignItems: 'center',
  },
  proofBadgeRedText: {
    fontSize: 9,
    fontWeight: '700',
    color: colors.light.error,
  },
  choiceCard: {
    backgroundColor: colors.light.surface,
    borderRadius: 12,
    padding: 14,
    borderWidth: 1.5,
    borderColor: colors.light.border,
    marginBottom: 10,
  },
  choiceCardSelected: {
    borderColor: colors.light.primary,
    backgroundColor: '#F0F7FF',
  },
  choiceHeaderRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
  },
  radioCircle: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: colors.light.border,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 2,
  },
  radioCircleActive: {
    borderColor: colors.light.primary,
  },
  radioDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: colors.light.primary,
  },
  choiceTitleCol: {
    flex: 1,
  },
  choiceTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.light.textPrimary,
    marginBottom: 2,
  },
  choiceDesc: {
    fontSize: 11,
    color: colors.light.textSecondary,
    lineHeight: 16,
  },
  deductInputBox: {
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: colors.light.border,
  },
  inputLabel: {
    fontSize: 11,
    fontWeight: '600',
    color: colors.light.textPrimary,
    marginBottom: 6,
  },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.light.background,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.light.border,
    paddingHorizontal: 12,
    marginBottom: 10,
  },
  numericInput: {
    flex: 1,
    height: 42,
    fontSize: 14,
    fontWeight: '700',
    color: colors.light.textPrimary,
  },
  currencySuffix: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.light.textSecondary,
    marginLeft: 6,
  },
  calculationPreview: {
    backgroundColor: colors.light.surface,
    padding: 10,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.light.border,
    gap: 4,
  },
  calcRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  calcLabel: {
    fontSize: 11,
    color: colors.light.textSecondary,
  },
  calcValueOwner: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.light.error,
  },
  calcValueRenter: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.light.success,
  },
  noteInputBox: {
    marginTop: 4,
    marginBottom: 20,
  },
  textNoteInput: {
    backgroundColor: colors.light.surface,
    borderWidth: 1,
    borderColor: colors.light.border,
    borderRadius: 8,
    padding: 10,
    fontSize: 12,
    color: colors.light.textPrimary,
    textAlignVertical: 'top',
    minHeight: 50,
  },
  modalFooter: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    paddingTop: 12,
    gap: 12,
    borderTopWidth: 1,
    borderTopColor: colors.light.border,
  },
  btnCancel: {
    flex: 1,
    backgroundColor: colors.light.surface,
    borderWidth: 1,
    borderColor: colors.light.border,
    paddingVertical: 12,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  btnCancelText: {
    color: colors.light.textSecondary,
    fontSize: 13,
    fontWeight: '600',
  },
  btnSubmit: {
    flex: 2,
    backgroundColor: colors.light.primary,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 12,
    borderRadius: 10,
  },
  btnSubmitText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '700',
  },
});
