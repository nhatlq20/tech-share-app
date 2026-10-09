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
import { STRINGS } from '../../constants/strings';
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
      STRINGS.ADMIN.DISPUTE_MODAL.CONFIRM_TITLE,
      STRINGS.ADMIN.DISPUTE_MODAL.CONFIRM_MSG(
        booking?.bookingCode || '',
        finalDeduct.toLocaleString('en-US'),
        finalRefund.toLocaleString('en-US')
      ),
      [
        { text: STRINGS.ADMIN.DISPUTE_MODAL.CANCEL, style: 'cancel' },
        {
          text: STRINGS.ADMIN.DISPUTE_MODAL.EXECUTE_RULING,
          onPress: async () => {
            setLoading(true);
            try {
              const res = await adminService.resolveDispute(dispute._id, {
                decision,
                finalDeductAmount: finalDeduct,
                note: adminNote || `Admin ruling: ${decision}`,
              });

              if (res && res.success) {
                Alert.alert(
                  STRINGS.ADMIN.DISPUTE_MODAL.SUCCESS_TITLE,
                  STRINGS.ADMIN.DISPUTE_MODAL.SUCCESS_MSG
                );
                onResolved(dispute._id, decision, finalDeduct, finalRefund);
                onClose();
              } else {
                Alert.alert(
                  STRINGS.BOOKING_DETAIL.ALERT_NOTICE_TITLE,
                  res?.message || STRINGS.ADMIN.DISPUTE_MODAL.ERROR_DEFAULT
                );
              }
            } catch (err: any) {
              Alert.alert(
                STRINGS.BOOKING_DETAIL.ALERT_ERROR_TITLE,
                err.message || STRINGS.ADMIN.DISPUTE_MODAL.ERROR_DEFAULT
              );
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
                <Text style={styles.modalTitle}>{STRINGS.ADMIN.DISPUTE_MODAL.MODAL_TITLE}</Text>
                <Text style={styles.modalSubtitle}>
                  {STRINGS.ADMIN.DISPUTE_MODAL.ORDER_PREFIX(
                    booking?.bookingCode || '',
                    booking?.deviceId?.name || STRINGS.BOOKING_DETAIL.DEFAULT_DEVICE_NAME
                  )}
                </Text>
              </View>
            </View>
            <TouchableOpacity onPress={onClose} style={styles.closeBtn} activeOpacity={0.7}>
              <Ionicons name="close" size={22} color={colors.light.textSecondary} />
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.modalScroll} showsVerticalScrollIndicator={false}>
            {/* Parties info and deposit amount */}
            <View style={styles.partiesCard}>
              <View style={styles.partyItem}>
                <Text style={styles.partyRoleLabel}>{STRINGS.ADMIN.DISPUTE_MODAL.OWNER_ROLE}</Text>
                <Text style={styles.partyName}>{booking?.ownerId?.name || STRINGS.BOOKING_DETAIL.DEFAULT_OWNER_NAME}</Text>
                <Text style={styles.partyPhone}>{booking?.ownerId?.phone || '0912345678'}</Text>
              </View>
              <View style={styles.partyDivider} />
              <View style={styles.partyItem}>
                <Text style={styles.partyRoleLabel}>{STRINGS.ADMIN.DISPUTE_MODAL.RENTER_ROLE}</Text>
                <Text style={styles.partyName}>{booking?.renterId?.name || STRINGS.ADMIN.DISPUTE_MODAL.RENTER_ROLE}</Text>
                <Text style={styles.partyPhone}>{booking?.renterId?.phone || '0901234567'}</Text>
              </View>
            </View>

            {/* Escrow financial box */}
            <View style={styles.escrowCard}>
              <View style={styles.escrowCol}>
                <Text style={styles.escrowLabel}>{STRINGS.ADMIN.DISPUTE_MODAL.TOTAL_ESCROW_LABEL}</Text>
                <Text style={styles.escrowValuePrimary}>
                  {depositFee.toLocaleString('en-US')} VND
                </Text>
              </View>
              <View style={styles.escrowCol}>
                <Text style={styles.escrowLabel}>{STRINGS.ADMIN.DISPUTE_MODAL.OWNER_CLAIMED_LABEL}</Text>
                <Text style={styles.escrowValueWarning}>
                  {requestedAmount.toLocaleString('en-US')} VND
                </Text>
              </View>
            </View>

            {/* Dispute reason */}
            <View style={styles.reasonBox}>
              <View style={styles.reasonHeader}>
                <Ionicons name="chatbox-ellipses-outline" size={16} color={colors.light.error} />
                <Text style={styles.reasonTitle}>{STRINGS.ADMIN.DISPUTE_MODAL.CLAIM_DETAILS_LABEL}</Text>
              </View>
              <Text style={styles.reasonContent}>"{dispute.reason}"</Text>
            </View>

            {/* 2-column image comparison */}
            <Text style={styles.sectionHeading}>{STRINGS.ADMIN.DISPUTE_MODAL.INSPECTION_HEADING}</Text>
            <View style={styles.comparisonGrid}>
              {/* Left col: Pre-handover photos */}
              <View style={styles.comparisonCol}>
                <View style={styles.colHeaderRow}>
                  <Ionicons name="checkmark-circle" size={14} color={colors.light.success} />
                  <Text style={styles.colHeaderGreen}>{STRINGS.ADMIN.DISPUTE_MODAL.PRE_HANDOVER_TITLE}</Text>
                </View>
                <Image source={{ uri: beforeImages[0] }} style={styles.proofImg} />
                <View style={styles.proofBadgeGreen}>
                  <Text style={styles.proofBadgeGreenText}>{STRINGS.ADMIN.DISPUTE_MODAL.INTACT_BADGE}</Text>
                </View>
              </View>

              {/* Right col: Return & evidence photos */}
              <View style={styles.comparisonCol}>
                <View style={styles.colHeaderRow}>
                  <Ionicons name="alert-circle" size={14} color={colors.light.error} />
                  <Text style={styles.colHeaderRed}>{STRINGS.ADMIN.DISPUTE_MODAL.RETURN_EVIDENCE_TITLE}</Text>
                </View>
                <Image source={{ uri: afterImages[0] }} style={styles.proofImg} />
                <View style={styles.proofBadgeRed}>
                  <Text style={styles.proofBadgeRedText}>{STRINGS.ADMIN.DISPUTE_MODAL.DAMAGE_BADGE}</Text>
                </View>
              </View>
            </View>

            {/* 3 Ruling choices */}
            <Text style={styles.sectionHeading}>{STRINGS.ADMIN.DISPUTE_MODAL.RULING_HEADING}</Text>

            {/* Choice 1: Partial deduct */}
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
                  <Text style={styles.choiceTitle}>{STRINGS.ADMIN.DISPUTE_MODAL.CHOICE_PARTIAL_TITLE}</Text>
                  <Text style={styles.choiceDesc}>
                    {STRINGS.ADMIN.DISPUTE_MODAL.CHOICE_PARTIAL_DESC}
                  </Text>
                </View>
              </View>

              {decision === 'partial_deduct' && (
                <View style={styles.deductInputBox}>
                  <Text style={styles.inputLabel}>{STRINGS.ADMIN.DISPUTE_MODAL.CHOICE_PARTIAL_INPUT_LABEL}</Text>
                  <View style={styles.inputRow}>
                    <TextInput
                      style={styles.numericInput}
                      keyboardType="numeric"
                      value={deductAmountText}
                      onChangeText={(val: string) => setDeductAmountText(val)}
                      placeholder={STRINGS.ADMIN.DISPUTE_MODAL.CHOICE_PARTIAL_PLACEHOLDER}
                      placeholderTextColor={colors.light.textSecondary}
                    />
                    <Text style={styles.currencySuffix}>VND</Text>
                  </View>

                  {/* Calculation preview */}
                  <View style={styles.calculationPreview}>
                    <View style={styles.calcRow}>
                      <Text style={styles.calcLabel}>{STRINGS.ADMIN.DISPUTE_MODAL.OWNER_COMPENSATION_LABEL}</Text>
                      <Text style={styles.calcValueOwner}>
                        +{finalDeduct.toLocaleString('en-US')} VND
                      </Text>
                    </View>
                    <View style={styles.calcRow}>
                      <Text style={styles.calcLabel}>{STRINGS.ADMIN.DISPUTE_MODAL.RENTER_REFUND_LABEL}</Text>
                      <Text style={styles.calcValueRenter}>
                        +{finalRefund.toLocaleString('en-US')} VND
                      </Text>
                    </View>
                  </View>
                </View>
              )}
            </TouchableOpacity>

            {/* Choice 2: Full refund to renter */}
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
                  <Text style={styles.choiceTitle}>{STRINGS.ADMIN.DISPUTE_MODAL.CHOICE_REFUND_TITLE}</Text>
                  <Text style={styles.choiceDesc}>
                    {STRINGS.ADMIN.DISPUTE_MODAL.CHOICE_REFUND_DESC(depositFee.toLocaleString('en-US'))}
                  </Text>
                </View>
              </View>
            </TouchableOpacity>

            {/* Choice 3: Full deduct to owner */}
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
                  <Text style={styles.choiceTitle}>{STRINGS.ADMIN.DISPUTE_MODAL.CHOICE_DEDUCT_TITLE}</Text>
                  <Text style={styles.choiceDesc}>
                    {STRINGS.ADMIN.DISPUTE_MODAL.CHOICE_DEDUCT_DESC(depositFee.toLocaleString('en-US'))}
                  </Text>
                </View>
              </View>
            </TouchableOpacity>

            {/* Admin notes */}
            <View style={styles.noteInputBox}>
              <Text style={styles.inputLabel}>{STRINGS.ADMIN.DISPUTE_MODAL.REPORT_NOTE_LABEL}</Text>
              <TextInput
                style={styles.textNoteInput}
                multiline
                numberOfLines={2}
                value={adminNote}
                onChangeText={setAdminNote}
                placeholder={STRINGS.ADMIN.DISPUTE_MODAL.REPORT_NOTE_PLACEHOLDER}
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
              <Text style={styles.btnCancelText}>{STRINGS.ADMIN.DISPUTE_MODAL.CLOSE}</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.btnSubmit}
              onPress={handleSubmitResolution}
              disabled={loading}
              activeOpacity={0.8}
            >
              {loading ? (
                <ActivityIndicator color={colors.light.white} size="small" />
              ) : (
                <>
                  <Ionicons name="shield-checkmark" size={18} color={colors.light.white} />
                  <Text style={styles.btnSubmitText}>{STRINGS.ADMIN.DISPUTE_MODAL.SUBMIT_RULING}</Text>
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
    color: colors.light.warning,
  },
  reasonBox: {
    backgroundColor: colors.light.dangerLight,
    borderRadius: 10,
    padding: 12,
    borderWidth: 1,
    borderColor: colors.light.dangerLight,
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
    color: colors.light.error,
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
    backgroundColor: colors.light.successLight,
    paddingVertical: 3,
    paddingHorizontal: 6,
    borderRadius: 4,
    alignItems: 'center',
  },
  proofBadgeGreenText: {
    fontSize: 9,
    fontWeight: '700',
    color: colors.light.success,
  },
  proofBadgeRed: {
    backgroundColor: colors.light.dangerLight,
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
    backgroundColor: colors.light.primaryLight,
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
    color: colors.light.white,
    fontSize: 13,
    fontWeight: '700',
  },
});
