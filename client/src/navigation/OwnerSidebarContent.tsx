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
                Platform.OS === 'android' ? StatusBar.currentHeight || 24 : 20
              ) + theme.spacing.sm,
          },
        ]}
      >
        {/* Brand Row */}
        <View style={styles.brandRow}>
          <View style={styles.logoBadge}>
            <Ionicons name="briefcase" size={20} color={theme.colors.primary[600]} />
          </View>
          <View>
            <Text style={styles.brandTitle}>{STRINGS.OWNER_SIDEBAR.BRAND_TITLE}</Text>
            <Text style={styles.brandSubtitle}>{STRINGS.OWNER_SIDEBAR.BRAND_SUBTITLE}</Text>
          </View>
        </View>

        {/* Owner Profile Box */}
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
                size={15}
                color={theme.colors.primary[500]}
              />
            </View>
            <Text style={styles.ownerEmail} numberOfLines={1}>
              {user?.email || STRINGS.OWNER_SIDEBAR.DEFAULT_OWNER_EMAIL}
            </Text>

            {/* Badges Row */}
            <View style={styles.badgeRow}>
              <View style={styles.roleBadge}>
                <Text style={styles.roleBadgeText}>{STRINGS.OWNER_SIDEBAR.ROLE_BADGE}</Text>
              </View>
              <View style={styles.trustBadge}>
                <Ionicons
                  name="shield-checkmark"
                  size={10}
                  color={theme.colors.success[600]}
                />
                <Text style={styles.trustBadgeText}>
                  {STRINGS.OWNER_SIDEBAR.TRUST_LABEL(user?.trustScore || CONFIG.LIMITS.MAX_TRUST_SCORE)}
                </Text>
              </View>
            </View>
          </View>
        </View>
      </View>

      {/* ── 2. DANH MỤC MENU QUẢN LÝ ── */}
      <ScrollView
        style={styles.menuScrollView}
        contentContainerStyle={styles.menuScrollContent}
        showsVerticalScrollIndicator={false}
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
                    size={18}
                    color={isActive ? theme.colors.primary[600] : theme.colors.slate[600]}
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
      <View style={styles.footer}>
        <TouchableOpacity
          style={styles.logoutButton}
          onPress={() => setShowLogoutModal(true)}
          activeOpacity={CONFIG.ANIMATION.ACTIVE_OPACITY_BUTTON}
        >
          <Ionicons name="log-out-outline" size={18} color={theme.colors.danger[600]} />
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
  ownerAvatar: {
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
  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginBottom: 2,
  },
  ownerName: {
    ...theme.typography.body,
    fontWeight: '700',
    color: theme.textPrimary,
  },
  ownerEmail: {
    ...theme.typography.caption,
    color: theme.textSecondary,
    marginBottom: 4,
  },
  badgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    flexWrap: 'wrap',
  },
  roleBadge: {
    backgroundColor: theme.colors.primary[50],
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: theme.radii.sm,
    borderWidth: 1,
    borderColor: theme.colors.primary[500],
  },
  roleBadgeText: {
    fontSize: 9,
    fontWeight: '700',
    color: theme.colors.primary[700],
    letterSpacing: 0.2,
  },
  trustBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    backgroundColor: theme.colors.success[50],
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: theme.radii.sm,
    borderWidth: 1,
    borderColor: theme.colors.success[500],
  },
  trustBadgeText: {
    fontSize: 9,
    fontWeight: '700',
    color: theme.colors.success[600],
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
    width: 32,
    height: 32,
    borderRadius: theme.radii.sm,
    backgroundColor: theme.colors.slate[100],
    alignItems: 'center',
    justifyContent: 'center',
  },
  menuIconContainerActive: {
    backgroundColor: theme.colors.white,
  },
  menuItemLabel: {
    ...theme.typography.body,
    fontSize: 13,
    fontWeight: '500',
    color: theme.textPrimary,
  },
  menuItemLabelActive: {
    fontWeight: '700',
    color: theme.colors.primary[600],
  },

  menuBadge: {
    paddingHorizontal: 7,
    paddingVertical: 3,
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
    fontSize: 10,
    fontWeight: '700',
  },
  menuBadgeTextRed: {
    color: theme.colors.danger[600],
  },
  menuBadgeTextBlue: {
    color: theme.colors.primary[600],
  },

  footer: {
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.md,
    borderTopWidth: 1,
    borderTopColor: theme.border,
    backgroundColor: theme.colors.slate[50],
  },
  logoutButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 10,
    borderRadius: theme.radii.md,
    backgroundColor: theme.colors.danger[50],
    borderWidth: 1,
    borderColor: theme.colors.danger[500],
  },
  logoutButtonText: {
    ...theme.typography.body,
    fontSize: 13,
    fontWeight: '700',
    color: theme.colors.danger[600],
  },
});
