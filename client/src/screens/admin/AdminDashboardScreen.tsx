import React, { useState, useEffect, useCallback } from 'react';
import {
  StyleSheet,
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  Alert,
  RefreshControl,
  ActivityIndicator,
  Platform,
  StatusBar,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { theme } from '../../constants/theme';
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
import { OverviewTab } from '../../components/admin/tabs/OverviewTab';
import { DisputesTab } from '../../components/admin/tabs/DisputesTab';
import { EkycTab } from '../../components/admin/tabs/EkycTab';
import { DevicesTab } from '../../components/admin/tabs/DevicesTab';
import { UsersTab } from '../../components/admin/tabs/UsersTab';
import { VouchersTab } from '../../components/admin/tabs/VouchersTab';

export type AdminTab = 'overview' | 'disputes' | 'ekyc' | 'devices' | 'users' | 'vouchers';

interface AdminDashboardScreenProps {
  onBackToHome?: () => void;
  onOpenDrawer?: () => void;
  navigation?: any;
  route?: any;
}

export function AdminDashboardScreen({
  onBackToHome,
  onOpenDrawer,
  navigation,
  route,
}: AdminDashboardScreenProps) {
  const insets = useSafeAreaInsets();
  const initialTab = (route?.params?.initialTab as AdminTab) || 'overview';
  const [selectedTab, setSelectedTab] = useState(initialTab as AdminTab);

  useEffect(() => {
    if (route?.params?.initialTab) {
      setSelectedTab(route.params.initialTab as AdminTab);
    }
  }, [route?.params?.initialTab, route?.params?._t]);

  // Core Data States
  const [analytics, setAnalytics] = useState(FALLBACK_ANALYTICS as AdminAnalytics);
  const [disputes, setDisputes] = useState(FALLBACK_DISPUTES as DisputeItem[]);
  const [ekycRequests, setEkycRequests] = useState(FALLBACK_EKYC as EkycItem[]);
  const [devices, setDevices] = useState(FALLBACK_ADMIN_DEVICES as AdminDeviceItem[]);

  // Modals States
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

  // Action Handlers
  const handleDisputeResolved = (
    disputeId: string,
    decision: DisputeDecision,
    deductAmount: number,
    _refundAmount: number
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

  const getHeaderTitle = () => {
    switch (selectedTab) {
      case 'disputes':
        return 'Phân xử Tranh chấp';
      case 'ekyc':
        return 'Xét duyệt eKYC';
      case 'devices':
        return 'Kiểm duyệt Thiết bị';
      case 'users':
        return 'Quản lý Người dùng';
      case 'vouchers':
        return 'Voucher & Khuyến mãi';
      default:
        return 'TechShare Admin Hub';
    }
  };

  return (
    <View style={styles.container}>
      {/* ── 1. HEADER QUẢN TRỊ ADMIN HUB (Soft Surface) ── */}
      <View
        style={[
          styles.header,
          {
            paddingTop:
              Math.max(
                insets.top,
                Platform.OS === 'android' ? StatusBar.currentHeight || 24 : 20
              ) + theme.spacing.sm,
          },
        ]}
      >
        <View style={styles.headerTop}>
          <View style={styles.headerLeftGroup}>
            {/* Nút Hamburger mềm mại bo tròn */}
            <TouchableOpacity
              style={styles.hamburgerButton}
              onPress={() => {
                if (onOpenDrawer) {
                  onOpenDrawer();
                } else if (navigation?.openDrawer) {
                  navigation.openDrawer();
                }
              }}
              activeOpacity={0.7}
              accessibilityLabel="Mở menu quản trị"
            >
              <Ionicons name="menu-outline" size={24} color={theme.textPrimary} />
            </TouchableOpacity>

            <Text style={styles.headerTitle} numberOfLines={1}>
              {getHeaderTitle()}
            </Text>
          </View>

          {onBackToHome && (
            <TouchableOpacity style={styles.exitButton} onPress={onBackToHome} activeOpacity={0.8}>
              <Ionicons name="exit-outline" size={16} color={theme.textSecondary} />
              <Text style={styles.exitButtonText}>Thoát</Text>
            </TouchableOpacity>
          )}
        </View>
      </View>

      {/* ── 2. NỘI DUNG CUỘN CHÍNH (Tabs Container) ── */}
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            colors={[theme.colors.primary[600]]}
            tintColor={theme.colors.primary[600]}
          />
        }
      >
        {loading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color={theme.colors.primary[600]} />
            <Text style={styles.loadingText}>Đang tải dữ liệu TechShare Admin...</Text>
          </View>
        ) : (
          <>
            {selectedTab === 'overview' && (
              <OverviewTab
                analytics={analytics}
                disputes={disputes}
                ekycRequests={ekycRequests}
                onOpenDispute={(d) => setActiveDispute(d)}
                onOpenEkyc={(r) => setActiveEkyc(r)}
                onNavigateTab={(tab) => setSelectedTab(tab)}
              />
            )}

            {selectedTab === 'disputes' && (
              <DisputesTab
                disputes={disputes}
                onOpenDispute={(d) => setActiveDispute(d)}
              />
            )}

            {selectedTab === 'ekyc' && (
              <EkycTab
                ekycRequests={ekycRequests}
                onOpenEkyc={(r) => setActiveEkyc(r)}
              />
            )}

            {selectedTab === 'devices' && (
              <DevicesTab
                devices={devices}
                onDeleteDevice={handleDeleteDevice}
              />
            )}

            {selectedTab === 'users' && <UsersTab />}

            {selectedTab === 'vouchers' && <VouchersTab />}
          </>
        )}
      </ScrollView>

      {/* ── 3. MODALS PHÂN XỬ & DUYỆT eKYC ── */}
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
    backgroundColor: theme.colors.slate[50], // Soft light surface
  },
  header: {
    paddingHorizontal: theme.spacing.md,
    paddingBottom: theme.spacing.md,
    backgroundColor: theme.colors.white,
    ...theme.shadows.subtle,
  },
  headerTop: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  headerLeftGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flex: 1,
  },
  hamburgerButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: theme.colors.white,
    alignItems: 'center',
    justifyContent: 'center',
    ...theme.shadows.subtle,
  },
  headerTitle: {
    ...theme.typography.subheading,
    fontSize: 18,
    fontWeight: '700',
    color: theme.textPrimary,
  },
  exitButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: theme.colors.slate[100],
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: theme.radii.full,
  },
  exitButtonText: {
    color: theme.textSecondary,
    fontSize: 12,
    fontWeight: '600',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: theme.spacing.md,
    paddingTop: theme.spacing.sm,
    paddingBottom: theme.spacing.xl,
    gap: theme.spacing.md,
  },
  loadingContainer: {
    paddingVertical: 40,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
  },
  loadingText: {
    fontSize: 12,
    color: theme.textSecondary,
  },
});
