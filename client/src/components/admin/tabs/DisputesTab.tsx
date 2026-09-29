import React from 'react';
import { StyleSheet, View, Text, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { theme } from '../../../constants/theme';
import { DisputeItem } from '../../../types';

interface DisputesTabProps {
  disputes: DisputeItem[];
  onOpenDispute: (dispute: DisputeItem) => void;
}

export function DisputesTab({ disputes, onOpenDispute }: DisputesTabProps) {
  return (
    <View style={styles.sectionBlock}>
      <View style={styles.sectionHeaderTitleRow}>
        <Ionicons name="scale-outline" size={16} color={theme.colors.danger[600]} />
        <Text style={styles.sectionHeaderTitle}>
          Danh sách tranh chấp cọc ({disputes.length})
        </Text>
      </View>

      {disputes.length === 0 ? (
        <View style={styles.emptyCard}>
          <Ionicons
            name="checkmark-done-circle-outline"
            size={48}
            color={theme.colors.success[600]}
          />
          <Text style={styles.emptyTitle}>Không có tranh chấp nào</Text>
          <Text style={styles.emptyDesc}>
            Sàn giao dịch hoạt động thuận lợi, không phát sinh khiếu nại cọc.
          </Text>
        </View>
      ) : (
        disputes.map((dispute: DisputeItem) => {
          const isResolved = dispute.status === 'resolved';
          const booking = dispute.bookingId;

          return (
            <View key={dispute._id} style={styles.disputeCard}>
              {/* Header card */}
              <View style={styles.disputeCardHeader}>
                <View style={styles.disputeCodeRow}>
                  <Text style={styles.disputeCode}>#{booking?.bookingCode || 'TS-ĐƠN'}</Text>
                  <View
                    style={[
                      styles.statusBadge,
                      isResolved ? styles.statusBadgeGreen : styles.statusBadgeRed,
                    ]}
                  >
                    <Text
                      style={[
                        styles.statusBadgeText,
                        isResolved ? styles.statusBadgeTextGreen : styles.statusBadgeTextRed,
                      ]}
                    >
                      {isResolved ? 'Đã phân xử' : 'Chờ phán quyết'}
                    </Text>
                  </View>
                </View>
                <Text style={styles.disputeDeviceName}>
                  {booking?.deviceId?.name || 'Thiết bị công nghệ'}
                </Text>
              </View>

              {/* Chi tiết bên khiếu nại */}
              <View style={styles.disputePartyInfo}>
                <View style={styles.disputePartyCol}>
                  <Text style={styles.partyLabel}>Chủ máy yêu cầu:</Text>
                  <Text style={styles.partyValue}>
                    {booking?.ownerId?.name || dispute.raisedBy?.name}
                  </Text>
                </View>
                <View style={styles.disputePartyCol}>
                  <Text style={styles.partyLabel}>Khách thuê:</Text>
                  <Text style={styles.partyValue}>{booking?.renterId?.name || 'Khách'}</Text>
                </View>
              </View>

              {/* Tài chính tranh chấp */}
              <View style={styles.disputeFinanceRow}>
                <View style={styles.financeBox}>
                  <Text style={styles.financeLabel}>Tiền cọc Escrow:</Text>
                  <Text style={styles.financeValueBlue}>
                    {(booking?.depositFee || 0).toLocaleString('vi-VN')} đ
                  </Text>
                </View>
                <View style={styles.financeBox}>
                  <Text style={styles.financeLabel}>Đòi trừ cọc:</Text>
                  <Text style={styles.financeValueRed}>
                    {(dispute.requestedDeductAmount || 0).toLocaleString('vi-VN')} đ
                  </Text>
                </View>
              </View>

              {/* Lý do khiếu nại */}
              <View style={styles.disputeReasonRow}>
                <Ionicons
                  name="chatbubble-ellipses-outline"
                  size={14}
                  color={theme.textSecondary}
                />
                <Text style={styles.disputeReasonText} numberOfLines={2}>
                  Lý do: "{dispute.reason}"
                </Text>
              </View>

              {/* Nút hành động */}
              {!isResolved ? (
                <TouchableOpacity
                  style={styles.btnResolveGavel}
                  onPress={() => onOpenDispute(dispute)}
                  activeOpacity={0.8}
                >
                  <Ionicons name="scale" size={16} color={theme.colors.white} />
                  <Text style={styles.btnResolveGavelText}>Đối chiếu ảnh & Phán quyết cọc</Text>
                </TouchableOpacity>
              ) : (
                <View style={styles.resolvedNotice}>
                  <Ionicons
                    name="checkmark-circle"
                    size={16}
                    color={theme.colors.success[600]}
                  />
                  <Text style={styles.resolvedNoticeText}>
                    Phán quyết: {dispute.adminDecision} (Khấu trừ{' '}
                    {(dispute.finalDeductAmount || 0).toLocaleString('vi-VN')} đ)
                  </Text>
                </View>
              )}
            </View>
          );
        })
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  sectionBlock: {
    marginBottom: 4,
  },
  sectionHeaderTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: theme.spacing.sm,
  },
  sectionHeaderTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: theme.textPrimary,
  },
  emptyCard: {
    backgroundColor: theme.colors.white,
    borderRadius: theme.radii.lg,
    padding: theme.spacing.xl,
    alignItems: 'center',
    justifyContent: 'center',
    ...theme.shadows.card,
  },
  emptyTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: theme.textPrimary,
    marginTop: 12,
    marginBottom: 4,
  },
  emptyDesc: {
    fontSize: 12,
    color: theme.textSecondary,
    textAlign: 'center',
  },
  disputeCard: {
    backgroundColor: theme.colors.white,
    borderRadius: theme.radii.lg,
    padding: theme.spacing.md,
    marginBottom: theme.spacing.md,
    ...theme.shadows.card,
  },
  disputeCardHeader: {
    marginBottom: 10,
  },
  disputeCodeRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  disputeCode: {
    fontSize: 13,
    fontWeight: '700',
    color: theme.textPrimary,
  },
  statusBadge: {
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderRadius: theme.radii.full,
  },
  statusBadgeRed: {
    backgroundColor: theme.colors.danger[50],
  },
  statusBadgeTextRed: {
    color: theme.colors.danger[600],
    fontSize: 10,
    fontWeight: '700',
  },
  statusBadgeGreen: {
    backgroundColor: theme.colors.success[50],
  },
  statusBadgeTextGreen: {
    color: theme.colors.success[600],
    fontSize: 10,
    fontWeight: '700',
  },
  disputeDeviceName: {
    fontSize: 12,
    color: theme.textSecondary,
  },
  disputePartyInfo: {
    flexDirection: 'row',
    backgroundColor: theme.colors.slate[50],
    borderRadius: theme.radii.md,
    padding: theme.spacing.sm,
    marginBottom: 10,
  },
  disputePartyCol: {
    flex: 1,
  },
  partyLabel: {
    fontSize: 10,
    color: theme.textSecondary,
  },
  partyValue: {
    fontSize: 12,
    fontWeight: '600',
    color: theme.textPrimary,
  },
  disputeFinanceRow: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 10,
  },
  financeBox: {
    flex: 1,
    backgroundColor: theme.colors.slate[50],
    borderRadius: theme.radii.md,
    padding: theme.spacing.sm,
  },
  financeLabel: {
    fontSize: 10,
    color: theme.textSecondary,
    marginBottom: 2,
  },
  financeValueBlue: {
    fontSize: 13,
    fontWeight: '700',
    color: theme.colors.primary[600],
  },
  financeValueRed: {
    fontSize: 13,
    fontWeight: '700',
    color: theme.colors.danger[600],
  },
  disputeReasonRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 12,
  },
  disputeReasonText: {
    fontSize: 11,
    color: theme.textSecondary,
    fontStyle: 'italic',
    flex: 1,
  },
  btnResolveGavel: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: theme.colors.primary[600],
    paddingVertical: 11,
    borderRadius: theme.radii.full,
    ...theme.shadows.subtle,
  },
  btnResolveGavelText: {
    color: theme.colors.white,
    fontWeight: '700',
    fontSize: 12,
  },
  resolvedNotice: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: theme.colors.success[50],
    padding: theme.spacing.sm,
    borderRadius: theme.radii.md,
  },
  resolvedNoticeText: {
    fontSize: 11,
    color: theme.colors.success[600],
    fontWeight: '600',
  },
});
