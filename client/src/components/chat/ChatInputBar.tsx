import React, { useState } from 'react';
import {
  StyleSheet,
  View,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  Modal,
  Text,
  Pressable,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import * as Location from 'expo-location';
import { theme } from '../../constants/theme';
import { STRINGS } from '../../constants/strings';
import { LocationData } from '../../types';

interface ChatInputBarProps {
  onSendText: (text: string) => void;
  onSendImage: (uri: string, fileName?: string, mimeType?: string) => void;
  onSendLocation: (location: LocationData) => void;
  isSending?: boolean;
}

export function ChatInputBar({
  onSendText,
  onSendImage,
  onSendLocation,
  isSending = false,
}: ChatInputBarProps) {
  const [inputText, setInputText] = useState('');
  const [showActionModal, setShowActionModal] = useState(false);
  const [isLocating, setIsLocating] = useState(false);
  const [inputHeight, setInputHeight] = useState(38);

  const handleSend = () => {
    const trimmed = inputText.trim();
    if (!trimmed || isSending) return;
    onSendText(trimmed);
    setInputText('');
  };

  const handlePickImage = async (fromCamera = false) => {
    setShowActionModal(false);
    try {
      if (fromCamera) {
        const { status } = await ImagePicker.requestCameraPermissionsAsync();
        if (status !== 'granted') {
          Alert.alert(STRINGS.COMMON.ERROR, STRINGS.CHAT.IMAGE_PERMISSION_DENIED);
          return;
        }
        const result = await ImagePicker.launchCameraAsync({
          allowsEditing: true,
          quality: 0.8,
        });
        if (!result.canceled && result.assets[0]?.uri) {
          const asset = result.assets[0];
          onSendImage(
            asset.uri,
            asset.fileName || `chat-${Date.now()}.jpg`,
            asset.mimeType || 'image/jpeg'
          );
        }
      } else {
        const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
        if (status !== 'granted') {
          Alert.alert(STRINGS.COMMON.ERROR, STRINGS.CHAT.IMAGE_PERMISSION_DENIED);
          return;
        }
        const result = await ImagePicker.launchImageLibraryAsync({
          mediaTypes: ['images'],
          allowsEditing: true,
          quality: 0.8,
        });
        if (!result.canceled && result.assets[0]?.uri) {
          const asset = result.assets[0];
          onSendImage(
            asset.uri,
            asset.fileName || `chat-${Date.now()}.jpg`,
            asset.mimeType || 'image/jpeg'
          );
        }
      }
    } catch (err: any) {
      console.warn('Image picker error:', err);
      Alert.alert(STRINGS.COMMON.ERROR, err.message || 'Could not pick image');
    }
  };

  const handleShareLocation = async () => {
    setShowActionModal(false);
    setIsLocating(true);
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert(STRINGS.COMMON.ERROR, STRINGS.CHAT.LOCATION_PERMISSION_DENIED);
        setIsLocating(false);
        return;
      }

      const currentLocation = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.Balanced,
      });

      const { latitude, longitude } = currentLocation.coords;

      // Reverse geocode to get a readable address if available
      let address = '';
      try {
        const geocode = await Location.reverseGeocodeAsync({ latitude, longitude });
        if (geocode && geocode.length > 0) {
          const g = geocode[0];
          address = [g.name, g.street, g.subregion || g.district, g.city]
            .filter(Boolean)
            .join(', ');
        }
      } catch {
        // Geocode failure is non-fatal
      }

      onSendLocation({
        latitude,
        longitude,
        address: address || undefined,
      });
    } catch (err: any) {
      console.warn('Location sharing error:', err);
      Alert.alert(STRINGS.COMMON.ERROR, STRINGS.CHAT.LOCATION_SHARING_ERROR);
    } finally {
      setIsLocating(false);
    }
  };

  const canSend = Boolean(inputText.trim()) && !isSending;

  return (
    <View style={styles.container}>
      {/* Plus Action Button */}
      <TouchableOpacity
        style={styles.actionBtn}
        onPress={() => setShowActionModal(true)}
        activeOpacity={0.7}
        disabled={isSending || isLocating}
      >
        {isLocating ? (
          <ActivityIndicator size="small" color={theme.colors.primary[600]} />
        ) : (
          <Ionicons
            name="add"
            size={22}
            color={theme.colors.slate[600]}
          />
        )}
      </TouchableOpacity>

      {/* Multiline TextInput */}
      <View style={styles.inputWrap}>
        <TextInput
          style={[styles.textInput, { height: Math.max(38, Math.min(inputHeight, 90)) }]}
          placeholder={STRINGS.CHAT.TYPE_MESSAGE_PLACEHOLDER}
          placeholderTextColor={theme.colors.slate[400]}
          value={inputText}
          onChangeText={setInputText}
          multiline
          onContentSizeChange={(e: any) => setInputHeight(e.nativeEvent.contentSize.height)}
          maxLength={1000}
        />
      </View>

      {/* Send Button */}
      <TouchableOpacity
        style={[styles.sendBtn, !canSend && styles.sendBtnDisabled]}
        onPress={handleSend}
        activeOpacity={0.75}
        disabled={!canSend}
      >
        {isSending ? (
          <ActivityIndicator size="small" color={theme.colors.white} />
        ) : (
          <Ionicons
            name="send"
            size={16}
            color={theme.colors.white}
          />
        )}
      </TouchableOpacity>

      {/* Action Sheet Modal */}
      <Modal
        visible={showActionModal}
        transparent
        animationType="fade"
        onRequestClose={() => setShowActionModal(false)}
      >
        <Pressable
          style={styles.modalOverlay}
          onPress={() => setShowActionModal(false)}
        >
          <Pressable style={styles.modalContent} onPress={(e: any) => e.stopPropagation()}>
            <Text style={styles.modalTitle}>{STRINGS.CHAT.ATTACHMENT_OPTIONS_TITLE}</Text>
            <Text style={styles.modalSub}>{STRINGS.CHAT.ATTACHMENT_OPTIONS_SUB}</Text>

            <View style={styles.optionsList}>
              {/* Photo Library */}
              <TouchableOpacity
                style={styles.optionRow}
                onPress={() => handlePickImage(false)}
                activeOpacity={0.7}
              >
                <View style={[styles.optionIconWrap, { backgroundColor: theme.colors.primary[50] }]}>
                  <Ionicons name="images-outline" size={20} color={theme.colors.primary[600]} />
                </View>
                <Text style={styles.optionText}>{STRINGS.CHAT.CHOOSE_PHOTO}</Text>
                <Ionicons name="chevron-forward" size={16} color={theme.colors.slate[400]} />
              </TouchableOpacity>

              {/* Camera */}
              <TouchableOpacity
                style={styles.optionRow}
                onPress={() => handlePickImage(true)}
                activeOpacity={0.7}
              >
                <View style={[styles.optionIconWrap, { backgroundColor: theme.colors.warning[50] }]}>
                  <Ionicons name="camera-outline" size={20} color={theme.colors.warning[600]} />
                </View>
                <Text style={styles.optionText}>{STRINGS.CHAT.TAKE_PHOTO}</Text>
                <Ionicons name="chevron-forward" size={16} color={theme.colors.slate[400]} />
              </TouchableOpacity>

              {/* GPS Location */}
              <TouchableOpacity
                style={styles.optionRow}
                onPress={handleShareLocation}
                activeOpacity={0.7}
              >
                <View style={[styles.optionIconWrap, { backgroundColor: theme.colors.success[50] }]}>
                  <Ionicons name="location-outline" size={20} color={theme.colors.success[600]} />
                </View>
                <Text style={styles.optionText}>{STRINGS.CHAT.SHARE_LOCATION}</Text>
                <Ionicons name="chevron-forward" size={16} color={theme.colors.slate[400]} />
              </TouchableOpacity>
            </View>

            <TouchableOpacity
              style={styles.cancelButton}
              onPress={() => setShowActionModal(false)}
              activeOpacity={0.8}
            >
              <Text style={styles.cancelButtonText}>{STRINGS.CHAT.CANCEL}</Text>
            </TouchableOpacity>
          </Pressable>
        </Pressable>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.sm,
    backgroundColor: theme.colors.card,
    borderTopWidth: 1,
    borderTopColor: theme.colors.slate[100],
    gap: theme.spacing.xs + 2,
  },
  actionBtn: {
    width: 38,
    height: 38,
    borderRadius: theme.radii.full,
    backgroundColor: theme.colors.slate[100],
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 1,
  },
  inputWrap: {
    flex: 1,
    backgroundColor: theme.colors.slate[50],
    borderRadius: theme.radii.lg,
    borderWidth: 1,
    borderColor: theme.colors.slate[200],
    paddingHorizontal: theme.spacing.md,
    paddingVertical: 2,
    justifyContent: 'center',
  },
  textInput: {
    ...theme.typography.body,
    fontSize: 14.5,
    color: theme.colors.slate[900],
    paddingTop: 8,
    paddingBottom: 8,
  },
  sendBtn: {
    width: 38,
    height: 38,
    borderRadius: theme.radii.full,
    backgroundColor: theme.colors.primary[600],
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 1,
  },
  sendBtnDisabled: {
    opacity: 0.45,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: theme.colors.overlay,
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: theme.colors.card,
    borderTopLeftRadius: theme.radii.xl,
    borderTopRightRadius: theme.radii.xl,
    paddingHorizontal: theme.spacing.lg,
    paddingTop: theme.spacing.lg,
    paddingBottom: theme.spacing.xl,
  },
  modalTitle: {
    ...theme.typography.subheading,
    fontSize: 17,
    fontWeight: '700',
    color: theme.colors.slate[900],
  },
  modalSub: {
    ...theme.typography.caption,
    fontSize: 12.5,
    color: theme.colors.slate[500],
    marginTop: 2,
    marginBottom: theme.spacing.md,
  },
  optionsList: {
    gap: theme.spacing.xs,
    marginBottom: theme.spacing.md,
  },
  optionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: theme.spacing.sm + 2,
    paddingHorizontal: theme.spacing.sm,
    borderRadius: theme.radii.md,
    gap: theme.spacing.md,
  },
  optionIconWrap: {
    width: 40,
    height: 40,
    borderRadius: theme.radii.full,
    alignItems: 'center',
    justifyContent: 'center',
  },
  optionText: {
    ...theme.typography.body,
    fontSize: 14.5,
    fontWeight: '600',
    color: theme.colors.slate[900],
    flex: 1,
  },
  cancelButton: {
    paddingVertical: theme.spacing.md - 2,
    borderRadius: theme.radii.md,
    backgroundColor: theme.colors.slate[100],
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: theme.spacing.xs,
  },
  cancelButtonText: {
    ...theme.typography.body,
    fontSize: 14,
    fontWeight: '700',
    color: theme.colors.slate[600],
  },
});
