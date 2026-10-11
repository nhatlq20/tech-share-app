import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  StyleSheet,
  View,
  Text,
  FlatList,
  TouchableOpacity,
  Image,
  TextInput,
  ActivityIndicator,
  RefreshControl,
  Platform,
  StatusBar,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { useDispatch, useSelector } from 'react-redux';
import { theme, STRINGS, CONFIG } from '../../constants';
import { chatService, ChatConversationItem } from '../../services/chatService';
import { socketService } from '../../services/socketService';
import { resetUnreadMessages } from '../../store/slices/notificationSlice';
import { RootState } from '../../store';

export interface OwnerMessagesScreenProps {
  navigation?: any;
  route?: any;
  onOpenDrawer?: () => void;
  onNavigateToChat?: (bookingId: string) => void;
  isRenterMode?: boolean;
  onBack?: () => void;
}

type FilterTab = 'all' | 'renting' | 'pending' | 'completed';

export function OwnerMessagesScreen({
  navigation,
  route,
  onOpenDrawer,
  onNavigateToChat,
  isRenterMode,
  onBack,
}: OwnerMessagesScreenProps) {
  const insets = useSafeAreaInsets();
  const dispatch = useDispatch();
  const currentUserId = useSelector(
    (state: RootState) => state.auth.user?.id || (state.auth.user as any)?._id
  );
  const userRole = useSelector((state: RootState) => state.auth.user?.role);
  const isRenter = Boolean(
    isRenterMode ||
    route?.params?.from === 'renter' ||
    route?.params?.isRenterMode ||
    (userRole === 'renter' && !onOpenDrawer)
  );

  const topInset = Math.max(
    insets.top,
    Platform.OS === 'android' ? StatusBar.currentHeight || 24 : 20
  );

  const [conversations, setConversations] = useState([] as ChatConversationItem[]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeTab, setActiveTab] = useState('all' as FilterTab);

  // Lấy danh sách cuộc trò chuyện gần nhất từ API (sắp xếp tin nhắn mới nhất lên đầu)
  const fetchConversations = useCallback(async (isSilent = false) => {
    if (!isSilent) setLoading(true);
    try {
      const roleParam = isRenter ? 'renter' : 'owner';
      const data = await chatService.getConversations(roleParam);
      setConversations(Array.isArray(data) ? data : []);
    } catch (err: any) {
      console.warn('Failed to load conversations:', err?.message);
    } finally {
      if (!isSilent) setLoading(false);
      setRefreshing(false);
    }
  }, [isRenter]);

  useEffect(() => {
    if (currentUserId) {
      socketService.connect(String(currentUserId));
    }
    dispatch(resetUnreadMessages());
    fetchConversations();

    // Lắng nghe tin nhắn mới theo thời gian thực (Socket.IO):
    // Cập nhật ngay tin nhắn mới nhất và đưa cuộc trò chuyện lên đầu danh sách
    const unsubscribe = socketService.onNewMessage((newMsg) => {
      setConversations((prev: ChatConversationItem[]) => {
        const foundIndex = prev.findIndex((c: ChatConversationItem) => c.bookingId === newMsg.bookingId);
        if (foundIndex >= 0) {
          const item = prev[foundIndex];
          const updatedItem: ChatConversationItem = {
            ...item,
            lastMessage: {
              _id: newMsg._id,
              text:
                newMsg.text ||
                (newMsg.messageType === 'image'
                  ? '📷 [Hình ảnh]'
                  : newMsg.messageType === 'location'
                  ? '📍 [Vị trí]'
                  : 'Tin nhắn mới'),
              senderId: newMsg.senderId,
              isFromMe: false,
              createdAt: newMsg.createdAt || new Date().toISOString(),
              status: newMsg.status || 'sent',
            },
            unreadCount: (item.unreadCount || 0) + 1,
            lastActivityAt: newMsg.createdAt || new Date().toISOString(),
          };
          const rest = prev.filter((_: ChatConversationItem, idx: number) => idx !== foundIndex);
          return [updatedItem, ...rest];
        }
        return prev;
      });

      // Đồng bộ lại từ server trong nền
      fetchConversations(true);
    });

    // Lắng nghe sự kiện tin nhắn đã đọc để xóa chấm đỏ/badge
    const unsubRead = socketService.onMessagesRead((data) => {
      setConversations((prev: ChatConversationItem[]) =>
        prev.map((c: ChatConversationItem) =>
          c.bookingId === data.bookingId ? { ...c, unreadCount: 0 } : c
        )
      );
    });

    return () => {
      unsubscribe();
      unsubRead();
    };
  }, [fetchConversations, dispatch, currentUserId]);

  // Tự động làm mới danh sách tin nhắn mỗi khi quay lại màn hình
  useFocusEffect(
    useCallback(() => {
      fetchConversations(true);
    }, [fetchConversations])
  );

  const onRefresh = () => {
    setRefreshing(true);
    fetchConversations(true);
  };

  const handleOpenChat = (bookingId: string) => {
    // 1. Optimistic update: xóa badge unread ngay lập tức trên UI
    setConversations((prev: ChatConversationItem[]) =>
      prev.map((c: ChatConversationItem) =>
        c.bookingId === bookingId ? { ...c, unreadCount: 0 } : c
      )
    );

    // 2. Gửi request đánh dấu đã đọc lên server
    chatService.markChatAsRead(bookingId).catch(() => {});

    if (onNavigateToChat) {
      onNavigateToChat(bookingId);
    } else if (navigation?.navigate) {
      navigation.navigate('ChatDetail', { bookingId });
    }
  };

  // Lọc cuộc trò chuyện theo tab và từ khóa tìm kiếm
  const filteredConversations = useMemo(() => {
    return conversations.filter((item: ChatConversationItem) => {
      // 1. Lọc theo trạng thái đơn
      if (activeTab === 'renting' && item.bookingStatus !== 'active') return false;
      if (activeTab === 'pending' && item.bookingStatus !== 'pending') return false;
      if (activeTab === 'completed' && item.bookingStatus !== 'completed') return false;

      // 2. Lọc theo từ khóa tìm kiếm (tên khách, thiết bị, mã đơn, nội dung tin nhắn)
      if (!searchQuery.trim()) return true;
      const q = searchQuery.toLowerCase().trim();

      const renterName = item.otherUser?.name ? item.otherUser.name.toLowerCase() : '';
      const deviceTitle = item.device?.title ? item.device.title.toLowerCase() : '';
      const bookingCode = item.bookingCode ? item.bookingCode.toLowerCase() : '';
      const lastMsgText = item.lastMessage?.text ? item.lastMessage.text.toLowerCase() : '';

      return (
        renterName.includes(q) ||
        deviceTitle.includes(q) ||
        bookingCode.includes(q) ||
        lastMsgText.includes(q)
      );
    });
  }, [conversations, activeTab, searchQuery]);

  const formatConversationTime = (isoString?: string): string => {
    if (!isoString) return '';
    try {
      const date = new Date(isoString);
      const now = new Date();
      const diffMs = now.getTime() - date.getTime();
      const diffMins = Math.floor(diffMs / (1000 * 60));
      const diffHours = Math.floor(diffMs / (1000 * 60 * 60));

      if (diffMins < 1) return 'Vừa xong';
      if (diffMins < 60) return `${diffMins}p`;
      if (diffHours < 24 && date.getDate() === now.getDate()) {
        return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
      }
      const yesterday = new Date(now);
      yesterday.setDate(yesterday.getDate() - 1);
      if (date.getDate() === yesterday.getDate() && date.getMonth() === yesterday.getMonth()) {
        return 'Hôm qua';
      }
      const day = date.getDate().toString().padStart(2, '0');
      const month = (date.getMonth() + 1).toString().padStart(2, '0');
      return `${day}/${month}`;
    } catch {
      return '';
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'active':
        return {
          bg: theme.colors.success[50],
          text: theme.colors.success[600],
          label: STRINGS.OWNER_MESSAGES.ACTIVE_TAB,
        };
      case 'pending':
        return {
          bg: theme.colors.warning[50],
          text: theme.colors.warning[600],
          label: STRINGS.OWNER_MESSAGES.PENDING_TAB,
        };
      case 'approved':
        return {
          bg: theme.colors.primary[50],
          text: theme.colors.primary[600],
          label: 'ĐÃ DUYỆT',
        };
      case 'completed':
        return {
          bg: theme.colors.slate[100],
          text: theme.colors.slate[600],
          label: STRINGS.OWNER_MESSAGES.COMPLETED_TAB,
        };
      default:
        return {
          bg: theme.colors.slate[100],
          text: theme.colors.slate[600],
          label: status.toUpperCase(),
        };
    }
  };

  return (
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor={theme.colors.card} />

      {/* ── 1. TOP HEADER WITH BACK / DRAWER BUTTON ── */}
      <View style={[styles.topBar, { paddingTop: topInset + theme.spacing.sm }]}>
        <View style={styles.topBarLeft}>
          {isRenter ? (
            <TouchableOpacity
              accessibilityRole="button"
              accessibilityLabel="Quay lại"
              onPress={() => {
                if (onBack) {
                  onBack();
                } else if (navigation?.goBack) {
                  navigation.goBack();
                }
              }}
              style={styles.hamburgerButton}
              activeOpacity={CONFIG.ANIMATION.ACTIVE_OPACITY_BUTTON}
            >
              <Ionicons name="arrow-back" size={24} color={theme.colors.slate[900]} />
            </TouchableOpacity>
          ) : (
            <TouchableOpacity
              accessibilityRole="button"
              accessibilityLabel={STRINGS.OWNER_MESSAGES.MENU_ACCESSIBILITY_LABEL}
              onPress={() => {
                if (onOpenDrawer) {
                  onOpenDrawer();
                } else if (navigation?.openDrawer) {
                  navigation.openDrawer();
                }
              }}
              style={styles.hamburgerButton}
              activeOpacity={CONFIG.ANIMATION.ACTIVE_OPACITY_BUTTON}
            >
              <Ionicons name="menu-outline" size={24} color={theme.colors.slate[900]} />
            </TouchableOpacity>
          )}
          <View style={styles.topBarTitleCol}>
            <Text style={styles.topBarTitle}>
              {isRenter ? 'Tin nhắn với chủ máy' : STRINGS.OWNER_MESSAGES.TOP_BAR_TITLE}
            </Text>
            <Text style={styles.topBarSubtitle}>
              {isRenter
                ? 'Lịch sử trao đổi và hỗ trợ từ các chủ thiết bị'
                : STRINGS.OWNER_MESSAGES.TOP_BAR_SUBTITLE}
            </Text>
          </View>
        </View>
      </View>

      {/* ── 2. SEARCH BAR ── */}
      <View style={styles.searchWrapper}>
        <View style={styles.searchInputContainer}>
          <Ionicons name="search-outline" size={18} color={theme.colors.slate[400]} />
          <TextInput
            style={styles.searchInput}
            placeholder={
              isRenter
                ? 'Tìm kiếm chủ máy, thiết bị, tin nhắn...'
                : STRINGS.OWNER_MESSAGES.SEARCH_PLACEHOLDER
            }
            placeholderTextColor={theme.colors.slate[400]}
            value={searchQuery}
            onChangeText={setSearchQuery}
            clearButtonMode="while-editing"
          />
          {searchQuery.length > 0 && (
            <TouchableOpacity onPress={() => setSearchQuery('')}>
              <Ionicons name="close-circle" size={18} color={theme.colors.slate[400]} />
            </TouchableOpacity>
          )}
        </View>
      </View>

      {/* ── 3. FILTER TABS ── */}
      <View style={styles.tabsContainer}>
        {(['all', 'renting', 'pending', 'completed'] as FilterTab[]).map((tab) => {
          const isActive = activeTab === tab;
          let label: string = STRINGS.OWNER_MESSAGES.ALL_TAB;
          if (tab === 'renting') label = STRINGS.OWNER_MESSAGES.ACTIVE_TAB;
          if (tab === 'pending') label = STRINGS.OWNER_MESSAGES.PENDING_TAB;
          if (tab === 'completed') label = STRINGS.OWNER_MESSAGES.COMPLETED_TAB;

          return (
            <TouchableOpacity
              key={tab}
              style={[styles.tabButton, isActive && styles.tabButtonActive]}
              onPress={() => setActiveTab(tab)}
              activeOpacity={0.75}
            >
              <Text style={[styles.tabButtonText, isActive && styles.tabButtonTextActive]}>
                {label}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>

      {/* ── 4. CHAT CONVERSATIONS INBOX LIST (MỚI NHẤT TRÊN CÙNG) ── */}
      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={theme.colors.primary[600]} />
          <Text style={styles.loadingText}>{STRINGS.OWNER_MESSAGES.LOADING_TEXT}</Text>
        </View>
      ) : (
        <FlatList
          data={filteredConversations}
          keyExtractor={(item: ChatConversationItem) => item.bookingId}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              colors={[theme.colors.primary[600]]}
              tintColor={theme.colors.primary[600]}
            />
          }
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <View style={styles.emptyIconCircle}>
                <Ionicons name="chatbubbles-outline" size={40} color={theme.colors.slate[400]} />
              </View>
              <Text style={styles.emptyTitle}>Chưa có cuộc trò chuyện nào</Text>
              <Text style={styles.emptySubtitle}>
                {isRenter
                  ? 'Khi bạn gửi tin nhắn hoặc trao đổi với các chủ thiết bị, danh sách cuộc trò chuyện sẽ hiển thị tại đây.'
                  : 'Khi khách hàng gửi tin nhắn trao đổi về đơn thuê, các đoạn chat sẽ xuất hiện tại đây.'}
              </Text>
            </View>
          }
          renderItem={({ item }: { item: ChatConversationItem }) => {
            const partnerName =
              item.otherUser?.name ||
              (isRenter ? 'Chủ thiết bị' : STRINGS.OWNER_MESSAGES.DEFAULT_RENTER_NAME);
            const partnerAvatar =
              item.otherUser?.avatar ||
              (isRenter
                ? 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=400'
                : 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=400');

            const statusBadge = getStatusBadge(item.bookingStatus);
            const timeStr = formatConversationTime(item.lastActivityAt);
            const hasUnread = (item.unreadCount || 0) > 0;

            const isFromMe = item.lastMessage?.isFromMe ?? false;
            const lastMsgPrefix = isFromMe ? 'Bạn: ' : '';
            const previewText = item.lastMessage?.text || 'Chưa có tin nhắn';

            return (
              <TouchableOpacity
                style={[styles.conversationRow, hasUnread && styles.conversationRowUnread]}
                onPress={() => handleOpenChat(item.bookingId)}
                activeOpacity={0.7}
              >
                {/* Avatar đối phương + Huy hiệu ảnh thiết bị */}
                <View style={styles.avatarWrapper}>
                  <Image source={{ uri: partnerAvatar }} style={styles.renterAvatar} />
                  {item.device?.image ? (
                    <Image source={{ uri: item.device.image }} style={styles.deviceMiniThumb} />
                  ) : null}
                </View>

                {/* Nội dung tóm tắt cuộc trò chuyện */}
                <View style={styles.chatInfoCol}>
                  {/* Dòng 1: Tên đối phương + Huy hiệu xác thực + Thời gian */}
                  <View style={styles.nameTimeRow}>
                    <View style={styles.nameContainer}>
                      <Text
                        style={[styles.renterNameText, hasUnread && styles.renterNameTextUnread]}
                        numberOfLines={1}
                      >
                        {partnerName}
                      </Text>
                      {item.otherUser?.isVerified && (
                        <Ionicons
                          name="checkmark-circle"
                          size={14}
                          color={theme.colors.primary[600]}
                          style={{ marginLeft: 3 }}
                        />
                      )}
                    </View>
                    <Text style={[styles.timeText, hasUnread && styles.timeTextUnread]}>
                      {timeStr}
                    </Text>
                  </View>

                  {/* Dòng 2: Ngữ cảnh đơn thuê & Thiết bị */}
                  <View style={styles.deviceContextRow}>
                    <Ionicons
                      name="hardware-chip-outline"
                      size={12}
                      color={theme.colors.slate[400]}
                    />
                    <Text style={styles.deviceContextText} numberOfLines={1}>
                      {item.device?.title || item.bookingCode}
                    </Text>
                    <View style={[styles.miniStatusBadge, { backgroundColor: statusBadge.bg }]}>
                      <Text style={[styles.miniStatusText, { color: statusBadge.text }]}>
                        {statusBadge.label}
                      </Text>
                    </View>
                  </View>

                  {/* Dòng 3: Tin nhắn mới nhất + Badge tin nhắn chưa đọc */}
                  <View style={styles.lastMessageRow}>
                    <Text
                      style={[
                        styles.previewMessageText,
                        hasUnread && styles.previewMessageTextUnread,
                      ]}
                      numberOfLines={1}
                    >
                      {lastMsgPrefix}
                      {previewText}
                    </Text>

                    {hasUnread && (
                      <View style={styles.unreadBadge}>
                        <Text style={styles.unreadBadgeText}>
                          {item.unreadCount > 99 ? '99+' : item.unreadCount}
                        </Text>
                      </View>
                    )}
                  </View>
                </View>
              </TouchableOpacity>
            );
          }}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  topBar: {
    backgroundColor: theme.colors.card,
    paddingHorizontal: theme.spacing.md,
    paddingBottom: theme.spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.slate[100],
    ...theme.shadows.sm,
  },
  topBarLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.sm,
  },
  hamburgerButton: {
    width: 38,
    height: 38,
    borderRadius: theme.radii.full,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: theme.colors.slate[100],
  },
  topBarTitleCol: {
    flex: 1,
  },
  topBarTitle: {
    ...theme.typography.heading,
    fontSize: 18,
    fontWeight: '700',
    color: theme.colors.slate[900],
  },
  topBarSubtitle: {
    ...theme.typography.caption,
    fontSize: 12,
    color: theme.colors.slate[500],
    marginTop: 1,
  },
  searchWrapper: {
    backgroundColor: theme.colors.card,
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.sm,
  },
  searchInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.colors.slate[100],
    borderRadius: theme.radii.lg,
    paddingHorizontal: theme.spacing.md,
    height: 40,
    gap: theme.spacing.xs,
  },
  searchInput: {
    flex: 1,
    fontSize: 13.5,
    color: theme.colors.slate[800],
    paddingVertical: 0,
  },
  tabsContainer: {
    flexDirection: 'row',
    backgroundColor: theme.colors.card,
    paddingHorizontal: theme.spacing.md,
    paddingBottom: theme.spacing.sm,
    gap: theme.spacing.xs,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.slate[100],
  },
  tabButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: theme.radii.full,
    backgroundColor: theme.colors.slate[100],
  },
  tabButtonActive: {
    backgroundColor: theme.colors.primary[600],
  },
  tabButtonText: {
    ...theme.typography.caption,
    fontSize: 12,
    fontWeight: '600',
    color: theme.colors.slate[600],
  },
  tabButtonTextActive: {
    color: theme.colors.white,
  },
  listContent: {
    paddingVertical: theme.spacing.xs,
  },
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: theme.spacing.xl,
  },
  loadingText: {
    ...theme.typography.body,
    color: theme.colors.slate[500],
    marginTop: theme.spacing.sm,
    fontSize: 13,
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: theme.spacing['2xl'],
    paddingHorizontal: theme.spacing.xl,
  },
  emptyIconCircle: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: theme.colors.slate[100],
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: theme.spacing.md,
  },
  emptyTitle: {
    ...theme.typography.subheading,
    fontSize: 16,
    fontWeight: '700',
    color: theme.colors.slate[800],
    marginBottom: 4,
  },
  emptySubtitle: {
    ...theme.typography.caption,
    fontSize: 13,
    color: theme.colors.slate[500],
    textAlign: 'center',
    lineHeight: 18,
  },

  // ── Conversation Inbox Item ──
  conversationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.colors.card,
    paddingHorizontal: theme.spacing.md,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.slate[100],
  },
  conversationRowUnread: {
    backgroundColor: theme.colors.primary[50] + '33', // Subtle highlight for unread
  },
  avatarWrapper: {
    position: 'relative',
    marginRight: 12,
  },
  renterAvatar: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: theme.colors.slate[200],
  },
  deviceMiniBadge: {
    position: 'absolute',
    bottom: -2,
    right: -2,
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 1.5,
    borderColor: theme.colors.card,
    backgroundColor: theme.colors.slate[200],
  },
  deviceMiniThumb: {
    position: 'absolute',
    bottom: -2,
    right: -2,
    width: 20,
    height: 20,
    borderRadius: 6,
    borderWidth: 1.5,
    borderColor: theme.colors.card,
    backgroundColor: theme.colors.slate[200],
  },
  chatInfoCol: {
    flex: 1,
    justifyContent: 'center',
  },
  nameTimeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 2,
  },
  nameContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    marginRight: 8,
  },
  renterNameText: {
    ...theme.typography.body,
    fontSize: 14.5,
    fontWeight: '600',
    color: theme.colors.slate[800],
  },
  renterNameTextUnread: {
    fontWeight: '700',
    color: theme.colors.slate[900],
  },
  timeText: {
    ...theme.typography.caption,
    fontSize: 11,
    color: theme.colors.slate[400],
  },
  timeTextUnread: {
    color: theme.colors.primary[600],
    fontWeight: '600',
  },
  deviceContextRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginBottom: 4,
  },
  deviceContextText: {
    ...theme.typography.caption,
    fontSize: 11.5,
    color: theme.colors.slate[500],
    flex: 1,
  },
  miniStatusBadge: {
    paddingHorizontal: 6,
    paddingVertical: 1,
    borderRadius: theme.radii.full,
  },
  miniStatusText: {
    fontSize: 9.5,
    fontWeight: '700',
  },
  lastMessageRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  previewMessageText: {
    ...theme.typography.caption,
    fontSize: 13,
    color: theme.colors.slate[500],
    flex: 1,
    marginRight: 8,
  },
  previewMessageTextUnread: {
    color: theme.colors.slate[900],
    fontWeight: '600',
  },
  unreadBadge: {
    minWidth: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: theme.colors.danger[500],
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 5,
  },
  unreadBadgeText: {
    fontSize: 10,
    fontWeight: '700',
    color: theme.colors.white,
  },
});
