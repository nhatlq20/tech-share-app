import React from 'react';
import { StyleSheet, View, Text, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { theme } from '../../../constants/theme';
import { AdminAnalytics, DisputeItem, EkycItem } from '../../../types';

interface OverviewTabProps {
  analytics: AdminAnalytics;
  disputes: DisputeItem[];
  ekycRequests: EkycItem[];
  onOpenDispute: (dispute: DisputeItem) => void;
  onOpenEkyc: (ekyc: EkycItem) => void;
  onNavigateTab: (tab: 'overview' | 'disputes' | 'ekyc' | 'devices' | 'users' | 'vouchers') => void;
}

export function OverviewTab({
  analytics,
  disputes,
  ekycRequests,
  onOpenDispute,
  onOpenEkyc,
  onNavigateTab,
}: OverviewTabProps) {
  const pendingDisputesCount = disputes.filter(d => d.status === 'pending').length;
  const pendingEkycCount = ekycRequests.filter(r => r.status === 'pending').length;
  const totalPendingTasks = pendingDisputesCount + pendingEkycCount;

  return (
    <>
      {/* 4 Thẻ KPI (Grid 2x2 bo tròn mềm, icon tròn pastel) */}
      <View style={styles.sectionBlock}>
        <View style={styles.sectionHeaderTitleRow}>
          <Ionicons name="stats-chart" size={16} color={theme.colors.primary[600]} />
          <Text style={styles.sectionHeaderTitle}>Chỉ số hoạt động toàn sàn</Text>
        </View>

        <View style={styles.kpiGrid}>
          {/* Card 1: Doanh thu sàn */}
          <View style={styles.kpiCard}>
            <View style={styles.kpiIconWrapperRevenue}>
              <Ionicons name="cash-outline" size={22} color={theme.colors.success[600]} />
            </View>
            <Text style={styles.kpiLabel}>Doanh thu GD sàn</Text>
            <Text style={styles.kpiValue}>
              {(analytics.totalRentalRevenue || 1350000).toLocaleString('vi-VN')} đ
            </Text>
            <View style={styles.kpiBadgeGreen}>
              <Ionicons name="trending-up" size={12} color={theme.colors.success[600]} />
              <Text style={styles.kpiBadgeGreenText}>+18.4% tháng này</Text>
            </View>
          </View>

          {/* Card 2: Thành viên */}
          <View style={styles.kpiCard}>
            <View style={styles.kpiIconWrapperUsers}>
              <Ionicons name="people-outline" size={22} color={theme.colors.primary[600]} />
            </View>
            <Text style={styles.kpiLabel}>Thành viên</Text>
            <Text style={styles.kpiValue}>{analytics.totalUsers} Tài khoản</Text>
            <Text style={styles.kpiSubLabel}>
              {analytics.verifiedUsers} Tích xanh • 11 Active
            </Text>
          </View>

          {/* Card 3: Thiết bị */}
          <View style={styles.kpiCard}>
            <View style={styles.kpiIconWrapperDevices}>
              <Ionicons name="hardware-chip-outline" size={22} color={theme.colors.warning[600]} />
            </View>
            <Text style={styles.kpiLabel}>Tổng thiết bị</Text>
            <Text style={styles.kpiValue}>{analytics.totalDevices} Máy</Text>
            <Text style={styles.kpiSubLabel}>
              {analytics.rentedDevices || 2} Đang thuê • {analytics.availableDevices || 8} Sẵn sàng
            </Text>
          </View>

          {/* Card 4: Đơn thuê active */}
          <View style={styles.kpiCard}>
            <View style={styles.kpiIconWrapperOrders}>
              <Ionicons name="receipt-outline" size={22} color={theme.colors.indigo[600]} />
            </View>
            <Text style={styles.kpiLabel}>Đơn đặt thuê</Text>
            <Text style={styles.kpiValue}>
              {(analytics.activeBookings || 0) + (analytics.completedBookingsCount || 0)} Đơn
            </Text>
            <Text style={styles.kpiSubLabel}>
              {analytics.activeBookings || 1} Hoạt động • {analytics.completedBookingsCount || 1} Hoàn tất
            </Text>
          </View>
        </View>
      </View>

      {/* Khối việc cần xử lý (Empty State đơn mảnh tinh tế) */}
      <View style={styles.sectionBlock}>
        <View style={styles.sectionTitleRow}>
          <View style={styles.sectionHeaderTitleRow}>
            <Ionicons name="alert-circle-outline" size={17} color={theme.colors.primary[600]} />
            <Text style={styles.sectionHeaderTitle}>Tác vụ cần xử lý</Text>
          </View>
          {totalPendingTasks > 0 && (
            <View style={styles.urgentCountPill}>
              <Text style={styles.urgentCountPillText}>{totalPendingTasks} việc</Text>
            </View>
          )}
        </View>

        {totalPendingTasks === 0 ? (
          <View style={styles.emptyTaskCard}>
            <Ionicons name="checkmark-circle" size={24} color={theme.colors.success[500]} />
            <Text style={styles.emptyTaskText}>
              Hệ thống vận hành trơn tru • Không có tranh chấp hay hồ sơ tồn đọng
            </Text>
          </View>
        ) : (
          <>
            {/* Ca Tranh chấp cọc nếu có */}
            {pendingDisputesCount > 0 && (
              <TouchableOpacity
                style={styles.urgentCard}
                onPress={() => {
                  const firstPending = disputes.find(d => d.status === 'pending');
                  if (firstPending) {
                    onOpenDispute(firstPending);
                  } else {
                    onNavigateTab('disputes');
                  }
                }}
                activeOpacity={0.8}
              >
                <View style={styles.urgentIconColWarning}>
                  <Ionicons name="warning" size={22} color={theme.colors.danger[600]} />
                </View>
                <View style={styles.urgentInfoCol}>
                  <View style={styles.urgentHeaderRow}>
                    <Text style={styles.urgentTitle}>
                      Tranh chấp cọc: Đơn #{disputes[0]?.bookingId?.bookingCode || 'TS-20260901'}
                    </Text>
                    <View style={styles.badgePendingRed}>
                      <Text style={styles.badgePendingRedText}>Khẩn cấp</Text>
                    </View>
                  </View>
                  <Text style={styles.urgentDesc} numberOfLines={2}>
                    {disputes[0]?.reason ||
                      'Chủ máy yêu cầu giữ tiền cọc do thiết bị trầy xước viền kim loại.'}
                  </Text>
                  <Text style={styles.urgentActionLink}>Bấm để đối chiếu ảnh & xử lý cọc →</Text>
                </View>
              </TouchableOpacity>
            )}

            {/* Ca Duyệt eKYC nếu có */}
            {pendingEkycCount > 0 && (
              <TouchableOpacity
                style={styles.urgentCard}
                onPress={() => {
                  const firstPending = ekycRequests.find(r => r.status === 'pending');
                  if (firstPending) {
                    onOpenEkyc(firstPending);
                  } else {
                    onNavigateTab('ekyc');
                  }
                }}
                activeOpacity={0.8}
              >
                <View style={styles.urgentIconColInfo}>
                  <Ionicons name="id-card" size={22} color={theme.colors.primary[600]} />
                </View>
                <View style={styles.urgentInfoCol}>
                  <View style={styles.urgentHeaderRow}>
                    <Text style={styles.urgentTitle}>
                      {pendingEkycCount} Hồ sơ eKYC gửi yêu cầu cấp Tích xanh
                    </Text>
                    <View style={styles.badgePendingBlue}>
                      <Text style={styles.badgePendingBlueText}>Chờ duyệt</Text>
                    </View>
                  </View>
                  <Text style={styles.urgentDesc} numberOfLines={2}>
                    {ekycRequests
                      .filter(r => r.status === 'pending')
                      .map(r => r.userId?.name)
                      .filter(Boolean)
                      .join(', ')}{' '}
                    đã gửi ảnh CCCD và video chân dung.
                  </Text>
                  <Text style={styles.urgentActionLink}>Kiểm tra tính hợp lệ & cấp Tích xanh →</Text>
                </View>
              </TouchableOpacity>
            )}
          </>
        )}
      </View>

      {/* Biểu đồ phân bổ danh mục */}
      <View style={styles.sectionBlock}>
        <View style={styles.sectionHeaderTitleRow}>
          <Ionicons name="trending-up" size={16} color={theme.colors.primary[600]} />
          <Text style={styles.sectionHeaderTitle}>Phân bổ danh mục thuê</Text>
        </View>

        <View style={styles.chartContainer}>
          <View style={styles.chartRow}>
            <View style={styles.chartLabelCol}>
              <Ionicons name="camera-outline" size={16} color={theme.colors.indigo[600]} />
              <Text style={styles.chartLabelText}>Máy ảnh & Lens</Text>
            </View>
            <View style={styles.progressBarBg}>
              <View
                style={[
                  styles.progressBarFill,
                  { width: '45%', backgroundColor: theme.colors.indigo[600] },
                ]}
              />
            </View>
            <Text style={styles.chartPercentText}>45%</Text>
          </View>

          <View style={styles.chartRow}>
            <View style={styles.chartLabelCol}>
              <Ionicons name="laptop-outline" size={16} color={theme.colors.primary[600]} />
              <Text style={styles.chartLabelText}>Laptop Đồ họa</Text>
            </View>
            <View style={styles.progressBarBg}>
              <View
                style={[
                  styles.progressBarFill,
                  { width: '30%', backgroundColor: theme.colors.primary[600] },
                ]}
              />
            </View>
            <Text style={styles.chartPercentText}>30%</Text>
          </View>

          <View style={styles.chartRow}>
            <View style={styles.chartLabelCol}>
              <Ionicons name="phone-portrait-outline" size={16} color={theme.colors.success[600]} />
              <Text style={styles.chartLabelText}>Smartphone</Text>
            </View>
            <View style={styles.progressBarBg}>
              <View
                style={[
                  styles.progressBarFill,
                  { width: '15%', backgroundColor: theme.colors.success[600] },
                ]}
              />
            </View>
            <Text style={styles.chartPercentText}>15%</Text>
          </View>

          <View style={styles.chartRow}>
            <View style={styles.chartLabelCol}>
              <Ionicons name="game-controller-outline" size={16} color={theme.colors.warning[600]} />
              <Text style={styles.chartLabelText}>Gaming & Drone</Text>
            </View>
            <View style={styles.progressBarBg}>
              <View
                style={[
                  styles.progressBarFill,
                  { width: '10%', backgroundColor: theme.colors.warning[600] },
                ]}
              />
            </View>
            <Text style={styles.chartPercentText}>10%</Text>
          </View>
        </View>
      </View>
    </>
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
  sectionTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 2,
  },
  urgentCountPill: {
    backgroundColor: theme.colors.danger[50],
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderRadius: theme.radii.full,
  },
  urgentCountPillText: {
    color: theme.colors.danger[600],
    fontSize: 11,
    fontWeight: '700',
  },
  kpiGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  kpiCard: {
    width: '48%',
    backgroundColor: theme.colors.white,
    borderRadius: theme.radii.lg,
    padding: theme.spacing.md,
    ...theme.shadows.card,
  },
  kpiIconWrapperRevenue: {
    width: 44,
    height: 44,
    borderRadius: theme.radii.full,
    backgroundColor: theme.colors.success[50],
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: theme.spacing.sm,
  },
  kpiIconWrapperUsers: {
    width: 44,
    height: 44,
    borderRadius: theme.radii.full,
    backgroundColor: theme.colors.primary[50],
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: theme.spacing.sm,
  },
  kpiIconWrapperDevices: {
    width: 44,
    height: 44,
    borderRadius: theme.radii.full,
    backgroundColor: theme.colors.warning[50],
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: theme.spacing.sm,
  },
  kpiIconWrapperOrders: {
    width: 44,
    height: 44,
    borderRadius: theme.radii.full,
    backgroundColor: theme.colors.indigo[50],
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: theme.spacing.sm,
  },
  kpiLabel: {
    fontSize: 12,
    color: theme.textSecondary,
    marginBottom: 4,
  },
  kpiValue: {
    fontSize: 16,
    fontWeight: '700',
    color: theme.textPrimary,
    marginBottom: 4,
  },
  kpiSubLabel: {
    fontSize: 10,
    color: theme.textSecondary,
  },
  kpiBadgeGreen: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 2,
  },
  kpiBadgeGreenText: {
    fontSize: 10,
    color: theme.colors.success[600],
    fontWeight: '600',
  },
  emptyTaskCard: {
    backgroundColor: theme.colors.white,
    borderRadius: theme.radii.lg,
    padding: theme.spacing.lg,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    ...theme.shadows.card,
  },
  emptyTaskText: {
    fontSize: 12,
    color: theme.textSecondary,
    textAlign: 'center',
    lineHeight: 18,
  },
  urgentCard: {
    flexDirection: 'row',
    backgroundColor: theme.colors.white,
    borderRadius: theme.radii.lg,
    padding: theme.spacing.md,
    marginBottom: theme.spacing.sm,
    ...theme.shadows.card,
  },
  urgentIconColWarning: {
    width: 40,
    height: 40,
    borderRadius: theme.radii.full,
    backgroundColor: theme.colors.danger[50],
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  urgentIconColInfo: {
    width: 40,
    height: 40,
    borderRadius: theme.radii.full,
    backgroundColor: theme.colors.primary[50],
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  urgentInfoCol: {
    flex: 1,
  },
  urgentHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  urgentTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: theme.textPrimary,
    flex: 1,
    marginRight: 8,
  },
  badgePendingRed: {
    backgroundColor: theme.colors.danger[50],
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: theme.radii.full,
  },
  badgePendingRedText: {
    color: theme.colors.danger[600],
    fontSize: 10,
    fontWeight: '700',
  },
  badgePendingBlue: {
    backgroundColor: theme.colors.primary[50],
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: theme.radii.full,
  },
  badgePendingBlueText: {
    color: theme.colors.primary[600],
    fontSize: 10,
    fontWeight: '700',
  },
  urgentDesc: {
    fontSize: 11,
    color: theme.textSecondary,
    lineHeight: 16,
    marginBottom: 6,
  },
  urgentActionLink: {
    fontSize: 11,
    fontWeight: '600',
    color: theme.colors.primary[600],
  },
  chartContainer: {
    backgroundColor: theme.colors.white,
    borderRadius: theme.radii.lg,
    padding: theme.spacing.md,
    gap: 12,
    ...theme.shadows.card,
  },
  chartRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  chartLabelCol: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    width: 120,
  },
  chartLabelText: {
    fontSize: 11,
    color: theme.textSecondary,
  },
  progressBarBg: {
    flex: 1,
    height: 8,
    borderRadius: theme.radii.full,
    backgroundColor: theme.colors.slate[100],
    overflow: 'hidden',
  },
  progressBarFill: {
    height: '100%',
    borderRadius: theme.radii.full,
  },
  chartPercentText: {
    fontSize: 11,
    fontWeight: '600',
    color: theme.textPrimary,
    width: 32,
    textAlign: 'right',
  },
});
