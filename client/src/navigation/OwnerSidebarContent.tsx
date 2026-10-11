import React, { useState } from 'react';
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
import { LogoutConfirmModal } from '../components/common/LogoutConfirmModal';

export interface OwnerMenuItem {
  id: string;
  label: string;
  icon: keyof typeof Ionicons.glyphMap;
  targetScreen: string;
  sectionParam?: 'overview' | 'orders' | 'fleet' | 'wallet' | 'ai_tools';
  badgeCount?: number;
  isActionHighlight?: boolean;
}

const OWNER_MENU_ITEMS: OwnerMenuItem[] = [
  {
    id: 'overview',
    label: STRINGS.OWNER_SIDEBAR.MENU_OVERVIEW,
    icon: 'stats-chart-outline',
    targetScreen: 'OwnerDashboard',
    sectionParam: 'overview',
  },
  {
    id: 'analytics',
    label: STRINGS.OWNER_SIDEBAR.MENU_ANALYTICS,
    icon: 'analytics-outline',
    targetScreen: 'OwnerAnalytics',
  },
  {
    id: 'orders',
    label: STRINGS.OWNER_SIDEBAR.MENU_ORDERS,
    icon: 'receipt-outline',
    targetScreen: 'BookingManage',
    badgeCount: 2,
    isActionHighlight: true,
  },
  {
    id: 'fleet',
    label: STRINGS.OWNER_SIDEBAR.MENU_FLEET,
    icon: 'cube-outline',
    targetScreen: 'OwnerDashboard',
    sectionParam: 'fleet',
  },
  {
    id: 'post_device',
    label: STRINGS.OWNER_SIDEBAR.MENU_POST_DEVICE,
    icon: 'add-circle-outline',
    targetScreen: 'PostDevice',
  },
  {
    id: 'wallet',
    label: STRINGS.OWNER_SIDEBAR.MENU_WALLET,
    icon: 'wallet-outline',
    targetScreen: 'OwnerDashboard',
    sectionParam: 'wallet',
  },
  {
    id: 'ai_tools',
    label: STRINGS.OWNER_SIDEBAR.MENU_AI_TOOLS,
    icon: 'sparkles-outline',
    targetScreen: 'OwnerDashboard',
    sectionParam: 'ai_tools',
  },
  {
    id: 'renter_mode',
    label: STRINGS.OWNER_SIDEBAR.MENU_RENTER_MODE,
    icon: 'swap-horizontal-outline',
    targetScreen: 'MainTabs',
  },
  {
    id: 'notifications',
    label: STRINGS.OWNER_SIDEBAR.MENU_NOTIFICATIONS,
    icon: 'notifications-outline',
    targetScreen: 'Notification',
  },
];

export function OwnerSidebarContent(props: DrawerContentComponentProps) {
  const insets = useSafeAreaInsets();
  const { navigation, state } = props;
  const dispatch = useDispatch();
  const user = useSelector((state: RootState) => state.auth.user);
  const unreadNotifications = useSelector(
    (state: RootState) => state.notifications?.unreadCount ?? 0
  );

  const [showLogoutModal, setShowLogoutModal] = useState(false);

  const activeRouteName = state.routes[state.index]?.name || 'OwnerDashboard';
  const currentParams = (state.routes[state.index]?.params as any) || {};
  const currentSection = currentParams.initialSection || 'overview';

  const handleMenuItemPress = (item: OwnerMenuItem) => {
    navigation.closeDrawer();
    if (item.targetScreen === 'OwnerDashboard') {
      navigation.navigate('OwnerDashboard', {
        initialSection: item.sectionParam,
        _t: Date.now(),
      });
    } else if (item.targetScreen === 'Notification') {
      (navigation as any).navigate('Notification', { from: 'owner' });
    } else {
      (navigation as any).navigate(item.targetScreen);
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
        {/* Owner Profile Row */}
        <View style={styles.profileBox}>
          <Image
            source={{
              uri:
                user?.avatar ||
                'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=400',
            }}
            style={styles.ownerAvatar}
          />
          <View style={styles.profileInfo}>
            <View style={styles.nameRow}>
              <Text style={styles.ownerName} numberOfLines={1}>
                {user?.name || STRINGS.OWNER_SIDEBAR.DEFAULT_OWNER_NAME}
              </Text>
              <Ionicons
                name="checkmark-circle"
                size={14}
                color={theme.colors.primary[500]}
              />
            </View>
            <Text style={styles.ownerEmail} numberOfLines={1}>
              {user?.email || STRINGS.OWNER_SIDEBAR.DEFAULT_OWNER_EMAIL}
            </Text>
          </View>
        </View>
      </View>

      {/* ── Đường phân cách ngang Divider ── */}
      <View style={styles.divider} />

      {/* ── 2. DANH MỤC MENU QUẢN LÝ ── */}
      <ScrollView
        style={styles.menuScrollView}
        contentContainerStyle={styles.menuScrollContent}
        showsVerticalScrollIndicator={false}
        bounces={false}
      >
        <Text style={styles.menuSectionHeader}>{STRINGS.OWNER_SIDEBAR.SECTION_HEADER}</Text>

        {OWNER_MENU_ITEMS.map((item) => {
          let isActive = false;
          if (activeRouteName === 'OwnerDashboard' && item.targetScreen === 'OwnerDashboard') {
            isActive = currentSection === item.sectionParam;
          } else if (activeRouteName === item.targetScreen) {
            isActive = true;
          }

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
                <Text
                  style={[
                    styles.menuItemLabel,
                    isActive && styles.menuItemLabelActive,
                  ]}
                >
                  {item.label}
                </Text>
              </View>

              {/* Badge số lượng thông báo hoặc việc cần làm */}
              {item.id === 'notifications' && unreadNotifications > 0 ? (
                <View style={[styles.menuBadge, styles.menuBadgeRed]}>
                  <Text style={[styles.menuBadgeText, styles.menuBadgeTextRed]}>
                    {unreadNotifications > CONFIG.LIMITS.MAX_UNREAD_DISPLAY
                      ? `${CONFIG.LIMITS.MAX_UNREAD_DISPLAY}+`
                      : unreadNotifications}{' '}
                    {STRINGS.OWNER_SIDEBAR.NEW_SUFFIX}
                  </Text>
                </View>
              ) : item.badgeCount && item.badgeCount > 0 ? (
                <View
                  style={[
                    styles.menuBadge,
                    item.isActionHighlight ? styles.menuBadgeRed : styles.menuBadgeBlue,
                  ]}
                >
                  <Text
                    style={[
                      styles.menuBadgeText,
                      item.isActionHighlight
                        ? styles.menuBadgeTextRed
                        : styles.menuBadgeTextBlue,
                    ]}
                  >
                    {item.badgeCount} {STRINGS.OWNER_SIDEBAR.TASKS_SUFFIX}
                  </Text>
                </View>
              ) : null}
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
        <TouchableOpacity
          style={styles.logoutButton}
          onPress={() => setShowLogoutModal(true)}
          activeOpacity={CONFIG.ANIMATION.ACTIVE_OPACITY_BUTTON}
        >
          <Ionicons name="log-out-outline" size={16} color={theme.colors.danger[600]} />
          <Text style={styles.logoutButtonText}>{STRINGS.OWNER_SIDEBAR.LOGOUT_BUTTON}</Text>
        </TouchableOpacity>
      </View>

      {/* ── 4. MODAL XÁC NHẬN ĐĂNG XUẤT ── */}
      <LogoutConfirmModal
        visible={showLogoutModal}
        onClose={() => setShowLogoutModal(false)}
        onConfirm={handleConfirmLogout}
        title={STRINGS.OWNER_SIDEBAR.LOGOUT_CONFIRM_TITLE}
        subtitle={STRINGS.OWNER_SIDEBAR.LOGOUT_CONFIRM_SUBTITLE}
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
  ownerAvatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: theme.colors.slate[200],
  },
  profileInfo: {
    flex: 1,
  },
  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  ownerName: {
    ...theme.typography.body,
    fontSize: 14.5,
    lineHeight: 19,
    fontWeight: '700',
    color: theme.textPrimary,
  },
  ownerEmail: {
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
    paddingVertical: 8,
    borderRadius: theme.radii.md,
    backgroundColor: theme.colors.danger[50],
    borderWidth: 1,
    borderColor: theme.colors.danger[500],
  },
  logoutButtonText: {
    ...theme.typography.body,
    fontSize: 12,
    fontWeight: '700',
    color: theme.colors.danger[600],
  },
});
