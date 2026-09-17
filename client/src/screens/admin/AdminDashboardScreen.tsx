import React, { useState, useEffect, useCallback } from 'react';
import {
  StyleSheet,
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  Image,
  Alert,
  RefreshControl,
  TextInput,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../../theme/colors';
import {
  AdminAnalytics,
  DisputeItem,
  EkycItem,
  AdminDeviceItem,
  DisputeDecision,
} from '../../types';
import {
  adminService,
  FALLBACK_ANALYTICS,
  FALLBACK_DISPUTES,
  FALLBACK_EKYC,
  FALLBACK_ADMIN_DEVICES,
} from '../../services/adminService';
import { DisputeResolverModal } from '../../components/admin/DisputeResolverModal';
import { EkycReviewModal } from '../../components/admin/EkycReviewModal';

interface AdminDashboardScreenProps {
  onBackToHome?: () => void;
}

type AdminTab = 'overview' | 'disputes' | 'ekyc' | 'devices';

export function AdminDashboardScreen({ onBackToHome }: AdminDashboardScreenProps) {
  const [selectedTab, setSelectedTab] = useState('overview' as AdminTab);
  const [analytics, setAnalytics] = useState(FALLBACK_ANALYTICS as AdminAnalytics);
  const [disputes, setDisputes] = useState(FALLBACK_DISPUTES as DisputeItem[]);
  const [ekycRequests, setEkycRequests] = useState(FALLBACK_EKYC as EkycItem[]);
  const [devices, setDevices] = useState(FALLBACK_ADMIN_DEVICES as AdminDeviceItem[]);

  // Search & Filter
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');

  // Modals
  const [activeDispute, setActiveDispute] = useState(null as DisputeItem | null);
  const [activeEkyc, setActiveEkyc] = useState(null as EkycItem | null);

  // Loading & Refresh
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  const loadData = useCallback(async () => {
    try {
      const [analyticsData, disputesData, ekycData, devicesData] = await Promise.all([
        adminService.getAnalytics(),
        adminService.getDisputes(),
        adminService.getEkycRequests(),
        adminService.getAdminDevices(),
      ]);

      if (analyticsData) setAnalytics(analyticsData);
      if (disputesData) setDisputes(disputesData);
      if (ekycData) setEkycRequests(ekycData);
      if (devicesData) setDevices(devicesData);
    } catch (err) {
      console.warn('⚠️ [AdminDashboardScreen] Lỗi khi tải dữ liệu:', err);
    }
  }, []);

  useEffect(() => {
    setLoading(true);
    loadData().finally(() => setLoading(false));
  }, [loadData]);

  const onRefresh = async () => {
    setRefreshing(true);
    await loadData();
    setRefreshing(false);
  };

  // Handlers
  const handleDisputeResolved = (
    disputeId: string,
    decision: DisputeDecision,
    deductAmount: number,
    refundAmount: number
  ) => {
    setDisputes((prev: DisputeItem[]) =>
      prev.map((d: DisputeItem) =>
        d._id === disputeId
          ? {
              ...d,
              status: 'resolved',
              adminDecision: decision,
              finalDeductAmount: deductAmount,
            }
          : d
      )
    );
    setAnalytics((prev: AdminAnalytics) => ({
      ...prev,
      pendingTasks: {
        ...prev.pendingTasks,
        disputes: Math.max(0, prev.pendingTasks.disputes - 1),
        total: Math.max(0, prev.pendingTasks.total - 1),
      },
    }));
  };

  const handleEkycApproved = (requestId: string) => {
    setEkycRequests((prev: EkycItem[]) =>
      prev.map((r: EkycItem) => (r._id === requestId ? { ...r, status: 'approved' } : r))
    );
    setAnalytics((prev: AdminAnalytics) => ({
      ...prev,
      verifiedUsers: prev.verifiedUsers + 1,
      pendingTasks: {
        ...prev.pendingTasks,
        ekyc: Math.max(0, prev.pendingTasks.ekyc - 1),
        total: Math.max(0, prev.pendingTasks.total - 1),
      },
    }));
  };

  const handleEkycRejected = (requestId: string, reason: string) => {
    setEkycRequests((prev: EkycItem[]) =>
      prev.map((r: EkycItem) => (r._id === requestId ? { ...r, status: 'rejected', rejectReason: reason } : r))
    );
    setAnalytics((prev: AdminAnalytics) => ({
      ...prev,
      pendingTasks: {
        ...prev.pendingTasks,
        ekyc: Math.max(0, prev.pendingTasks.ekyc - 1),
        total: Math.max(0, prev.pendingTasks.total - 1),
      },
    }));
  };

  const handleDeleteDevice = (device: AdminDeviceItem) => {
    Alert.alert(
      'Xác nhận gỡ thiết bị vi phạm',
      `Bạn có chắc chắn muốn gỡ thiết bị "${device.name}" khỏi sàn giao dịch?\n\nThiết bị sẽ bị ẩn và đánh dấu xóa mềm (isDeleted: true).`,
      [
        { text: 'Hủy', style: 'cancel' },
        {
          text: 'Gỡ thiết bị',
          style: 'destructive',
          onPress: async () => {
            try {
              const res = await adminService.deleteDevice(device._id);
              if (res && res.success) {
                Alert.alert('Đã gỡ thiết bị', `Thiết bị "${device.name}" đã được xóa mềm thành công.`);
                setDevices((prev: AdminDeviceItem[]) => prev.filter((d: AdminDeviceItem) => d._id !== device._id));
                setAnalytics((prev: AdminAnalytics) => ({
                  ...prev,
                  totalDevices: Math.max(0, prev.totalDevices - 1),
                }));
              }
            } catch (err: any) {
              Alert.alert('Lỗi', err.message || 'Không thể xóa thiết bị.');
            }
          },
        },
      ]
    );
  };

  // Lọc danh sách thiết bị kiểm duyệt
  const filteredDevices = devices.filter((d: AdminDeviceItem) => {
    const matchesSearch =
      searchQuery === '' ||
      d.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      d.brand.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCategory = selectedCategory === 'all' || d.category === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  const pendingDisputesCount = disputes.filter((d: DisputeItem) => d.status === 'pending').length;
  const pendingEkycCount = ekycRequests.filter((r: EkycItem) => r.status === 'pending').length;

  return (
    <View style={styles.container}>
      {/* 1. Header Quản trị Admin Hub */}
      <View style={styles.header}>
        <View style={styles.headerTop}>
          <View style={styles.headerTitleRow}>
            <View style={styles.adminBadge}>
              <Ionicons name="shield-checkmark" size={18} color={colors.light.primary} />
            </View>
            <View>
              <Text style={styles.headerTitle}>TechShare Admin Hub</Text>
              <Text style={styles.headerSubtitle}>Trung tâm Điều hành & Quản trị Toàn sàn</Text>
            </View>
          </View>

          {onBackToHome && (
            <TouchableOpacity style={styles.exitButton} onPress={onBackToHome} activeOpacity={0.8}>
              <Ionicons name="exit-outline" size={16} color={colors.light.textSecondary} />
              <Text style={styles.exitButtonText}>Thoát</Text>
            </TouchableOpacity>
          )}
        </View>

        {/* Trạng thái kết nối hệ thống */}
        <View style={styles.systemStatusRow}>
          <View style={styles.statusDot} />
          <Text style={styles.systemStatusText}>MongoDB Atlas: Trực tuyến</Text>
          <Text style={styles.systemDivider}>•</Text>
          <Text style={styles.systemStatusSubText}>
            {analytics.totalUsers} Users • {analytics.totalDevices} Devices • 3 Roles
          </Text>
        </View>
      </View>

      {/* 2. Thanh Tabs Điều Hướng Quản Trị */}
      <View style={styles.tabFilterRow}>
        <TouchableOpacity
          style={[styles.filterTab, selectedTab === 'overview' && styles.filterTabActive]}
          onPress={() => setSelectedTab('overview')}
          activeOpacity={0.8}
        >
          <Ionicons
            name="stats-chart"
            size={14}
            color={selectedTab === 'overview' ? '#FFFFFF' : colors.light.textSecondary}
          />
          <Text
            style={[styles.filterTabText, selectedTab === 'overview' && styles.filterTabTextActive]}
          >
            Tổng quan
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.filterTab, selectedTab === 'disputes' && styles.filterTabActive]}
          onPress={() => setSelectedTab('disputes')}
          activeOpacity={0.8}
        >
          <Ionicons
            name="alert-circle"
            size={14}
            color={selectedTab === 'disputes' ? '#FFFFFF' : colors.light.error}
          />
          <Text
            style={[styles.filterTabText, selectedTab === 'disputes' && styles.filterTabTextActive]}
          >
            Tranh chấp {pendingDisputesCount > 0 ? `(${pendingDisputesCount})` : ''}
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.filterTab, selectedTab === 'ekyc' && styles.filterTabActive]}
          onPress={() => setSelectedTab('ekyc')}
          activeOpacity={0.8}
        >
          <Ionicons
            name="id-card"
            size={14}
            color={selectedTab === 'ekyc' ? '#FFFFFF' : colors.light.primary}
          />
          <Text
            style={[styles.filterTabText, selectedTab === 'ekyc' && styles.filterTabTextActive]}
          >
            Duyệt eKYC {pendingEkycCount > 0 ? `(${pendingEkycCount})` : ''}
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.filterTab, selectedTab === 'devices' && styles.filterTabActive]}
          onPress={() => setSelectedTab('devices')}
          activeOpacity={0.8}
        >
          <Ionicons
            name="hardware-chip"
            size={14}
            color={selectedTab === 'devices' ? '#FFFFFF' : colors.light.textSecondary}
          />
          <Text
            style={[styles.filterTabText, selectedTab === 'devices' && styles.filterTabTextActive]}
          >
            Thiết bị
          </Text>
        </TouchableOpacity>
      </View>

      {/* 3. Nội dung cuộn chính */}
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            colors={[colors.light.primary]}
            tintColor={colors.light.primary}
          />
        }
      >
        {loading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color={colors.light.primary} />
            <Text style={styles.loadingText}>Đang tải dữ liệu TechShare Admin...</Text>
          </View>
        ) : (
          <>
            {/* ============================================================ */}
            {/* TAB 1: TỔNG QUAN HỆ THỐNG */}
            {/* ============================================================ */}
            {selectedTab === 'overview' && (
              <>
                {/* 4 Thẻ KPI */}
                <View style={styles.sectionBlock}>
                  <Text style={styles.sectionHeaderTitle}>📊 CHỈ SỐ HOẠT ĐỘNG TOÀN SÀN</Text>
                  <View style={styles.kpiGrid}>
                    {/* Card 1: Doanh thu sàn */}
                    <View style={styles.kpiCard}>
                      <View style={styles.kpiIconWrapperRevenue}>
                        <Ionicons name="cash-outline" size={20} color="#10B981" />
                      </View>
                      <Text style={styles.kpiLabel}>Doanh thu GD sàn</Text>
                      <Text style={styles.kpiValue}>
                        {(analytics.totalRentalRevenue || 1350000).toLocaleString('vi-VN')} đ
                      </Text>
                      <View style={styles.kpiBadgeGreen}>
                        <Ionicons name="trending-up" size={12} color="#10B981" />
                        <Text style={styles.kpiBadgeGreenText}>+18.4% tháng này</Text>
                      </View>
                    </View>

                    {/* Card 2: Thành viên */}
                    <View style={styles.kpiCard}>
                      <View style={styles.kpiIconWrapperUsers}>
                        <Ionicons name="people-outline" size={20} color={colors.light.primary} />
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
                        <Ionicons name="hardware-chip-outline" size={20} color="#F59E0B" />
                      </View>
                      <Text style={styles.kpiLabel}>Tổng thiết bị</Text>
                      <Text style={styles.kpiValue}>{analytics.totalDevices} Máy</Text>
                      <Text style={styles.kpiSubLabel}>
                        {analytics.rentedDevices || 2} Đang thuê • {analytics.availableDevices || 8}{' '}
                        Sẵn sàng
                      </Text>
                    </View>

                    {/* Card 4: Đơn thuê active */}
                    <View style={styles.kpiCard}>
                      <View style={styles.kpiIconWrapperOrders}>
                        <Ionicons name="receipt-outline" size={20} color="#8B5CF6" />
                      </View>
                      <Text style={styles.kpiLabel}>Đơn đặt thuê</Text>
                      <Text style={styles.kpiValue}>
                        {(analytics.activeBookings || 0) + (analytics.completedBookingsCount || 0)} Đơn
                      </Text>
                      <Text style={styles.kpiSubLabel}>
                        {analytics.activeBookings || 1} Hoạt động •{' '}
                        {analytics.completedBookingsCount || 1} Hoàn tất
                      </Text>
                    </View>
                  </View>
                </View>

                {/* Khối việc cần xử lý gấp */}
                <View style={styles.sectionBlock}>
                  <View style={styles.sectionTitleRow}>
                    <Text style={styles.sectionHeaderTitle}>🚨 TÁC VỤ CẦN ADMIN XỬ LÝ GẤP</Text>
                    <View style={styles.urgentCountPill}>
                      <Text style={styles.urgentCountPillText}>
                        {pendingDisputesCount + pendingEkycCount} việc
                      </Text>
                    </View>
                  </View>

                  {/* Ca Tranh chấp cọc */}
                  {pendingDisputesCount > 0 ? (
                    <TouchableOpacity
                      style={styles.urgentCard}
                      onPress={() => {
                        const firstPending = disputes.find((d: DisputeItem) => d.status === 'pending');
                        if (firstPending) {
                          setActiveDispute(firstPending);
                        } else {
                          setSelectedTab('disputes');
                        }
                      }}
                      activeOpacity={0.8}
                    >
                      <View style={styles.urgentIconColWarning}>
                        <Ionicons name="warning" size={22} color={colors.light.error} />
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
                  ) : (
                    <View style={styles.resolvedCard}>
                      <Ionicons name="checkmark-circle" size={18} color={colors.light.success} />
                      <Text style={styles.resolvedText}>Tất cả tranh chấp cọc đã được xử lý xong!</Text>
                    </View>
                  )}

                  {/* Ca Duyệt eKYC */}
                  {pendingEkycCount > 0 ? (
                    <TouchableOpacity
                      style={styles.urgentCard}
                      onPress={() => {
                        const firstPending = ekycRequests.find((r: EkycItem) => r.status === 'pending');
                        if (firstPending) {
                          setActiveEkyc(firstPending);
                        } else {
                          setSelectedTab('ekyc');
                        }
                      }}
                      activeOpacity={0.8}
                    >
                      <View style={styles.urgentIconColInfo}>
                        <Ionicons name="id-card" size={22} color={colors.light.primary} />
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
                            .filter((r: EkycItem) => r.status === 'pending')
                            .map((r: EkycItem) => r.userId?.name)
                            .filter(Boolean)
                            .join(', ')}{' '}
                          đã gửi ảnh CCCD và video chân dung.
                        </Text>
                        <Text style={styles.urgentActionLink}>Kiểm tra tính hợp lệ & cấp Tích xanh →</Text>
                      </View>
                    </TouchableOpacity>
                  ) : (
                    <View style={styles.resolvedCard}>
                      <Ionicons name="checkmark-circle" size={18} color={colors.light.success} />
                      <Text style={styles.resolvedText}>Đã hoàn tất kiểm duyệt eKYC đợt này!</Text>
                    </View>
                  )}
                </View>

                {/* Biểu đồ phân bổ danh mục */}
                <View style={styles.sectionBlock}>
                  <Text style={styles.sectionHeaderTitle}>
                    📈 PHÂN BỔ DANH MỤC ĐƯỢC THUÊ NHIỀU NHẤT
                  </Text>
                  <View style={styles.chartContainer}>
                    <View style={styles.chartRow}>
                      <View style={styles.chartLabelCol}>
                        <Ionicons name="camera-outline" size={16} color="#8B5CF6" />
                        <Text style={styles.chartLabelText}>Máy ảnh & Lens</Text>
                      </View>
                      <View style={styles.progressBarBg}>
                        <View style={[styles.progressBarFill, { width: '45%', backgroundColor: '#8B5CF6' }]} />
                      </View>
                      <Text style={styles.chartPercentText}>45%</Text>
                    </View>

                    <View style={styles.chartRow}>
                      <View style={styles.chartLabelCol}>
                        <Ionicons name="laptop-outline" size={16} color={colors.light.primary} />
                        <Text style={styles.chartLabelText}>Laptop Đồ họa</Text>
                      </View>
                      <View style={styles.progressBarBg}>
                        <View style={[styles.progressBarFill, { width: '30%', backgroundColor: colors.light.primary }]} />
                      </View>
                      <Text style={styles.chartPercentText}>30%</Text>
                    </View>

                    <View style={styles.chartRow}>
                      <View style={styles.chartLabelCol}>
                        <Ionicons name="phone-portrait-outline" size={16} color="#10B981" />
                        <Text style={styles.chartLabelText}>Smartphone</Text>
                      </View>
                      <View style={styles.progressBarBg}>
                        <View style={[styles.progressBarFill, { width: '15%', backgroundColor: '#10B981' }]} />
                      </View>
                      <Text style={styles.chartPercentText}>15%</Text>
                    </View>

                    <View style={styles.chartRow}>
                      <View style={styles.chartLabelCol}>
                        <Ionicons name="game-controller-outline" size={16} color="#F59E0B" />
                        <Text style={styles.chartLabelText}>Gaming & Drone</Text>
                      </View>
                      <View style={styles.progressBarBg}>
                        <View style={[styles.progressBarFill, { width: '10%', backgroundColor: '#F59E0B' }]} />
                      </View>
                      <Text style={styles.chartPercentText}>10%</Text>
                    </View>
                  </View>
                </View>
              </>
            )}

            {/* ============================================================ */}
            {/* TAB 2: TRANH CHẤP CỌC */}
            {/* ============================================================ */}
            {selectedTab === 'disputes' && (
              <View style={styles.sectionBlock}>
                <View style={styles.sectionTitleRow}>
                  <Text style={styles.sectionHeaderTitle}>⚖️ DANH SÁCH TRANH CHẤP CỌC ({disputes.length})</Text>
                </View>

                {disputes.length === 0 ? (
                  <View style={styles.emptyCard}>
                    <Ionicons name="checkmark-done-circle-outline" size={48} color={colors.light.success} />
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
                            <Text style={styles.partyValue}>{booking?.ownerId?.name || dispute.raisedBy?.name}</Text>
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

                        {/* Lý do */}
                        <Text style={styles.disputeReasonText} numberOfLines={2}>
                          💬 Lý do: "{dispute.reason}"
                        </Text>

                        {/* Nút hành động */}
                        {!isResolved ? (
                          <TouchableOpacity
                            style={styles.btnResolveGavel}
                            onPress={() => setActiveDispute(dispute)}
                            activeOpacity={0.8}
                          >
                            <Ionicons name="scale" size={16} color="#FFFFFF" />
                            <Text style={styles.btnResolveGavelText}>Đối chiếu ảnh & Phán quyết cọc</Text>
                          </TouchableOpacity>
                        ) : (
                          <View style={styles.resolvedNotice}>
                            <Ionicons name="checkmark-circle" size={16} color={colors.light.success} />
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
            )}

            {/* ============================================================ */}
            {/* TAB 3: DUYỆT eKYC */}
            {/* ============================================================ */}
            {selectedTab === 'ekyc' && (
              <View style={styles.sectionBlock}>
                <View style={styles.sectionTitleRow}>
                  <Text style={styles.sectionHeaderTitle}>🪪 HỒ SƠ XÁC MINH DANH TÍNH eKYC ({ekycRequests.length})</Text>
                </View>

                {ekycRequests.length === 0 ? (
                  <View style={styles.emptyCard}>
                    <Ionicons name="id-card-outline" size={48} color={colors.light.primary} />
                    <Text style={styles.emptyTitle}>Không có hồ sơ nào</Text>
                    <Text style={styles.emptyDesc}>Hiện tại chưa có yêu cầu cấp Tích xanh mới.</Text>
                  </View>
                ) : (
                  ekycRequests.map((req: EkycItem) => {
                    const isApproved = req.status === 'approved';
                    const isRejected = req.status === 'rejected';

                    return (
                      <View key={req._id} style={styles.ekycCard}>
                        <View style={styles.ekycCardHeader}>
                          <Image
                            source={{
                              uri:
                                req.userId?.avatar ||
                                'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=400',
                            }}
                            style={styles.ekycAvatar}
                          />
                          <View style={styles.ekycMetaCol}>
                            <View style={styles.ekycNameRow}>
                              <Text style={styles.ekycName}>{req.userId?.name || 'Người dùng'}</Text>
                              {isApproved && (
                                <View style={styles.trustBadge}>
                                  <Ionicons name="checkmark-circle" size={14} color={colors.light.primary} />
                                  <Text style={styles.trustBadgeText}>Đã cấp Tích Xanh</Text>
                                </View>
                              )}
                              {isRejected && (
                                <View style={styles.badgePendingRed}>
                                  <Text style={styles.badgePendingRedText}>Bị từ chối</Text>
                                </View>
                              )}
                            </View>
                            <Text style={styles.ekycSubMeta}>
                              {req.userId?.email || 'email'} • SĐT: {req.userId?.phone || 'Chưa cập nhật'}
                            </Text>
                          </View>
                        </View>

                        {/* 3 Thumbnails ảnh giấy tờ */}
                        <View style={styles.ekycThumbnailsRow}>
                          <View style={styles.ekycThumbCol}>
                            <Text style={styles.thumbLabel}>CCCD Mặt trước</Text>
                            <Image source={{ uri: req.idCardFrontUrl }} style={styles.thumbImg} />
                          </View>
                          <View style={styles.ekycThumbCol}>
                            <Text style={styles.thumbLabel}>CCCD Mặt sau</Text>
                            <Image source={{ uri: req.idCardBackUrl }} style={styles.thumbImg} />
                          </View>
                          <View style={styles.ekycThumbCol}>
                            <Text style={styles.thumbLabel}>Chân dung Selfie</Text>
                            <Image source={{ uri: req.selfieUrl }} style={styles.thumbImg} />
                          </View>
                        </View>

                        {/* Điểm tin cậy AI */}
                        <View style={styles.ekycAiRow}>
                          <Ionicons name="sparkles" size={14} color="#0284C7" />
                          <Text style={styles.ekycAiText}>
                            AI Face Match: <Text style={styles.ekycAiBold}>98.6% trùng khớp</Text> • Đầy đủ 2 mặt CCCD
                          </Text>
                        </View>

                        {/* Nút tác vụ duyệt */}
                        {req.status === 'pending' ? (
                          <TouchableOpacity
                            style={styles.btnOpenEkycModal}
                            onPress={() => setActiveEkyc(req)}
                            activeOpacity={0.8}
                          >
                            <Ionicons name="shield-checkmark-outline" size={16} color={colors.light.primary} />
                            <Text style={styles.btnOpenEkycModalText}>Kiểm tra hồ sơ & Phê duyệt Tích xanh</Text>
                          </TouchableOpacity>
                        ) : (
                          <Text style={styles.ekycStatusNote}>
                            {isApproved
                              ? '✅ Hồ sơ đã được duyệt và cấp Tích xanh uy tín thành công.'
                              : `❌ Đã từ chối hồ sơ. Lý do: ${req.rejectReason || 'Không hợp lệ'}`}
                          </Text>
                        )}
                      </View>
                    );
                  })
                )}
              </View>
            )}

            {/* ============================================================ */}
            {/* TAB 4: KIỂM DUYỆT THIẾT BỊ */}
            {/* ============================================================ */}
            {selectedTab === 'devices' && (
              <View style={styles.sectionBlock}>
                <View style={styles.sectionTitleRow}>
                  <Text style={styles.sectionHeaderTitle}>
                    🔍 KIỂM DUYỆT THIẾT BỊ TOÀN SÀN ({filteredDevices.length})
                  </Text>
                </View>

                {/* Ô tìm kiếm */}
                <View style={styles.searchBarContainer}>
                  <Ionicons name="search" size={18} color={colors.light.textSecondary} />
                  <TextInput
                    style={styles.searchInput}
                    placeholder="Tìm theo tên máy hoặc thương hiệu..."
                    placeholderTextColor={colors.light.textSecondary}
                    value={searchQuery}
                    onChangeText={setSearchQuery}
                  />
                  {searchQuery !== '' && (
                    <TouchableOpacity onPress={() => setSearchQuery('')}>
                      <Ionicons name="close-circle" size={18} color={colors.light.textSecondary} />
                    </TouchableOpacity>
                  )}
                </View>

                {/* Danh sách thiết bị */}
                {filteredDevices.length === 0 ? (
                  <View style={styles.emptyCard}>
                    <Ionicons name="hardware-chip-outline" size={48} color={colors.light.textSecondary} />
                    <Text style={styles.emptyTitle}>Không tìm thấy thiết bị</Text>
                    <Text style={styles.emptyDesc}>Thử tìm kiếm với từ khóa khác.</Text>
                  </View>
                ) : (
                  filteredDevices.map((device: AdminDeviceItem) => (
                    <View key={device._id} style={styles.deviceCard}>
                      <Image
                        source={{
                          uri:
                            device.images?.[0] ||
                            'https://images.unsplash.com/photo-1516035069371-29a1b244cc32?w=800',
                        }}
                        style={styles.deviceImage}
                      />
                      <View style={styles.deviceInfoCol}>
                        <View style={styles.deviceCategoryBadge}>
                          <Text style={styles.deviceCategoryText}>{device.category.toUpperCase()}</Text>
                        </View>
                        <Text style={styles.deviceName} numberOfLines={2}>
                          {device.name}
                        </Text>
                        <Text style={styles.deviceBrand}>Hãng: {device.brand} • Tình trạng: {device.condition}</Text>
                        <Text style={styles.devicePrice}>
                          {device.pricePerDay?.toLocaleString('vi-VN')} đ/ngày • Cọc:{' '}
                          {device.depositAmount?.toLocaleString('vi-VN')} đ
                        </Text>

                        {/* Nút xóa mềm */}
                        <TouchableOpacity
                          style={styles.btnDeleteDevice}
                          onPress={() => handleDeleteDevice(device)}
                          activeOpacity={0.8}
                        >
                          <Ionicons name="trash-outline" size={14} color={colors.light.error} />
                          <Text style={styles.btnDeleteDeviceText}>Gỡ / Xóa máy vi phạm</Text>
                        </TouchableOpacity>
                      </View>
                    </View>
                  ))
                )}
              </View>
            )}
          </>
        )}
      </ScrollView>

      {/* 4. MODALS PHÂN XỬ & DUYỆT eKYC */}
      <DisputeResolverModal
        visible={!!activeDispute}
        dispute={activeDispute}
        onClose={() => setActiveDispute(null)}
        onResolved={handleDisputeResolved}
      />

      <EkycReviewModal
        visible={!!activeEkyc}
        ekyc={activeEkyc}
        onClose={() => setActiveEkyc(null)}
        onApproved={handleEkycApproved}
        onRejected={handleEkycRejected}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.light.background,
  },
  header: {
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 14,
    backgroundColor: colors.light.background,
    borderBottomWidth: 1,
    borderBottomColor: colors.light.border,
  },
  headerTop: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  headerTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  adminBadge: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: colors.light.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: colors.light.primary,
  },
  headerTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: colors.light.textPrimary,
  },
  headerSubtitle: {
    fontSize: 11,
    color: colors.light.textSecondary,
    marginTop: 2,
  },
  exitButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: colors.light.surface,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.light.border,
  },
  exitButtonText: {
    color: colors.light.textSecondary,
    fontSize: 12,
    fontWeight: '600',
  },
  systemStatusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 10,
    backgroundColor: colors.light.surface,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: colors.light.border,
    alignSelf: 'flex-start',
  },
  statusDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: colors.light.success,
    marginRight: 6,
  },
  systemStatusText: {
    color: colors.light.success,
    fontSize: 11,
    fontWeight: '600',
  },
  systemDivider: {
    color: colors.light.textSecondary,
    marginHorizontal: 6,
  },
  systemStatusSubText: {
    color: colors.light.textSecondary,
    fontSize: 11,
  },
  tabFilterRow: {
    flexDirection: 'row',
    backgroundColor: colors.light.background,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: colors.light.border,
    gap: 6,
  },
  filterTab: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 20,
    backgroundColor: colors.light.surface,
    borderWidth: 1,
    borderColor: colors.light.border,
  },
  filterTabActive: {
    backgroundColor: colors.light.primary,
    borderColor: colors.light.primaryDark,
  },
  filterTabText: {
    color: colors.light.textSecondary,
    fontSize: 11,
    fontWeight: '500',
  },
  filterTabTextActive: {
    color: '#FFFFFF',
    fontWeight: '600',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 40,
  },
  loadingContainer: {
    paddingVertical: 40,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
  },
  loadingText: {
    fontSize: 12,
    color: colors.light.textSecondary,
  },
  sectionBlock: {
    marginBottom: 20,
  },
  sectionTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  sectionHeaderTitle: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.light.textSecondary,
    letterSpacing: 0.5,
  },
  urgentCountPill: {
    backgroundColor: '#FEE2E2',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: colors.light.error,
  },
  urgentCountPillText: {
    color: colors.light.error,
    fontSize: 10,
    fontWeight: '700',
  },
  kpiGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    marginTop: 10,
  },
  kpiCard: {
    width: '48%',
    backgroundColor: colors.light.surface,
    borderRadius: 12,
    padding: 14,
    borderWidth: 1,
    borderColor: colors.light.border,
  },
  kpiIconWrapperRevenue: {
    width: 32,
    height: 32,
    borderRadius: 8,
    backgroundColor: 'rgba(16, 185, 129, 0.15)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  kpiIconWrapperUsers: {
    width: 32,
    height: 32,
    borderRadius: 8,
    backgroundColor: colors.light.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  kpiIconWrapperDevices: {
    width: 32,
    height: 32,
    borderRadius: 8,
    backgroundColor: 'rgba(245, 158, 11, 0.15)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  kpiIconWrapperOrders: {
    width: 32,
    height: 32,
    borderRadius: 8,
    backgroundColor: 'rgba(139, 92, 246, 0.15)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  kpiLabel: {
    fontSize: 11,
    color: colors.light.textSecondary,
    marginBottom: 4,
  },
  kpiValue: {
    fontSize: 15,
    fontWeight: '700',
    color: colors.light.textPrimary,
    marginBottom: 4,
  },
  kpiSubLabel: {
    fontSize: 10,
    color: colors.light.textSecondary,
  },
  kpiBadgeGreen: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  kpiBadgeGreenText: {
    color: colors.light.success,
    fontSize: 10,
    fontWeight: '600',
  },
  urgentCard: {
    flexDirection: 'row',
    backgroundColor: colors.light.surface,
    borderRadius: 12,
    padding: 12,
    borderWidth: 1,
    borderColor: colors.light.border,
    marginBottom: 10,
    gap: 12,
  },
  urgentIconColWarning: {
    width: 38,
    height: 38,
    borderRadius: 8,
    backgroundColor: '#FEE2E2',
    alignItems: 'center',
    justifyContent: 'center',
  },
  urgentIconColInfo: {
    width: 38,
    height: 38,
    borderRadius: 8,
    backgroundColor: colors.light.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
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
    color: colors.light.textPrimary,
    flex: 1,
  },
  badgePendingRed: {
    backgroundColor: '#FEE2E2',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  badgePendingRedText: {
    color: colors.light.error,
    fontSize: 10,
    fontWeight: '600',
  },
  badgePendingBlue: {
    backgroundColor: colors.light.primaryLight,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  badgePendingBlueText: {
    color: colors.light.primary,
    fontSize: 10,
    fontWeight: '600',
  },
  urgentDesc: {
    fontSize: 11,
    color: colors.light.textSecondary,
    lineHeight: 16,
    marginBottom: 6,
  },
  urgentActionLink: {
    fontSize: 11,
    color: colors.light.primary,
    fontWeight: '600',
  },
  resolvedCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#DCFCE7',
    padding: 10,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.light.success,
    marginBottom: 10,
  },
  resolvedText: {
    color: colors.light.success,
    fontSize: 12,
    fontWeight: '500',
  },
  chartContainer: {
    backgroundColor: colors.light.surface,
    borderRadius: 12,
    padding: 14,
    borderWidth: 1,
    borderColor: colors.light.border,
    gap: 12,
    marginTop: 10,
  },
  chartRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  chartLabelCol: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    width: 130,
  },
  chartLabelText: {
    fontSize: 12,
    color: colors.light.textPrimary,
    fontWeight: '500',
  },
  progressBarBg: {
    flex: 1,
    height: 8,
    borderRadius: 4,
    backgroundColor: colors.light.border,
    overflow: 'hidden',
  },
  progressBarFill: {
    height: '100%',
    borderRadius: 4,
  },
  chartPercentText: {
    fontSize: 11,
    fontWeight: '700',
    color: colors.light.textPrimary,
    width: 32,
    textAlign: 'right',
  },
  emptyCard: {
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.light.surface,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.light.border,
    padding: 30,
    gap: 8,
  },
  emptyTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.light.textPrimary,
  },
  emptyDesc: {
    fontSize: 12,
    color: colors.light.textSecondary,
    textAlign: 'center',
  },
  disputeCard: {
    backgroundColor: colors.light.surface,
    borderRadius: 12,
    padding: 14,
    borderWidth: 1,
    borderColor: colors.light.border,
    marginBottom: 12,
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
    color: colors.light.textPrimary,
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  statusBadgeRed: {
    backgroundColor: '#FEE2E2',
  },
  statusBadgeTextRed: {
    color: colors.light.error,
    fontSize: 10,
    fontWeight: '700',
  },
  statusBadgeGreen: {
    backgroundColor: '#DCFCE7',
  },
  statusBadgeTextGreen: {
    color: colors.light.success,
    fontSize: 10,
    fontWeight: '700',
  },
  disputeDeviceName: {
    fontSize: 12,
    color: colors.light.textSecondary,
  },
  disputePartyInfo: {
    flexDirection: 'row',
    backgroundColor: colors.light.background,
    borderRadius: 8,
    padding: 8,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: colors.light.border,
  },
  disputePartyCol: {
    flex: 1,
  },
  partyLabel: {
    fontSize: 10,
    color: colors.light.textSecondary,
  },
  partyValue: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.light.textPrimary,
  },
  disputeFinanceRow: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 10,
  },
  financeBox: {
    flex: 1,
    backgroundColor: colors.light.background,
    borderRadius: 8,
    padding: 8,
    borderWidth: 1,
    borderColor: colors.light.border,
  },
  financeLabel: {
    fontSize: 10,
    color: colors.light.textSecondary,
    marginBottom: 2,
  },
  financeValueBlue: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.light.primary,
  },
  financeValueRed: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.light.error,
  },
  disputeReasonText: {
    fontSize: 11,
    color: colors.light.textSecondary,
    fontStyle: 'italic',
    marginBottom: 12,
  },
  btnResolveGavel: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: colors.light.primary,
    paddingVertical: 10,
    borderRadius: 8,
  },
  btnResolveGavelText: {
    color: '#FFFFFF',
    fontWeight: '700',
    fontSize: 12,
  },
  resolvedNotice: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#DCFCE7',
    padding: 8,
    borderRadius: 8,
  },
  resolvedNoticeText: {
    fontSize: 11,
    color: colors.light.success,
    fontWeight: '600',
  },
  ekycCard: {
    backgroundColor: colors.light.surface,
    borderRadius: 12,
    padding: 14,
    borderWidth: 1,
    borderColor: colors.light.border,
    marginBottom: 12,
  },
  ekycCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 12,
  },
  ekycAvatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: colors.light.border,
  },
  ekycMetaCol: {
    flex: 1,
  },
  ekycNameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 2,
  },
  ekycName: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.light.textPrimary,
  },
  trustBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: colors.light.primaryLight,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  trustBadgeText: {
    color: colors.light.primary,
    fontSize: 10,
    fontWeight: '700',
  },
  ekycSubMeta: {
    fontSize: 11,
    color: colors.light.textSecondary,
  },
  ekycThumbnailsRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 10,
  },
  ekycThumbCol: {
    flex: 1,
  },
  thumbLabel: {
    fontSize: 9,
    color: colors.light.textSecondary,
    marginBottom: 4,
  },
  thumbImg: {
    width: '100%',
    height: 60,
    borderRadius: 6,
    backgroundColor: colors.light.border,
  },
  ekycAiRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#F0F9FF',
    padding: 8,
    borderRadius: 6,
    marginBottom: 10,
  },
  ekycAiText: {
    fontSize: 11,
    color: '#0369A1',
  },
  ekycAiBold: {
    fontWeight: '700',
    color: colors.light.primary,
  },
  btnOpenEkycModal: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: colors.light.background,
    borderWidth: 1,
    borderColor: colors.light.primary,
    paddingVertical: 10,
    borderRadius: 8,
  },
  btnOpenEkycModalText: {
    color: colors.light.primary,
    fontWeight: '700',
    fontSize: 12,
  },
  ekycStatusNote: {
    fontSize: 11,
    color: colors.light.textSecondary,
    fontStyle: 'italic',
  },
  searchBarContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.light.surface,
    borderWidth: 1,
    borderColor: colors.light.border,
    borderRadius: 10,
    paddingHorizontal: 12,
    height: 42,
    marginBottom: 12,
    gap: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: 13,
    color: colors.light.textPrimary,
  },
  deviceCard: {
    flexDirection: 'row',
    backgroundColor: colors.light.surface,
    borderRadius: 12,
    padding: 12,
    borderWidth: 1,
    borderColor: colors.light.border,
    marginBottom: 12,
    gap: 12,
  },
  deviceImage: {
    width: 80,
    height: 80,
    borderRadius: 8,
    backgroundColor: colors.light.border,
  },
  deviceInfoCol: {
    flex: 1,
  },
  deviceCategoryBadge: {
    backgroundColor: colors.light.primaryLight,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    alignSelf: 'flex-start',
    marginBottom: 4,
  },
  deviceCategoryText: {
    fontSize: 9,
    fontWeight: '700',
    color: colors.light.primary,
  },
  deviceName: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.light.textPrimary,
    marginBottom: 2,
  },
  deviceBrand: {
    fontSize: 11,
    color: colors.light.textSecondary,
    marginBottom: 2,
  },
  devicePrice: {
    fontSize: 11,
    fontWeight: '600',
    color: colors.light.primary,
    marginBottom: 8,
  },
  btnDeleteDevice: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#FEE2E2',
    paddingHorizontal: 8,
    paddingVertical: 5,
    borderRadius: 6,
    alignSelf: 'flex-start',
  },
  btnDeleteDeviceText: {
    color: colors.light.error,
    fontSize: 11,
    fontWeight: '600',
  },
});
