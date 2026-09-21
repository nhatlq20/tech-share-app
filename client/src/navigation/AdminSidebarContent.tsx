import React, { useState, useEffect } from 'react';
import {
  StyleSheet,
  View,
  Text,
  TouchableOpacity,
  Image,
  ScrollView,
  Platform,
  StatusBar,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { DrawerContentComponentProps } from '@react-navigation/drawer';
import { Ionicons } from '@expo/vector-icons';
import { useDispatch, useSelector } from 'react-redux';
import { theme } from '../constants/theme';
import { RootState } from '../store';
import { clearAuth } from '../store/slices/authSlice';
import { socketService } from '../services/socketService';
import { adminService } from '../services/adminService';
import { LogoutConfirmModal } from '../components/common/LogoutConfirmModal';

interface AdminMenuItem {
  id: string;
  label: string;
  icon: keyof typeof Ionicons.glyphMap;
  targetScreen: string;
  tabParam?: 'overview' | 'disputes' | 'ekyc' | 'devices' | 'users' | 'vouchers';
  badgeType?: 'disputes' | 'ekyc';
}

const MENU_ITEMS: AdminMenuItem[] = [
  {
    id: 'overview',
    label: 'Bảng điều khiển & KPI',
    icon: 'stats-chart-outline',
    targetScreen: 'AdminDashboard',
    tabParam: 'overview',
  },
  {
    id: 'users',
    label: 'Quản lý Người dùng',
    icon: 'people-outline',
    targetScreen: 'AdminDashboard',
    tabParam: 'users',
  },
  {
    id: 'devices',
    label: 'Kiểm duyệt Thiết bị',
    icon: 'hardware-chip-outline',
    targetScreen: 'AdminDashboard',
    tabParam: 'devices',
  },
  {
    id: 'disputes',
    label: 'Phân xử Tranh chấp Cọc',
    icon: 'scale-outline',
    targetScreen: 'AdminDashboard',
    tabParam: 'disputes',
    badgeType: 'disputes',
  },
  {
    id: 'ekyc',
    label: 'Xét duyệt eKYC',
    icon: 'finger-print-outline',
    targetScreen: 'AdminDashboard',
    tabParam: 'ekyc',
    badgeType: 'ekyc',
  },
  {
    id: 'vouchers',
    label: 'Voucher & Khuyến mãi',
    icon: 'pricetags-outline',
    targetScreen: 'AdminDashboard',
    tabParam: 'vouchers',
  },
];

export function AdminSidebarContent(props: DrawerContentComponentProps) {
  const insets = useSafeAreaInsets();
  const { navigation, state } = props;
  const dispatch = useDispatch();
  const user = useSelector((state: RootState) => state.auth.user);

  const [pendingCounts, setPendingCounts] = useState({
    disputes: 1,
    ekyc: 2,
  });
  const [showLogoutModal, setShowLogoutModal] = useState(false);

  useEffect(() => {
    adminService
      .getAnalytics()
      .then(res => {
        if (res?.pendingTasks) {
          setPendingCounts({
            disputes: res.pendingTasks.disputes || 0,
            ekyc: res.pendingTasks.ekyc || 0,
          });
        }
      })
      .catch(() => {});
  }, []);

  const activeRouteName = state.routes[state.index]?.name || 'AdminDashboard';
  const currentParams = (state.routes[state.index]?.params as any) || {};
  const currentTab = currentParams.initialTab || 'overview';

  const handleMenuItemPress = (item: AdminMenuItem) => {
    navigation.closeDrawer();
    if (item.tabParam) {
      navigation.navigate(item.targetScreen, {
        initialTab: item.tabParam,
        _t: Date.now(),
      });
    } else {
      navigation.navigate(item.targetScreen);
    }
  };

  const handleConfirmLogout = () => {
    setShowLogoutModal(false);
    navigation.closeDrawer();
    socketService.disconnect();
    dispatch(clearAuth());
  };

  return (
    <View style={styles.container}>
      {/* ── 1. SIDEBAR HEADER ── */}
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
        {/* Brand Logo Row */}
        <View style={styles.brandRow}>
          <View style={styles.logoBadge}>
            <Ionicons name="shield-checkmark" size={20} color={theme.colors.primary[600]} />
          </View>
          <View>
            <Text style={styles.brandTitle}>TechShare Admin</Text>
            <Text style={styles.brandSubtitle}>Control Center</Text>
          </View>
        </View>

        {/* Admin Profile Box */}
        <View style={styles.profileBox}>
          <Image
            source={{
              uri:
                user?.avatar ||
                'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=400',
            }}
            style={styles.adminAvatar}
          />
          <View style={styles.profileInfo}>
            <Text style={styles.adminName} numberOfLines={1}>
              {user?.name || 'Quản trị viên'}
            </Text>
            <Text style={styles.adminEmail} numberOfLines={1}>
              {user?.email || 'admin@techshare.vn'}
            </Text>

            {/* Badge System Administrator */}
            <View style={styles.roleBadge}>
              <Text style={styles.roleBadgeText}>System Administrator</Text>
            </View>
          </View>
        </View>
      </View>

      {/* ── 2. DANH MỤC MENU QUẢN TRỊ CỐT LÕI ── */}
      <ScrollView
        style={styles.menuScrollView}
        contentContainerStyle={styles.menuScrollContent}
        showsVerticalScrollIndicator={false}
      >
        <Text style={styles.menuSectionHeader}>MENU QUẢN TRỊ HỆ THỐNG</Text>

        {MENU_ITEMS.map(item => {
          // Xác định active state dựa vào targetScreen và tabParam
          let isActive = false;
          if (activeRouteName === 'AdminDashboard' && item.targetScreen === 'AdminDashboard') {
            isActive = currentTab === item.tabParam;
          } else if (activeRouteName === item.targetScreen) {
            isActive = true;
          }

          const badgeCount =
            item.badgeType === 'disputes'
              ? pendingCounts.disputes
              : item.badgeType === 'ekyc'
              ? pendingCounts.ekyc
              : 0;

          return (
            <TouchableOpacity
              key={item.id}
              style={[styles.menuItem, isActive && styles.menuItemActive]}
              onPress={() => handleMenuItemPress(item)}
              activeOpacity={0.75}
            >
              <View style={styles.menuItemLeft}>
                <View
                  style={[
                    styles.menuIconContainer,
                    isActive && styles.menuIconContainerActive,
                  ]}
                >
                  <Ionicons
                    name={item.icon}
                    size={18}
                    color={isActive ? theme.colors.primary[600] : theme.colors.slate[600]}
                  />
                </View>
                <Text style={[styles.menuItemLabel, isActive && styles.menuItemLabelActive]}>
                  {item.label}
                </Text>
              </View>

              {/* Badge số lượng việc cần làm nếu có */}
              {badgeCount > 0 && (
                <View
                  style={[
                    styles.menuBadge,
                    item.badgeType === 'disputes' ? styles.menuBadgeRed : styles.menuBadgeBlue,
                  ]}
                >
                  <Text
                    style={[
                      styles.menuBadgeText,
                      item.badgeType === 'disputes'
                        ? styles.menuBadgeTextRed
                        : styles.menuBadgeTextBlue,
                    ]}
                  >
                    {badgeCount}
                  </Text>
                </View>
              )}
            </TouchableOpacity>
          );
        })}
      </ScrollView>

      {/* ── 3. SIDEBAR FOOTER ── */}
      <View style={styles.footer}>
        {/* Nút Đăng xuất */}
        <TouchableOpacity
          style={styles.logoutButton}
          onPress={() => setShowLogoutModal(true)}
          activeOpacity={0.8}
        >
          <Ionicons name="log-out-outline" size={18} color={theme.colors.danger[600]} />
          <Text style={styles.logoutButtonText}>Đăng xuất phiên Admin</Text>
        </TouchableOpacity>
      </View>

      {/* ── 4. MODAL XÁC NHẬN ĐĂNG XUẤT (TÁI SỬ DỤNG) ── */}
      <LogoutConfirmModal
        visible={showLogoutModal}
        onClose={() => setShowLogoutModal(false)}
        onConfirm={handleConfirmLogout}
        subtitle="Bạn có chắc chắn muốn kết thúc phiên làm việc và đăng xuất khỏi TechShare Admin?"
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.card,
  },
  header: {
    paddingHorizontal: theme.spacing.md,
    paddingBottom: theme.spacing.md,
    backgroundColor: theme.colors.slate[50],
    borderBottomWidth: 1,
    borderBottomColor: theme.border,
  },
  brandRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: theme.spacing.md,
  },
  logoBadge: {
    width: 36,
    height: 36,
    borderRadius: theme.radii.sm,
    backgroundColor: theme.colors.primary[50],
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: theme.colors.primary[500],
  },
  brandTitle: {
    ...theme.typography.subheading,
    fontSize: 16,
    color: theme.textPrimary,
  },
  brandSubtitle: {
    ...theme.typography.caption,
    color: theme.textSecondary,
  },
  profileBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.card,
    borderRadius: theme.radii.md,
    padding: 10,
    borderWidth: 1,
    borderColor: theme.border,
    marginBottom: theme.spacing.sm,
    gap: 10,
    ...theme.shadows.subtle,
  },
  adminAvatar: {
    width: 44,
    height: 44,
    borderRadius: theme.radii.full,
    borderWidth: 1.5,
    borderColor: theme.colors.primary[500],
    backgroundColor: theme.colors.slate[200],
  },
  profileInfo: {
    flex: 1,
  },
  adminName: {
    ...theme.typography.body,
    fontWeight: '700',
    color: theme.textPrimary,
  },
  adminEmail: {
    ...theme.typography.caption,
    color: theme.textSecondary,
    marginBottom: 4,
  },
  roleBadge: {
    backgroundColor: theme.colors.danger[50],
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: theme.radii.sm,
    borderWidth: 1,
    borderColor: theme.colors.danger[500],
    alignSelf: 'flex-start',
  },
  roleBadgeText: {
    fontSize: 9,
    fontWeight: '700',
    color: theme.colors.danger[600],
    letterSpacing: 0.2,
  },

  menuScrollView: {
    flex: 1,
  },
  menuScrollContent: {
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.md,
    gap: 6,
  },
  menuSectionHeader: {
    fontSize: 11,
    fontWeight: '700',
    color: theme.textSecondary,
    letterSpacing: 0.5,
    marginBottom: 6,
    paddingHorizontal: 4,
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: theme.radii.md,
    borderWidth: 1,
    borderColor: 'transparent',
  },
  menuItemActive: {
    backgroundColor: theme.colors.primary[50],
    borderColor: theme.colors.primary[500],
  },
  menuItemLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    flex: 1,
  },
  menuIconContainer: {
    width: 28,
    height: 28,
    borderRadius: theme.radii.sm,
    alignItems: 'center',
    justifyContent: 'center',
  },
  menuIconContainerActive: {
    backgroundColor: theme.card,
  },
  menuItemLabel: {
    ...theme.typography.body,
    fontSize: 13,
    fontWeight: '500',
    color: theme.colors.slate[600],
  },
  menuItemLabelActive: {
    color: theme.colors.primary[600],
    fontWeight: '700',
  },
  menuBadge: {
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: theme.radii.full,
    borderWidth: 1,
  },
  menuBadgeRed: {
    backgroundColor: theme.colors.danger[50],
    borderColor: theme.colors.danger[500],
  },
  menuBadgeTextRed: {
    color: theme.colors.danger[600],
    fontSize: 10,
    fontWeight: '700',
  },
  menuBadgeBlue: {
    backgroundColor: theme.colors.primary[50],
    borderColor: theme.colors.primary[500],
  },
  menuBadgeTextBlue: {
    color: theme.colors.primary[600],
    fontSize: 10,
    fontWeight: '700',
  },

  footer: {
    paddingHorizontal: theme.spacing.md,
    paddingTop: theme.spacing.sm,
    paddingBottom: theme.spacing.lg,
    borderTopWidth: 1,
    borderTopColor: theme.border,
    backgroundColor: theme.colors.slate[50],
    gap: theme.spacing.sm,
  },
  logoutButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: theme.colors.danger[50],
    borderRadius: theme.radii.full,
    paddingVertical: 12,
  },
  logoutButtonText: {
    color: theme.colors.danger[600],
    fontSize: 13,
    fontWeight: '700',
  },
});
