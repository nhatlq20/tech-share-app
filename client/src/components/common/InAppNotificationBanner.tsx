import React, { useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Animated,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { theme } from '../../constants/theme';
import { Notification } from '../../types';

interface InAppNotificationBannerProps {
  notification: Notification | null;
  onPress?: (notification: Notification) => void;
  onDismiss?: () => void;
}

export function InAppNotificationBanner({
  notification,
  onPress,
  onDismiss,
}: InAppNotificationBannerProps) {
  const insets = useSafeAreaInsets();
  const translateY = useRef(new Animated.Value(-120)).current;
  const opacity = useRef(new Animated.Value(0)).current;
  const timeoutRef = useRef(null as any);

  const topOffset = Math.max(insets.top, Platform.OS === 'android' ? 24 : 20) + 8;

  useEffect(() => {
    if (!notification) return;

    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }

    // Hiệu ứng trượt xuống mượt mà từ mép trên màn hình
    Animated.parallel([
      Animated.spring(translateY, {
        toValue: 0,
        friction: 6,
        tension: 50,
        useNativeDriver: true,
      }),
      Animated.timing(opacity, {
        toValue: 1,
        duration: 200,
        useNativeDriver: true,
      }),
    ]).start();

    // Tự động thu lại sau 4.5 giây
    timeoutRef.current = setTimeout(() => {
      handleHide();
    }, 4500);

    return () => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
    };
  }, [notification]);

  const handleHide = () => {
    Animated.parallel([
      Animated.timing(translateY, {
        toValue: -140,
        duration: 240,
        useNativeDriver: true,
      }),
      Animated.timing(opacity, {
        toValue: 0,
        duration: 200,
        useNativeDriver: true,
      }),
    ]).start(() => {
      if (onDismiss) onDismiss();
    });
  };

  if (!notification) return null;

  const getTypeIcon = () => {
    switch (notification.type) {
      case 'order':
        return { name: 'receipt' as const, bg: theme.colors.primary[50], color: theme.colors.primary[600] };
      case 'reminder':
        return { name: 'time' as const, bg: theme.colors.warning[50], color: theme.colors.warning[600] };
      case 'promo':
        return { name: 'gift' as const, bg: theme.colors.indigo[50], color: theme.colors.indigo[600] };
      default:
        return { name: 'notifications' as const, bg: theme.colors.slate[100], color: theme.colors.slate[800] };
    }
  };

  const iconInfo = getTypeIcon();

  return (
    <Animated.View
      style={[
        styles.wrapper,
        {
          top: topOffset,
          transform: [{ translateY }],
          opacity,
        },
      ]}
      pointerEvents="box-none"
    >
      <TouchableOpacity
        style={styles.card}
        activeOpacity={0.9}
        onPress={() => {
          handleHide();
          if (onPress) onPress(notification);
        }}
      >
        <View style={[styles.iconBox, { backgroundColor: iconInfo.bg }]}>
          <Ionicons name={iconInfo.name} size={20} color={iconInfo.color} />
        </View>

        <View style={styles.contentCol}>
          <View style={styles.topRow}>
            <View style={styles.tag}>
              <View style={styles.pulseDot} />
              <Text style={styles.tagText}>Thông báo mới</Text>
            </View>
            <Text style={styles.timeText}>Vừa xong</Text>
          </View>
          <Text style={styles.title} numberOfLines={1}>
            {notification.title}
          </Text>
          <Text style={styles.body} numberOfLines={2}>
            {notification.body}
          </Text>
        </View>

        <TouchableOpacity
          style={styles.closeBtn}
          onPress={handleHide}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
        >
          <Ionicons name="close" size={16} color={theme.colors.slate[400]} />
        </TouchableOpacity>
      </TouchableOpacity>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    position: 'absolute',
    left: 16,
    right: 16,
    zIndex: 9999,
    elevation: 10,
  },
  card: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: theme.card,
    borderRadius: theme.radii.lg,
    padding: theme.spacing.md,
    borderWidth: 1,
    borderColor: theme.border,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.12,
        shadowRadius: 10,
      },
      android: {
        elevation: 8,
      },
    }),
  },
  iconBox: {
    width: 38,
    height: 38,
    borderRadius: theme.radii.md,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: theme.spacing.sm,
    marginTop: 2,
  },
  contentCol: {
    flex: 1,
    marginRight: 6,
  },
  topRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  tag: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: theme.colors.primary[50],
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: theme.radii.full,
  },
  pulseDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: theme.colors.primary[600],
  },
  tagText: {
    fontSize: 10,
    fontWeight: '700',
    color: theme.colors.primary[600],
  },
  timeText: {
    fontSize: 11,
    color: theme.colors.slate[400],
  },
  title: {
    fontSize: 13,
    fontWeight: '700',
    color: theme.textPrimary,
    marginBottom: 2,
  },
  body: {
    fontSize: 12,
    color: theme.textSecondary,
    lineHeight: 16,
  },
  closeBtn: {
    padding: 4,
    marginLeft: 2,
  },
});
