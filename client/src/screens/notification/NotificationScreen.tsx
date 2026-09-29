import React, { useEffect, useMemo } from 'react';
import {
  StyleSheet,
  View,
  Text,
  TouchableOpacity,
  FlatList,
  RefreshControl,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { theme } from '../../constants/theme';
import { useAppDispatch, useAppSelector } from '../../store';
import {
  fetchNotifications,
  fetchUnreadCount,
  markNotificationRead,
  markAllNotificationsRead,
  deleteNotificationItem,
  setFilter,
  NotificationFilter,
} from '../../store/slices/notificationSlice';
import { Notification, NotificationType } from '../../types';

interface NotificationScreenProps {
  onBack: () => void;
  onNavigateToBooking?: (bookingId?: string) => void;
  onNavigateToDevice?: (deviceId?: string) => void;
}

const FILTER_TABS: { key: NotificationFilter; label: string; icon: keyof typeof Ionicons.glyphMap }[] = [
  { key: 'all', label: 'Tất cả', icon: 'layers-outline' },
  { key: 'order', label: 'Đơn hàng', icon: 'cube-outline' },
  { key: 'reminder', label: 'Nhắc nhở', icon: 'alarm-outline' },
  { key: 'system', label: 'Hệ thống', icon: 'shield-checkmark-outline' },
  { key: 'promo', label: 'Ưu đãi', icon: 'pricetag-outline' },
];

export function NotificationScreen({
  onBack,
  onNavigateToBooking,
  onNavigateToDevice,
}: NotificationScreenProps) {
  const dispatch = useAppDispatch();
  const { items, unreadCount, filter, isLoading, isRefreshing } = useAppSelector(
    (state) => state.notifications
  );

  useEffect(() => {
    dispatch(fetchNotifications({ type: filter === 'all' ? undefined : filter }));
    dispatch(fetchUnreadCount());
  }, [dispatch, filter]);

  const handleRefresh = () => {
    dispatch(
      fetchNotifications({
        type: filter === 'all' ? undefined : filter,
        isRefresh: true,
      })
    );
    dispatch(fetchUnreadCount());
  };

  const handleSelectTab = (tab: NotificationFilter) => {
    dispatch(setFilter(tab));
  };

  const handleMarkAllRead = () => {
    dispatch(markAllNotificationsRead());
  };

  const handlePressItem = (item: Notification) => {
    if (!item.isRead) {
      dispatch(markNotificationRead(item._id));
    }

    // Điều hướng theo ngữ cảnh thông báo (Issue #38 tiêu chí A2)
    if (item.type === 'order' || item.type === 'reminder') {
      const bookingId = item.relatedId || item.data?.bookingId;
      if (onNavigateToBooking) {
        onNavigateToBooking(bookingId ? String(bookingId) : undefined);
      }
    } else if (item.data?.deviceId && onNavigateToDevice) {
      onNavigateToDevice(item.data.deviceId);
    }
  };

  const handleDeleteItem = (id: string) => {
    dispatch(deleteNotificationItem(id));
  };

  // Lọc danh sách theo filter tab
  const filteredList = useMemo(() => {
    if (filter === 'all') return items;
    return items.filter((item) => item.type === filter);
  }, [items, filter]);

  const formatTime = (isoString?: string) => {
    if (!isoString) return '';
    try {
      const date = new Date(isoString);
      const now = new Date();
      const diffMs = now.getTime() - date.getTime();
      const diffMins = Math.floor(diffMs / (1000 * 60));
      const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
      const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

      if (diffMins < 1) return 'Vừa xong';
      if (diffMins < 60) return `${diffMins} phút trước`;
      if (diffHours < 24) return `${diffHours} giờ trước`;
      if (diffDays === 1) return 'Hôm qua';
      if (diffDays < 7) return `${diffDays} ngày trước`;

      return `${date.getDate().toString().padStart(2, '0')}/${(date.getMonth() + 1)
        .toString()
        .padStart(2, '0')}/${date.getFullYear()}`;
    } catch {
      return '';
    }
  };

  const getTypeMeta = (type: NotificationType) => {
    switch (type) {
      case 'order':
      case 'booking_request':
      case 'booking_approved':
      case 'booking_cancelled':
        return {
          icon: 'cube-outline' as keyof typeof Ionicons.glyphMap,
          color: theme.colors.primary[600],
          bgColor: theme.colors.primary[50],
          label: 'Đơn hàng',
        };
      case 'reminder':
        return {
          icon: 'alarm-outline' as keyof typeof Ionicons.glyphMap,
          color: theme.colors.warning[600],
          bgColor: theme.colors.warning[50],
          label: 'Nhắc nhở',
        };
      case 'promo':
        return {
          icon: 'pricetag-outline' as keyof typeof Ionicons.glyphMap,
          color: theme.colors.danger[600],
          bgColor: theme.colors.danger[50],
          label: 'Khuyến mãi',
        };
      case 'message':
        return {
          icon: 'chatbubble-ellipses-outline' as keyof typeof Ionicons.glyphMap,
          color: theme.colors.success[600],
          bgColor: theme.colors.success[50],
          label: 'Tin nhắn',
        };
      case 'system':
      default:
        return {
          icon: 'shield-checkmark-outline' as keyof typeof Ionicons.glyphMap,
          color: theme.colors.indigo[600],
          bgColor: theme.colors.indigo[50],
          label: 'Hệ thống',
        };
    }
  };

  const renderNotificationItem = ({ item }: { item: Notification }) => {
    const meta = getTypeMeta(item.type);
    const timeStr = formatTime(item.createdAt);

    return (
      <TouchableOpacity
        style={[
          styles.itemCard,
          !item.isRead && styles.itemCardUnread,
        ]}
        onPress={() => handlePressItem(item)}
        activeOpacity={0.75}
      >
        {/* Icon Type Badge */}
        <View style={[styles.typeIconContainer, { backgroundColor: meta.bgColor }]}>
          <Ionicons name={meta.icon} size={20} color={meta.color} />
        </View>

        {/* Nội dung thông báo */}
        <View style={styles.itemContent}>
          <View style={styles.itemHeaderRow}>
            <View style={styles.metaRow}>
              <Text style={[styles.typeLabel, { color: meta.color }]}>
                {meta.label}
              </Text>
              <Text style={styles.dotSeparator}>•</Text>
              <Text style={styles.timeText}>{timeStr}</Text>
            </View>

            {/* Unread indicator */}
            {!item.isRead && <View style={styles.unreadDot} />}
          </View>

          <Text
            style={[styles.itemTitle, !item.isRead && styles.itemTitleUnread]}
            numberOfLines={1}
          >
            {item.title}
          </Text>

          <Text style={styles.itemBody} numberOfLines={2}>
            {item.body}
          </Text>
        </View>

        {/* Xóa nhanh */}
        <TouchableOpacity
          style={styles.deleteButton}
          onPress={() => handleDeleteItem(item._id)}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
        >
          <Ionicons name="close" size={16} color={theme.colors.slate[400]} />
        </TouchableOpacity>
      </TouchableOpacity>
    );
  };

  return (
    <View style={styles.container}>
      {/* ── Top Header ── */}
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={onBack}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
        >
          <Ionicons name="arrow-back" size={22} color={theme.textPrimary} />
        </TouchableOpacity>

        <View style={styles.headerTitleContainer}>
          <Text style={styles.headerTitle}>Thông báo</Text>
          {unreadCount > 0 && (
            <View style={styles.unreadBadgePill}>
              <Text style={styles.unreadBadgeText}>{unreadCount}</Text>
            </View>
          )}
        </View>

        {unreadCount > 0 ? (
          <TouchableOpacity
            style={styles.markAllButton}
            onPress={handleMarkAllRead}
            activeOpacity={0.7}
          >
            <Ionicons name="checkmark-done" size={16} color={theme.colors.primary[600]} />
            <Text style={styles.markAllText}>Đọc tất cả</Text>
          </TouchableOpacity>
        ) : (
          <View style={styles.headerRightPlaceholder} />
        )}
      </View>

      {/* ── Filter Tabs ── */}
      <View style={styles.tabsWrapper}>
        <FlatList
          horizontal
          showsHorizontalScrollIndicator={false}
          data={FILTER_TABS}
          keyExtractor={(tab: (typeof FILTER_TABS)[0]) => tab.key}
          contentContainerStyle={styles.tabsContainer}
          renderItem={({ item: tab }: { item: (typeof FILTER_TABS)[0] }) => {
            const isActive = filter === tab.key;
            return (
              <TouchableOpacity
                style={[styles.tabButton, isActive && styles.tabButtonActive]}
                onPress={() => handleSelectTab(tab.key)}
                activeOpacity={0.7}
              >
                <Ionicons
                  name={tab.icon}
                  size={15}
                  color={isActive ? theme.colors.white : theme.colors.slate[600]}
                />
                <Text
                  style={[styles.tabButtonText, isActive && styles.tabButtonTextActive]}
                >
                  {tab.label}
                </Text>
              </TouchableOpacity>
            );
          }}
        />
      </View>

      {/* ── Notifications List ── */}
      {isLoading && !isRefreshing ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={theme.colors.primary[500]} />
          <Text style={styles.loadingText}>Đang tải thông báo...</Text>
        </View>
      ) : (
        <FlatList
          data={filteredList}
          keyExtractor={(item: Notification) => item._id}
          renderItem={renderNotificationItem}
          contentContainerStyle={
            filteredList.length === 0 ? styles.emptyListContainer : styles.listContainer
          }
          refreshControl={
            <RefreshControl
              refreshing={isRefreshing}
              onRefresh={handleRefresh}
              tintColor={theme.colors.primary[500]}
              colors={[theme.colors.primary[500]]}
            />
          }
          ListEmptyComponent={
            <View style={styles.emptyStateContainer}>
              <View style={styles.emptyIconCircle}>
                <Ionicons
                  name="notifications-off-outline"
                  size={44}
                  color={theme.colors.slate[400]}
                />
              </View>
              <Text style={styles.emptyTitle}>Không có thông báo nào</Text>
              <Text style={styles.emptySubtitle}>
                {filter === 'all'
                  ? 'Bạn sẽ nhận được các cập nhật về đơn thuê và ưu đãi mới tại đây.'
                  : 'Không có thông báo nào phù hợp với bộ lọc này.'}
              </Text>
            </View>
          }
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.background,
  },
  header: {
    height: 56,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: theme.spacing.md,
    backgroundColor: theme.card,
    borderBottomWidth: 1,
    borderBottomColor: theme.border,
  },
  backButton: {
    width: 36,
    height: 36,
    borderRadius: theme.radii.full,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: theme.colors.slate[50],
  },
  headerTitleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.xs,
  },
  headerTitle: {
    ...theme.typography.heading,
    fontSize: 18,
  },
  unreadBadgePill: {
    backgroundColor: theme.colors.danger[500],
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: theme.radii.full,
  },
  unreadBadgeText: {
    color: theme.colors.white,
    fontSize: 11,
    fontWeight: '700',
  },
  markAllButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: theme.spacing.sm,
    paddingVertical: 6,
    borderRadius: theme.radii.sm,
    backgroundColor: theme.colors.primary[50],
  },
  markAllText: {
    fontSize: 12,
    fontWeight: '600',
    color: theme.colors.primary[600],
  },
  headerRightPlaceholder: {
    width: 36,
  },
  tabsWrapper: {
    backgroundColor: theme.card,
    borderBottomWidth: 1,
    borderBottomColor: theme.border,
    paddingVertical: theme.spacing.sm,
  },
  tabsContainer: {
    paddingHorizontal: theme.spacing.md,
    gap: theme.spacing.sm,
  },
  tabButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: theme.radii.full,
    backgroundColor: theme.colors.slate[100],
  },
  tabButtonActive: {
    backgroundColor: theme.colors.primary[600],
  },
  tabButtonText: {
    fontSize: 13,
    fontWeight: '600',
    color: theme.colors.slate[600],
  },
  tabButtonTextActive: {
    color: theme.colors.white,
  },
  listContainer: {
    padding: theme.spacing.md,
    gap: theme.spacing.sm,
  },
  emptyListContainer: {
    flexGrow: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: theme.spacing.xl,
  },
  itemCard: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: theme.card,
    borderRadius: theme.radii.md,
    padding: theme.spacing.md,
    borderWidth: 1,
    borderColor: theme.border,
    ...theme.shadows.subtle,
  },
  itemCardUnread: {
    borderColor: theme.colors.primary[500],
    backgroundColor: '#FAFDFE', // Nhấn nhẹ trạng thái chưa đọc
  },
  typeIconContainer: {
    width: 40,
    height: 40,
    borderRadius: theme.radii.md,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: theme.spacing.md,
  },
  itemContent: {
    flex: 1,
  },
  itemHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  typeLabel: {
    fontSize: 11,
    fontWeight: '700',
    textTransform: 'uppercase',
  },
  dotSeparator: {
    fontSize: 10,
    color: theme.colors.slate[400],
  },
  timeText: {
    fontSize: 11,
    color: theme.colors.slate[400],
  },
  unreadDot: {
    width: 8,
    height: 8,
    borderRadius: theme.radii.full,
    backgroundColor: theme.colors.primary[500],
  },
  itemTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: theme.textPrimary,
    marginBottom: 3,
  },
  itemTitleUnread: {
    fontWeight: '700',
    color: theme.colors.slate[900],
  },
  itemBody: {
    fontSize: 13,
    color: theme.textSecondary,
    lineHeight: 18,
  },
  deleteButton: {
    paddingLeft: theme.spacing.sm,
    paddingTop: 2,
  },
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: theme.spacing.sm,
  },
  loadingText: {
    fontSize: 14,
    color: theme.textSecondary,
  },
  emptyStateContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: theme.spacing.xl,
  },
  emptyIconCircle: {
    width: 80,
    height: 80,
    borderRadius: theme.radii.full,
    backgroundColor: theme.colors.slate[100],
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: theme.spacing.md,
  },
  emptyTitle: {
    ...theme.typography.subheading,
    color: theme.textPrimary,
    marginBottom: 6,
  },
  emptySubtitle: {
    ...theme.typography.caption,
    textAlign: 'center',
    maxWidth: 260,
    lineHeight: 18,
  },
});
