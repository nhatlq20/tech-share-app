import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import {
  StyleSheet,
  View,
  Text,
  FlatList,
  Image,
  TouchableOpacity,
  ActivityIndicator,
  Linking,
  Platform,
  StatusBar,
  KeyboardAvoidingView,
  Alert,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { theme } from '../../constants/theme';
import { STRINGS } from '../../constants/strings';
import { useAppDispatch, useAppSelector } from '../../store';
import { resetUnreadMessages } from '../../store/slices/notificationSlice';
import {
  ChatMessage,
  ChatBookingInfo,
  ChatOtherUser,
  LocationData,
  ChatMessageType,
} from '../../types';
import { chatService } from '../../services/chatService';
import { socketService } from '../../services/socketService';
import { MessageBubble } from '../../components/chat/MessageBubble';
import { QuickMessageBar } from '../../components/chat/QuickMessageBar';
import { ChatInputBar } from '../../components/chat/ChatInputBar';

interface ChatDetailScreenProps {
  route?: {
    params?: {
      bookingId?: string;
    };
  };
  navigation?: any;
  bookingId?: string;
  onBack?: () => void;
}

export function ChatDetailScreen({
  route,
  navigation,
  bookingId: propBookingId,
  onBack,
}: ChatDetailScreenProps) {
  const insets = useSafeAreaInsets();
  const dispatch = useAppDispatch();
  const effectiveBookingId = propBookingId || route?.params?.bookingId || '';

  const currentUser = useAppSelector((state) => state.auth.user);
  const currentUserId = String(currentUser?._id || currentUser?.id || '');

  const [booking, setBooking] = useState(null as ChatBookingInfo | null);
  const [otherUser, setOtherUser] = useState(null as ChatOtherUser | null);
  const [messages, setMessages] = useState([] as ChatMessage[]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSending, setIsSending] = useState(false);

  const isMountedRef = useRef(true);

  const handleBack = () => {
    if (onBack) {
      onBack();
    } else if (navigation?.canGoBack && navigation.canGoBack()) {
      navigation.goBack();
    }
  };

  /**
   * Load chat history from backend
   */
  const loadChatHistory = useCallback(
    async (showLoadingSpinner = false) => {
      if (!effectiveBookingId) return;
      if (showLoadingSpinner) setIsLoading(true);

      try {
        const data = await chatService.getChatHistory(effectiveBookingId);
        if (isMountedRef.current) {
          setBooking(data.booking);
          setOtherUser(data.otherUser);

          // Update messages while preserving any currently-sending optimistic items
          setMessages((prevMessages: ChatMessage[]) => {
            const sendingItems = prevMessages.filter((m: ChatMessage) => m.isSending);
            const serverMessageIds = new Set(data.messages.map((m: ChatMessage) => m._id));

            // Keep sending items that haven't been confirmed yet
            const filteredSending = sendingItems.filter((m: ChatMessage) => !serverMessageIds.has(m._id));
            return [...filteredSending, ...data.messages];
          });
        }
      } catch (err: any) {
        if (showLoadingSpinner && isMountedRef.current) {
          console.warn('Chat load error:', err.message);
        }
      } finally {
        if (showLoadingSpinner && isMountedRef.current) {
          setIsLoading(false);
        }
      }
    },
    [effectiveBookingId]
  );

  // Initial load and WebSocket (Socket.IO) Real-time Event Subscription
  useEffect(() => {
    isMountedRef.current = true;
    dispatch(resetUnreadMessages());

    // 1. Fetch chat history once on screen mount
    loadChatHistory(true);
    if (effectiveBookingId) {
      chatService.markChatAsRead(effectiveBookingId).catch(() => {});
    }

    // 2. Connect socket if needed & join booking chat room
    if (currentUserId) {
      socketService.connect(currentUserId);
    }
    if (effectiveBookingId) {
      socketService.joinChat(effectiveBookingId);
    }

    // 3. Listen for incoming messages in real-time via WebSocket
    const unsubscribe = socketService.onNewMessage((incomingMsg: ChatMessage) => {
      if (incomingMsg.bookingId !== effectiveBookingId) return;
      dispatch(resetUnreadMessages());
      chatService.markChatAsRead(effectiveBookingId).catch(() => {});

      setMessages((prev: ChatMessage[]) => {
        // Prevent duplicate messages if already present
        const alreadyExists = prev.some((m: ChatMessage) => m._id === incomingMsg._id);
        if (alreadyExists) return prev;

        // If sent by current user, replace any matching optimistic placeholder
        if (String(incomingMsg.senderId) === String(currentUserId)) {
          const hasOptimisticMatch = prev.some(
            (m: ChatMessage) =>
              m.isSending &&
              m.text === incomingMsg.text &&
              m.messageType === incomingMsg.messageType
          );
          if (hasOptimisticMatch) {
            return prev.map((m: ChatMessage) =>
              m.isSending &&
              m.text === incomingMsg.text &&
              m.messageType === incomingMsg.messageType
                ? incomingMsg
                : m
            );
          }
        }

        // New incoming message from recipient (or other device) -> prepend to inverted list
        return [incomingMsg, ...prev];
      });
    });

    return () => {
      isMountedRef.current = false;
      unsubscribe();
      if (effectiveBookingId) {
        socketService.leaveChat(effectiveBookingId);
      }
    };
  }, [effectiveBookingId, currentUserId, loadChatHistory]);

  /**
   * Core dispatcher for sending messages (Optimistic UI)
   */
  const dispatchMessage = async (
    messageType: ChatMessageType,
    text?: string,
    mediaUrl?: string,
    locationData?: LocationData
  ) => {
    if (!effectiveBookingId) return;

    const tempId = `temp-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;
    const optimisticMessage: ChatMessage = {
      _id: tempId,
      bookingId: effectiveBookingId,
      senderId: currentUserId,
      messageType,
      text,
      mediaUrl,
      locationData,
      createdAt: new Date().toISOString(),
      isSending: true,
    };

    // 1. Optimistic UI: Prepend immediately to FlatList
    setMessages((prev: ChatMessage[]) => [optimisticMessage, ...prev]);
    setIsSending(true);

    try {
      // 2. Call POST API
      const savedMessage = await chatService.sendMessage(effectiveBookingId, {
        text,
        messageType,
        mediaUrl,
        locationData,
      });

      // 3. Replace temp item with saved response
      if (isMountedRef.current) {
        setMessages((prev: ChatMessage[]) =>
          prev.map((msg: ChatMessage) => (msg._id === tempId ? savedMessage : msg))
        );
      }
    } catch (err: any) {
      console.warn('Send message error:', err.message);
      // Remove failed optimistic message and alert user
      if (isMountedRef.current) {
        setMessages((prev: ChatMessage[]) => prev.filter((msg: ChatMessage) => msg._id !== tempId));
        Alert.alert(STRINGS.COMMON.ERROR, err.message || STRINGS.CHAT.SEND_FAILED);
      }
    } finally {
      if (isMountedRef.current) {
        setIsSending(false);
      }
    }
  };

  const handleSendText = (text: string) => {
    dispatchMessage('text', text);
  };

  const handleSendTemplate = (template: string) => {
    dispatchMessage('template', template);
  };

  const handleSendLocation = (location: LocationData) => {
    dispatchMessage('location', undefined, undefined, location);
  };

  const handleSendImage = async (uri: string, fileName?: string, mimeType?: string) => {
    setIsSending(true);
    try {
      // Upload image to Cloudinary first
      const uploadedUrl = await chatService.uploadChatImage(uri, fileName, mimeType);
      await dispatchMessage('image', undefined, uploadedUrl);
    } catch (err: any) {
      console.warn('Image upload & send error:', err);
      Alert.alert(STRINGS.COMMON.ERROR, err.message || 'Failed to upload photo');
    } finally {
      setIsSending(false);
    }
  };

  const handleCallUser = () => {
    if (otherUser?.phone) {
      Linking.openURL(`tel:${otherUser.phone}`).catch((err: any) =>
        console.warn('Cannot open phone dialer:', err)
      );
    }
  };

  const getStatusBadgeStyle = (status = '') => {
    switch (status.toLowerCase()) {
      case 'active':
        return {
          bg: theme.colors.success[50],
          text: theme.colors.success[600],
          label: STRINGS.CHAT.BOOKING_STATUSES.ACTIVE,
        };
      case 'approved':
        return {
          bg: theme.colors.primary[50],
          text: theme.colors.primary[600],
          label: STRINGS.CHAT.BOOKING_STATUSES.APPROVED,
        };
      case 'completed':
        return {
          bg: theme.colors.slate[100],
          text: theme.colors.slate[600],
          label: STRINGS.CHAT.BOOKING_STATUSES.COMPLETED,
        };
      case 'cancelled':
      case 'rejected':
        return {
          bg: theme.colors.danger[50],
          text: theme.colors.danger[600],
          label: status.toLowerCase() === 'rejected'
            ? STRINGS.CHAT.BOOKING_STATUSES.REJECTED
            : STRINGS.CHAT.BOOKING_STATUSES.CANCELLED,
        };
      default:
        return {
          bg: theme.colors.warning[50],
          text: theme.colors.warning[600],
          label: STRINGS.CHAT.BOOKING_STATUSES.PENDING,
        };
    }
  };

  const statusBadge = getStatusBadgeStyle(booking?.status);

  const formatTimeDivider = useCallback((dateString?: string): string => {
    if (!dateString) return '';
    try {
      const date = new Date(dateString);
      const now = new Date();

      const isToday =
        date.getDate() === now.getDate() &&
        date.getMonth() === now.getMonth() &&
        date.getFullYear() === now.getFullYear();

      const yesterday = new Date(now);
      yesterday.setDate(yesterday.getDate() - 1);
      const isYesterday =
        date.getDate() === yesterday.getDate() &&
        date.getMonth() === yesterday.getMonth() &&
        date.getFullYear() === yesterday.getFullYear();

      const timeString = date.toLocaleTimeString([], {
        hour: '2-digit',
        minute: '2-digit',
      });

      if (isToday) {
        return timeString;
      }
      if (isYesterday) {
        return `Hôm qua ${timeString}`;
      }

      const day = date.getDate().toString().padStart(2, '0');
      const month = (date.getMonth() + 1).toString().padStart(2, '0');
      const isThisYear = date.getFullYear() === now.getFullYear();

      if (isThisYear) {
        return `${day}/${month} ${timeString}`;
      }
      return `${day}/${month}/${date.getFullYear()} ${timeString}`;
    } catch {
      return '';
    }
  }, []);

  const isSentMessage = useCallback(
    (m?: ChatMessage) => {
      if (!m) return false;
      const sId = String(m.senderId || '');
      const myId = String(currentUserId || '');
      const otherId = String(otherUser?._id || '');
      return Boolean(
        m.isSending ||
        (myId && sId && sId === myId) ||
        (otherId && sId && sId !== otherId)
      );
    },
    [currentUserId, otherUser?._id]
  );

  const latestSentIndex = useMemo(() => {
    return messages.findIndex((m: ChatMessage) => isSentMessage(m));
  }, [messages, isSentMessage]);

  return (
    <KeyboardAvoidingView
      style={styles.screenContainer}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 0}
    >
      {/* ── 1. HEADER ── */}
      <View
        style={[
          styles.headerContainer,
          {
            paddingTop:
              Math.max(
                insets.top,
                Platform.OS === 'android' ? StatusBar.currentHeight || 20 : 12
              ) + theme.spacing.xs,
          },
        ]}
      >
        <View style={styles.headerTopRow}>
          {/* Back button */}
          <TouchableOpacity
            style={styles.backButton}
            onPress={handleBack}
            activeOpacity={0.7}
          >
            <Ionicons name="arrow-back" size={22} color={theme.colors.slate[800]} />
          </TouchableOpacity>

          {/* User profile avatar & details */}
          <View style={styles.headerUserInfo}>
            <Image
              source={{
                uri:
                  otherUser?.avatar ||
                  'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=400',
              }}
              style={styles.avatarImage}
            />
            <View style={styles.userTextCol}>
              <Text style={styles.userNameText} numberOfLines={1}>
                {otherUser?.name || STRINGS.CHAT.DEFAULT_OTHER_USER}
              </Text>
              <View style={styles.roleRow}>
                <View style={styles.onlineDot} />
                <Text style={styles.roleText} numberOfLines={1}>
                  {otherUser?.role ? otherUser.role.toUpperCase() : 'USER'}
                </Text>
              </View>
            </View>
          </View>

          {/* Call button if phone exists */}
          {Boolean(otherUser?.phone) && (
            <TouchableOpacity
              style={styles.callButton}
              onPress={handleCallUser}
              activeOpacity={0.7}
            >
              <Ionicons name="call-outline" size={18} color={theme.colors.primary[600]} />
            </TouchableOpacity>
          )}
        </View>

        {/* Booking Info Sub-Bar */}
        {booking && (
          <View style={styles.bookingContextBar}>
            <View style={styles.bookingLeft}>
              <Ionicons
                name="hardware-chip-outline"
                size={14}
                color={theme.colors.primary[600]}
              />
              <Text style={styles.bookingDeviceTitle} numberOfLines={1}>
                {booking.device?.title || booking.bookingCode || 'Order'}
              </Text>
            </View>
            <View style={[styles.statusPill, { backgroundColor: statusBadge.bg }]}>
              <Text style={[styles.statusPillText, { color: statusBadge.text }]}>
                {statusBadge.label}
              </Text>
            </View>
          </View>
        )}
      </View>

      {/* ── 2. MESSAGE LIST (INVERTED FLATLIST) ── */}
      <View style={styles.listContainer}>
        {isLoading ? (
          <View style={styles.loadingWrapper}>
            <ActivityIndicator size="large" color={theme.colors.primary[600]} />
          </View>
        ) : messages.length === 0 ? (
          <View style={styles.emptyContainer}>
            <View style={styles.emptyIconCircle}>
              <Ionicons
                name="chatbubbles-outline"
                size={36}
                color={theme.colors.slate[400]}
              />
            </View>
            <Text style={styles.emptyTitle}>{STRINGS.CHAT.EMPTY_CHAT_TITLE}</Text>
            <Text style={styles.emptySubtitle}>{STRINGS.CHAT.EMPTY_CHAT_SUBTITLE}</Text>
          </View>
        ) : (
          <FlatList
            data={messages}
            inverted
            keyExtractor={(item: ChatMessage) => item._id}
            renderItem={({ item, index }: { item: ChatMessage; index: number }) => {
              const isSent = isSentMessage(item);
              const isLatestSentMessage = isSent && index === latestSentIndex;

              // Rule 1: Avatar đối phương chỉ hiện ở dưới cùng bên trái của cụm tin nhắn cuối cùng (28x28).
              // Ở danh sách inverted, tin nhắn dưới nó trên màn hình là messages[index - 1].
              let isLastInReceivedCluster = false;
              if (!isSent) {
                if (index === 0) {
                  isLastInReceivedCluster = true;
                } else {
                  const nextMessageBelow = messages[index - 1];
                  if (isSentMessage(nextMessageBelow)) {
                    isLastInReceivedCluster = true;
                  }
                }
              }

              // Rule 2: Dấu thời gian (Timestamp) gom nhóm: hiện dòng giữa màn hình nếu cách tin trước > 30 phút.
              // Ở danh sách inverted, tin nhắn trên nó trên màn hình là messages[index + 1].
              let showTimeDivider = false;
              let timeDividerText = '';
              if (index === messages.length - 1) {
                showTimeDivider = true;
                timeDividerText = formatTimeDivider(item.createdAt);
              } else {
                const prevMessageAbove = messages[index + 1];
                if (item.createdAt && prevMessageAbove?.createdAt) {
                  const diffMs = Math.abs(
                    new Date(item.createdAt).getTime() - new Date(prevMessageAbove.createdAt).getTime()
                  );
                  if (diffMs >= 30 * 60 * 1000) {
                    showTimeDivider = true;
                    timeDividerText = formatTimeDivider(item.createdAt);
                  }
                }
              }

              return (
                <MessageBubble
                  message={item}
                  currentUserId={currentUserId}
                  otherUserId={otherUser?._id}
                  otherUserAvatar={otherUser?.avatar}
                  isLastInReceivedCluster={isLastInReceivedCluster}
                  isLatestSentMessage={isLatestSentMessage}
                  showTimeDivider={showTimeDivider}
                  timeDividerText={timeDividerText}
                />
              );
            }}
            contentContainerStyle={styles.listContent}
            showsVerticalScrollIndicator={false}
          />
        )}
      </View>

      {/* ── 3. QUICK MESSAGES BAR ── */}
      <QuickMessageBar onSelectTemplate={handleSendTemplate} />

      {/* ── 4. CHAT INPUT BAR ── */}
      <View style={{ paddingBottom: Math.max(insets.bottom, 8) }}>
        <ChatInputBar
          onSendText={handleSendText}
          onSendImage={handleSendImage}
          onSendLocation={handleSendLocation}
          isSending={isSending}
        />
      </View>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  screenContainer: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  headerContainer: {
    backgroundColor: theme.colors.card,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.slate[100],
    paddingHorizontal: theme.spacing.md,
    paddingBottom: theme.spacing.sm,
    ...theme.shadows.sm,
  },
  headerTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.sm,
  },
  backButton: {
    width: 36,
    height: 36,
    borderRadius: theme.radii.full,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerUserInfo: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.sm,
  },
  avatarImage: {
    width: 40,
    height: 40,
    borderRadius: theme.radii.full,
    backgroundColor: theme.colors.slate[200],
  },
  userTextCol: {
    flex: 1,
  },
  userNameText: {
    ...theme.typography.body,
    fontSize: 15,
    fontWeight: '700',
    color: theme.colors.slate[900],
  },
  roleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 1,
  },
  onlineDot: {
    width: 7,
    height: 7,
    borderRadius: 4,
    backgroundColor: theme.colors.success[500],
  },
  roleText: {
    ...theme.typography.caption,
    fontSize: 11,
    fontWeight: '600',
    color: theme.colors.slate[500],
  },
  callButton: {
    width: 36,
    height: 36,
    borderRadius: theme.radii.full,
    backgroundColor: theme.colors.primary[50],
    alignItems: 'center',
    justifyContent: 'center',
  },
  bookingContextBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: theme.colors.slate[50],
    paddingHorizontal: theme.spacing.sm + 2,
    paddingVertical: theme.spacing.xs + 2,
    borderRadius: theme.radii.md,
    marginTop: theme.spacing.xs + 2,
  },
  bookingLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    flex: 1,
  },
  bookingDeviceTitle: {
    ...theme.typography.caption,
    fontSize: 12,
    fontWeight: '600',
    color: theme.colors.slate[600],
    flex: 1,
  },
  statusPill: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: theme.radii.full,
  },
  statusPillText: {
    ...theme.typography.caption,
    fontSize: 11,
    fontWeight: '700',
  },
  listContainer: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  listContent: {
    paddingVertical: theme.spacing.sm,
  },
  loadingWrapper: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: theme.spacing.lg,
  },
  emptyIconCircle: {
    width: 68,
    height: 68,
    borderRadius: 34,
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
    ...theme.typography.body,
    fontSize: 13,
    color: theme.colors.slate[500],
    textAlign: 'center',
    lineHeight: 18,
  },
});

export default ChatDetailScreen;
