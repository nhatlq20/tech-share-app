import React, { useState } from 'react';
import {
  StyleSheet,
  View,
  Text,
  Image,
  TouchableOpacity,
  Linking,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { theme } from '../../constants/theme';
import { STRINGS } from '../../constants/strings';
import { ChatMessage, LocationData } from '../../types';

export interface MessageBubbleProps {
  message: ChatMessage;
  currentUserId?: string;
  otherUserId?: string;
  otherUserAvatar?: string;
  isLastInReceivedCluster?: boolean;
  isLatestSentMessage?: boolean;
  showTimeDivider?: boolean;
  timeDividerText?: string;
  onPressImage?: (url: string) => void;
  onPressLocation?: (location: LocationData) => void;
}

export function MessageBubble({
  message,
  currentUserId,
  otherUserId,
  otherUserAvatar,
  isLastInReceivedCluster = false,
  isLatestSentMessage = false,
  showTimeDivider = false,
  timeDividerText = '',
  onPressImage,
  onPressLocation,
}: MessageBubbleProps) {
  const [showDetailedTime, setShowDetailedTime] = useState(false);

  const msgSender = String(message.senderId || '');
  const myId = String(currentUserId || '');
  const otherId = String(otherUserId || '');

  const isSent = Boolean(
    message.isSending ||
    (myId && msgSender && msgSender === myId) ||
    (otherId && msgSender && msgSender !== otherId)
  );

  const timeFormatted = message.createdAt
    ? new Date(message.createdAt).toLocaleTimeString([], {
        hour: '2-digit',
        minute: '2-digit',
      })
    : '';

  const handleOpenMap = (location?: LocationData) => {
    if (!location) return;
    if (onPressLocation) {
      onPressLocation(location);
      return;
    }
    const { latitude, longitude } = location;
    const url = `https://www.google.com/maps/search/?api=1&query=${latitude},${longitude}`;
    Linking.openURL(url).catch((err: any) => console.warn('Could not open map URL:', err));
  };

  const toggleTimestamp = () => {
    setShowDetailedTime((prev: boolean) => !prev);
  };

  return (
    <View style={styles.itemWrapper}>
      {/* 1. Dấu thời gian (Timestamp Header) gom nhóm khi khoảng cách > 30 phút */}
      {showTimeDivider && Boolean(timeDividerText) && (
        <View style={styles.timeDividerContainer}>
          <View style={styles.timeDividerBadge}>
            <Text style={styles.timeDividerText}>{timeDividerText}</Text>
          </View>
        </View>
      )}

      {/* 2. Dòng hiển thị tin nhắn (Avatar + Bubble) */}
      <View
        style={[
          styles.messageRow,
          isSent ? styles.messageRowSent : styles.messageRowReceived,
        ]}
      >
        {/* Avatar đối phương: chỉ đặt ở dưới cùng bên trái của cụm tin nhắn cuối cùng (28x28 px).
            Không lặp lại ở mọi dòng; giữ khoảng trống nếu thuộc cùng cụm.
            Không hiển thị avatar của chính mình. */}
        {!isSent && (
          <View style={styles.avatarContainer}>
            {isLastInReceivedCluster ? (
              <Image
                source={{
                  uri:
                    otherUserAvatar ||
                    'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=400',
                }}
                style={styles.avatarImage}
              />
            ) : (
              <View style={styles.avatarSpacer} />
            )}
          </View>
        )}

        {/* Bubble tin nhắn: chạm hoặc nhấn giữ để bật/tắt hiển thị giờ phút chi tiết */}
        <TouchableOpacity
          activeOpacity={0.88}
          onPress={toggleTimestamp}
          onLongPress={toggleTimestamp}
          style={[
            styles.bubbleContainer,
            isSent ? styles.bubbleSent : styles.bubbleReceived,
            message.isSending && styles.sendingOpacity,
          ]}
        >
          {/* 1. Image Type */}
          {message.messageType === 'image' && message.mediaUrl ? (
            <TouchableOpacity
              activeOpacity={0.85}
              onPress={() => onPressImage && onPressImage(message.mediaUrl!)}
              style={styles.imageWrapper}
            >
              <Image
                source={{ uri: message.mediaUrl }}
                style={styles.attachmentImage}
                resizeMode="cover"
              />
            </TouchableOpacity>
          ) : null}

          {/* 2. Location Type */}
          {message.messageType === 'location' && message.locationData ? (
            <TouchableOpacity
              style={[
                styles.locationCard,
                isSent ? styles.locationCardSent : styles.locationCardReceived,
              ]}
              onPress={() => handleOpenMap(message.locationData)}
              activeOpacity={0.8}
            >
              <View
                style={[
                  styles.locationIconWrap,
                  isSent ? styles.locationIconWrapSent : styles.locationIconWrapReceived,
                ]}
              >
                <Ionicons
                  name="location-sharp"
                  size={22}
                  color={isSent ? theme.colors.primary[600] : theme.colors.white}
                />
              </View>
              <View style={styles.locationTextWrap}>
                <Text
                  style={[
                    styles.locationTitle,
                    isSent ? styles.textSent : styles.textReceived,
                  ]}
                >
                  {STRINGS.CHAT.SHARED_LOCATION}
                </Text>
                <Text
                  style={[
                    styles.locationSubtitle,
                    isSent ? styles.locationSubSent : styles.locationSubReceived,
                  ]}
                  numberOfLines={2}
                >
                  {message.locationData.address ||
                    `${message.locationData.latitude.toFixed(5)}, ${message.locationData.longitude.toFixed(5)}`}
                </Text>
                <View style={styles.openMapBadge}>
                  <Ionicons
                    name="navigate-outline"
                    size={12}
                    color={isSent ? theme.colors.white : theme.colors.primary[600]}
                  />
                  <Text
                    style={[
                      styles.openMapText,
                      isSent ? styles.textSent : styles.openMapTextReceived,
                    ]}
                  >
                    {STRINGS.CHAT.VIEW_ON_MAP}
                  </Text>
                </View>
              </View>
            </TouchableOpacity>
          ) : null}

          {/* 3. Template Type */}
          {message.messageType === 'template' ? (
            <View style={styles.templateBadgeRow}>
              <Ionicons
                name="flash"
                size={11}
                color={isSent ? theme.colors.primary[100] : theme.colors.primary[600]}
              />
              <Text
                style={[
                  styles.templateBadgeText,
                  isSent ? styles.templateBadgeTextSent : styles.templateBadgeTextReceived,
                ]}
              >
                Quick template
              </Text>
            </View>
          ) : null}

          {/* 4. Text Content (Không gắn giờ/phút dưới mỗi tin nhắn theo quy tắc) */}
          {Boolean(message.text) && (
            <Text
              style={[
                styles.messageText,
                isSent ? styles.textSent : styles.textReceived,
              ]}
            >
              {message.text}
            </Text>
          )}
        </TouchableOpacity>
      </View>

      {/* Thời gian chi tiết hiện ra khi người dùng vuốt hoặc nhấn giữ bóng chat */}
      {showDetailedTime && (
        <View
          style={[
            styles.detailTimeRow,
            isSent ? styles.detailTimeSent : styles.detailTimeReceived,
          ]}
        >
          <Text style={styles.detailTimeText}>{timeFormatted}</Text>
        </View>
      )}

      {/* Trạng thái (Delivery Status): Chỉ hiện siêu nhỏ ở dưới tin nhắn CUỐI CÙNG của mình */}
      {isSent && isLatestSentMessage && (
        <View style={styles.statusRow}>
          {message.isSending ? (
            <View style={styles.statusItem}>
              <Ionicons name="time-outline" size={11} color={theme.colors.slate[400]} />
              <Text style={styles.statusTextDimmed}>Đang gửi</Text>
            </View>
          ) : message.status === 'read' ? (
            <View style={styles.statusItem}>
              {otherUserAvatar ? (
                <Image source={{ uri: otherUserAvatar }} style={styles.statusMiniAvatar} />
              ) : (
                <Ionicons name="checkmark-done" size={12} color={theme.colors.primary[600]} />
              )}
              <Text style={[styles.statusText, { color: theme.colors.primary[600] }]}>
                Đã xem
              </Text>
            </View>
          ) : message.status === 'delivered' ? (
            <View style={styles.statusItem}>
              <Ionicons name="checkmark-done-outline" size={12} color={theme.colors.slate[400]} />
              <Text style={styles.statusText}>Đã nhận</Text>
            </View>
          ) : (
            <View style={styles.statusItem}>
              <Ionicons name="checkmark-outline" size={12} color={theme.colors.slate[400]} />
              <Text style={styles.statusText}>Đã gửi</Text>
            </View>
          )}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  itemWrapper: {
    marginVertical: 2,
    paddingHorizontal: theme.spacing.md,
  },
  timeDividerContainer: {
    alignItems: 'center',
    marginVertical: 14,
  },
  timeDividerBadge: {
    backgroundColor: theme.colors.slate[100],
    paddingHorizontal: 12,
    paddingVertical: 3.5,
    borderRadius: theme.radii.full,
  },
  timeDividerText: {
    fontSize: 11,
    fontWeight: '600',
    color: theme.colors.slate[500],
  },
  messageRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
  },
  messageRowSent: {
    justifyContent: 'flex-end',
  },
  messageRowReceived: {
    justifyContent: 'flex-start',
  },
  avatarContainer: {
    width: 28,
    marginRight: 6,
    alignSelf: 'flex-end',
    marginBottom: 2,
  },
  avatarImage: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: theme.colors.slate[200],
  },
  avatarSpacer: {
    width: 28,
    height: 28,
  },
  bubbleContainer: {
    maxWidth: '78%',
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.sm + 2,
    borderRadius: theme.radii.lg,
    ...theme.shadows.sm,
  },
  bubbleSent: {
    backgroundColor: theme.colors.primary[500],
    borderBottomRightRadius: theme.radii.xs,
  },
  bubbleReceived: {
    backgroundColor: theme.colors.slate[100],
    borderWidth: 1,
    borderColor: theme.colors.slate[200],
    borderBottomLeftRadius: theme.radii.xs,
  },
  sendingOpacity: {
    opacity: 0.65,
  },
  textSent: {
    color: theme.colors.white,
  },
  textReceived: {
    color: theme.colors.slate[900],
  },
  messageText: {
    ...theme.typography.body,
    fontSize: 14.5,
    lineHeight: 20,
    fontWeight: '400',
  },
  detailTimeRow: {
    marginTop: 2,
    marginBottom: 3,
  },
  detailTimeSent: {
    alignItems: 'flex-end',
    paddingRight: 4,
  },
  detailTimeReceived: {
    alignItems: 'flex-start',
    paddingLeft: 34,
  },
  detailTimeText: {
    fontSize: 10.5,
    color: theme.colors.slate[400],
  },
  statusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    marginTop: 2,
    marginBottom: 2,
    paddingRight: 4,
  },
  statusItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
  },
  statusText: {
    fontSize: 10,
    color: theme.colors.slate[400],
    fontWeight: '500',
  },
  statusTextDimmed: {
    fontSize: 10,
    color: theme.colors.slate[400],
    fontStyle: 'italic',
  },
  statusMiniAvatar: {
    width: 14,
    height: 14,
    borderRadius: 7,
  },
  imageWrapper: {
    marginBottom: theme.spacing.xs,
    borderRadius: theme.radii.md,
    overflow: 'hidden',
  },
  attachmentImage: {
    width: 220,
    height: 160,
    borderRadius: theme.radii.md,
  },
  locationCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.sm,
    padding: theme.spacing.sm,
    borderRadius: theme.radii.md,
    marginBottom: theme.spacing.xs,
    width: 220,
  },
  locationCardSent: {
    backgroundColor: theme.colors.primary[600],
  },
  locationCardReceived: {
    backgroundColor: theme.colors.white,
    borderWidth: 1,
    borderColor: theme.colors.slate[200],
  },
  locationIconWrap: {
    width: 38,
    height: 38,
    borderRadius: theme.radii.full,
    alignItems: 'center',
    justifyContent: 'center',
  },
  locationIconWrapSent: {
    backgroundColor: theme.colors.white,
  },
  locationIconWrapReceived: {
    backgroundColor: theme.colors.primary[500],
  },
  locationTextWrap: {
    flex: 1,
  },
  locationTitle: {
    ...theme.typography.body,
    fontSize: 13,
    fontWeight: '700',
  },
  locationSubtitle: {
    ...theme.typography.caption,
    fontSize: 11,
    marginTop: 1,
  },
  locationSubSent: {
    color: theme.colors.primary[100],
  },
  locationSubReceived: {
    color: theme.colors.slate[500],
  },
  openMapBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    marginTop: 4,
  },
  openMapText: {
    ...theme.typography.caption,
    fontSize: 11,
    fontWeight: '700',
  },
  openMapTextReceived: {
    color: theme.colors.primary[600],
  },
  templateBadgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginBottom: 4,
  },
  templateBadgeText: {
    ...theme.typography.caption,
    fontSize: 10.5,
    fontWeight: '700',
    textTransform: 'uppercase',
  },
  templateBadgeTextSent: {
    color: theme.colors.primary[100],
  },
  templateBadgeTextReceived: {
    color: theme.colors.primary[600],
  },
});
