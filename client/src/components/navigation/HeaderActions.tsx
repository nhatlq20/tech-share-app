/**
 * HeaderActions.tsx
 * Cụm nút Tin nhắn + Thông báo đặt tại headerRight của các màn hình chính.
 * Tuân thủ 100% Design Tokens từ src/constants/theme.ts (theme-skill.md).
 */

import React from 'react';
import { View, TouchableOpacity, StyleSheet, Text } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { theme } from '../../constants/theme';
import { useAppSelector } from '../../store';

interface HeaderActionsProps {
  /** Số tin nhắn chưa đọc — hiện chấm đỏ nếu > 0 */
  unreadMessages?: number;
  /** Số thông báo chưa đọc — hiện chấm đỏ nếu > 0 */
  unreadNotifications?: number;
  onPressChat?: () => void;
  onPressNotifications?: () => void;
}

export function HeaderActions({
  unreadMessages = 0,
  unreadNotifications,
  onPressChat,
  onPressNotifications,
}: HeaderActionsProps) {
  const reduxUnread = useAppSelector((state) => state.notifications?.unreadCount ?? 0);
  const effectiveUnread = unreadNotifications !== undefined ? unreadNotifications : reduxUnread;
  return (
    <View style={styles.container}>
      {/* Nút Tin nhắn */}
      <TouchableOpacity
        style={styles.iconButton}
        onPress={onPressChat}
        activeOpacity={0.7}
        hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
      >
        <Ionicons
          name="chatbubble-ellipses-outline"
          size={22}
          color={theme.textPrimary}
        />
        {unreadMessages > 0 && <View style={styles.badge} />}
      </TouchableOpacity>

      {/* Nút Thông báo */}
      <TouchableOpacity
        style={styles.iconButton}
        onPress={onPressNotifications}
        activeOpacity={0.7}
        hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
      >
        <Ionicons
          name="notifications-outline"
          size={22}
          color={theme.textPrimary}
        />
        {effectiveUnread > 0 && <View style={styles.badge} />}
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.sm,          // 8px spacing token
  },
  iconButton: {
    width: 36,
    height: 36,
    borderRadius: theme.radii.full,
    backgroundColor: theme.colors.slate[50], // nền nhạt từ slate-50 token
    alignItems: 'center',
    justifyContent: 'center',
  },
  /** Chấm đỏ unread badge — màu danger từ token */
  badge: {
    position: 'absolute',
    top: 5,
    right: 5,
    width: 8,
    height: 8,
    borderRadius: theme.radii.full,
    backgroundColor: theme.colors.danger[500],
    borderWidth: 1.5,
    borderColor: theme.card, // nền thẻ (trắng) làm viền tách biệt
  },
});
