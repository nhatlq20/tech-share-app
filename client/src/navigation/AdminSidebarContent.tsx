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
import { theme, STRINGS, CONFIG } from '../constants';
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
    label: STRINGS.ADMIN_SIDEBAR.MENU_OVERVIEW,
    icon: 'stats-chart-outline',
    targetScreen: 'AdminDashboard',
    tabParam: 'overview',
  },
  {
    id: 'users',
    label: STRINGS.ADMIN_SIDEBAR.MENU_USERS,
    icon: 'people-outline',
    targetScreen: 'AdminDashboard',
    tabParam: 'users',
  },
  {
    id: 'devices',
    label: STRINGS.ADMIN_SIDEBAR.MENU_DEVICES,
    icon: 'hardware-chip-outline',
    targetScreen: 'AdminDashboard',
    tabParam: 'devices',
  },
  {
    id: 'disputes',
    label: STRINGS.ADMIN_SIDEBAR.MENU_DISPUTES,
    icon: 'scale-outline',
    targetScreen: 'AdminDashboard',
    tabParam: 'disputes',
    badgeType: 'disputes',
  },
  {
    id: 'ekyc',
    label: STRINGS.ADMIN_SIDEBAR.MENU_EKYC,
    icon: 'finger-print-outline',
    targetScreen: 'AdminDashboard',
    tabParam: 'ekyc',
    badgeType: 'ekyc',
  },
  {
    id: 'vouchers',
    label: STRINGS.ADMIN_SIDEBAR.MENU_VOUCHERS,
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
                Platform.OS === 'android' ? StatusBar.currentHeight || 20 : 12
              ) + 12,
          },
        ]}
      >
        {/* Admin Profile Row */}
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
              {user?.name || STRINGS.ADMIN_SIDEBAR.DEFAULT_ADMIN_NAME}
            </Text>
            <Text style={styles.adminEmail} numberOfLines={1}>
              {user?.email || STRINGS.ADMIN_SIDEBAR.DEFAULT_ADMIN_EMAIL}
            </Text>
          </View>
        </View>
      </View>

      {/* ── Đường phân cách ngang Divider ── */}
      <View style={styles.divider} />

      {/* ── 2. DANH MỤC MENU QUẢN TRỊ CỐT LÕI ── */}
      <ScrollView
        style={styles.menuScrollView}
        contentContainerStyle={styles.menuScrollContent}
        showsVerticalScrollIndicator={false}
        bounces={false}
      >
        <Text style={styles.menuSectionHeader}>{STRINGS.ADMIN_SIDEBAR.SECTION_HEADER}</Text>

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
              activeOpacity={CONFIG.ANIMATION.ACTIVE_OPACITY_PILL}
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
                    size={16}
                    color={isActive ? theme.colors.primary[700] : theme.colors.slate[600]}
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
      <View
        style={[
          styles.footer,
          {
            paddingBottom: Math.max(
              insets.bottom,
              Platform.OS === 'android' ? 12 : 8
            ),
          },
        ]}
      >
        {/* Nút Đăng xuất */}
        <TouchableOpacity
          style={styles.logoutButton}
          onPress={() => setShowLogoutModal(true)}
          activeOpacity={CONFIG.ANIMATION.ACTIVE_OPACITY_BUTTON}
        >
          <Ionicons name="log-out-outline" size={16} color={theme.colors.danger[600]} />
          <Text style={styles.logoutButtonText}>{STRINGS.ADMIN_SIDEBAR.LOGOUT_BUTTON}</Text>
        </TouchableOpacity>
      </View>

      {/* ── 4. MODAL XÁC NHẬN ĐĂNG XUẤT (TÁI SỬ DỤNG) ── */}
      <LogoutConfirmModal
        visible={showLogoutModal}
        onClose={() => setShowLogoutModal(false)}
        onConfirm={handleConfirmLogout}
        subtitle={STRINGS.ADMIN_SIDEBAR.LOGOUT_CONFIRM_SUBTITLE}
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
    paddingHorizontal: 16,
    paddingBottom: 4,
  },
  profileBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  adminAvatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: theme.colors.slate[200],
  },
  profileInfo: {
    flex: 1,
  },
  adminName: {
    ...theme.typography.body,
    fontSize: 14.5,
    lineHeight: 19,
    fontWeight: '700',
    color: theme.textPrimary,
  },
  adminEmail: {
    ...theme.typography.caption,
    fontSize: 12,
    lineHeight: 16,
    color: theme.textSecondary,
    marginTop: 2,
  },

  divider: {
    height: 1,
    backgroundColor: theme.colors.slate[200],
    marginHorizontal: 16,
    marginVertical: 14,
  },

  menuScrollView: {
    flex: 1,
  },
  menuScrollContent: {
    paddingHorizontal: 12,
    paddingTop: 2,
    paddingBottom: 8,
    gap: 2,
  },
  menuSectionHeader: {
    fontSize: 10,
    fontWeight: '700',
    color: theme.textSecondary,
    letterSpacing: 0.6,
    marginBottom: 6,
    paddingHorizontal: 12,
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 9999,
  },
  menuItemActive: {
    backgroundColor: theme.colors.primary[50],
  },
  menuItemLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    flex: 1,
  },
  menuIconContainer: {
    width: 26,
    height: 26,
    borderRadius: 9999,
    backgroundColor: 'transparent',
    alignItems: 'center',
    justifyContent: 'center',
  },
  menuIconContainerActive: {
    backgroundColor: 'transparent',
  },
  menuItemLabel: {
    ...theme.typography.body,
    fontSize: 12.5,
    fontWeight: '500',
    color: theme.textPrimary,
  },
  menuItemLabelActive: {
    fontWeight: '600',
    color: theme.colors.primary[700],
  },
  menuBadge: {
    paddingHorizontal: 5,
    paddingVertical: 1,
    borderRadius: theme.radii.full,
  },
  menuBadgeRed: {
    backgroundColor: theme.colors.danger[50],
    borderWidth: 1,
    borderColor: theme.colors.danger[500],
  },
  menuBadgeBlue: {
    backgroundColor: theme.colors.primary[50],
    borderWidth: 1,
    borderColor: theme.colors.primary[500],
  },
  menuBadgeText: {
    fontSize: 9.5,
    fontWeight: '700',
  },
  menuBadgeTextRed: {
    color: theme.colors.danger[600],
  },
  menuBadgeTextBlue: {
    color: theme.colors.primary[600],
  },

  footer: {
    paddingHorizontal: 10,
    paddingTop: 6,
    borderTopWidth: 1,
    borderTopColor: theme.border,
    backgroundColor: theme.colors.slate[50],
  },
  logoutButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: theme.colors.danger[50],
    borderRadius: theme.radii.md,
    paddingVertical: 8,
    borderWidth: 1,
    borderColor: theme.colors.danger[500],
  },
  logoutButtonText: {
    color: theme.colors.danger[600],
    fontSize: 12,
    fontWeight: '700',
  },
});
