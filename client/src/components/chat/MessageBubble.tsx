import React from 'react';
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

interface MessageBubbleProps {
  message: ChatMessage;
  currentUserId?: string;
  otherUserId?: string;
  onPressImage?: (url: string) => void;
  onPressLocation?: (location: LocationData) => void;
}

export function MessageBubble({
  message,
  currentUserId,
  otherUserId,
  onPressImage,
  onPressLocation,
}: MessageBubbleProps) {
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

  return (
    <View
      style={[
        styles.wrapper,
        isSent ? styles.wrapperSent : styles.wrapperReceived,
        message.isSending && styles.sendingOpacity,
      ]}
    >
      <View
        style={[
          styles.bubbleContainer,
          isSent ? styles.bubbleSent : styles.bubbleReceived,
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

        {/* 3. Template Type Badge */}
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

        {/* 4. Text Content */}
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

        {/* Time Stamp & Status */}
        <View style={styles.metaRow}>
          <Text
            style={[
              styles.timeText,
              isSent ? styles.timeTextSent : styles.timeTextReceived,
            ]}
          >
            {timeFormatted}
          </Text>
          {isSent && (
            <View style={styles.statusWrap}>
              {message.isSending ? (
                <Ionicons
                  name="time-outline"
                  size={12}
                  color={theme.colors.primary[100]}
                />
              ) : (
                <Ionicons
                  name="checkmark-done"
                  size={13}
                  color={theme.colors.primary[100]}
                />
              )}
            </View>
          )}
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  wrapper: {
    marginVertical: theme.spacing.xs,
    paddingHorizontal: theme.spacing.md,
    maxWidth: '82%',
  },
  wrapperSent: {
    alignSelf: 'flex-end',
  },
  wrapperReceived: {
    alignSelf: 'flex-start',
  },
  sendingOpacity: {
    opacity: 0.65,
  },
  bubbleContainer: {
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
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    marginTop: theme.spacing.xs,
    gap: 4,
  },
  timeText: {
    ...theme.typography.caption,
    fontSize: 11,
  },
  timeTextSent: {
    color: theme.colors.primary[100],
  },
  timeTextReceived: {
    color: theme.colors.slate[500],
  },
  statusWrap: {
    marginLeft: 2,
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
