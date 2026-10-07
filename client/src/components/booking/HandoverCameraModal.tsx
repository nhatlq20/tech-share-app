import React, { useState, useEffect } from 'react';
import {
  StyleSheet,
  View,
  Text,
  Modal,
  TouchableOpacity,
  Pressable,
  Image,
  ScrollView,
  TextInput,
  ActivityIndicator,
  Alert,
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../../theme/colors';
import { bookingService, Booking } from '../../services/bookingService';

interface HandoverCameraModalProps {
  visible: boolean;
  booking: Booking | null;
  onClose: () => void;
  onSuccess: () => void;
}

interface PhotoSlot {
  key: string;
  title: string;
  subtitle: string;
  icon: keyof typeof Ionicons.glyphMap;
}

const PHOTO_SLOTS: PhotoSlot[] = [
  {
    key: 'front',
    title: '1. Mặt trước',
    subtitle: 'Màn hình sáng rõ, viền trên/dưới',
    icon: 'phone-portrait-outline',
  },
  {
    key: 'back',
    title: '2. Mặt sau',
    subtitle: 'Mặt lưng, cụm camera, logo',
    icon: 'camera-reverse-outline',
  },
  {
    key: 'edges',
    title: '3. Cạnh viền & Góc',
    subtitle: 'Khung viền, cổng sạc, phím bấm',
    icon: 'tablet-landscape-outline',
  },
  {
    key: 'accessories',
    title: '4. Phụ kiện & Hộp',
    subtitle: 'Củ cáp sạc, bao da, thẻ nhớ...',
    icon: 'cube-outline',
  },
];

export function HandoverCameraModal({
  visible,
  booking,
  onClose,
  onSuccess,
}: HandoverCameraModalProps) {
  const [photos, setPhotos] = useState(['', '', '', ''] as string[]);
  const [conditionNotes, setConditionNotes] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (booking?.handoverPhotos?.beforeRental && booking.handoverPhotos.beforeRental.length > 0) {
      const initial = ['', '', '', ''];
      booking.handoverPhotos.beforeRental.forEach((url, i) => {
        if (i < 4) initial[i] = url;
      });
      setPhotos(initial);
    } else {
      setPhotos(['', '', '', '']);
    }

    if (booking?.conditionNotes?.before) {
      setConditionNotes(booking.conditionNotes.before);
    } else {
      setConditionNotes('');
    }
  }, [booking, visible]);

  if (!booking) return null;

  const handlePickImage = (index: number) => {
    Alert.alert('Chụp ảnh nhận máy', 'Chọn phương thức chụp ảnh cho góc máy này:', [
      {
        text: 'Chụp bằng Camera 📸',
        onPress: async () => {
          try {
            const permission = await ImagePicker.requestCameraPermissionsAsync();
            if (!permission.granted) {
              Alert.alert('Quyền truy cập', 'Vui lòng cấp quyền Camera để chụp ảnh thiết bị.');
              return;
            }
            const result = await ImagePicker.launchCameraAsync({
              allowsEditing: true,
              quality: 0.8,
            });
            if (!result.canceled && result.assets[0]?.uri) {
              const updated = [...photos];
              updated[index] = result.assets[0].uri;
              setPhotos(updated);
            }
          } catch (err: any) {
            Alert.alert('Lỗi camera', err.message || 'Không thể mở Camera.');
          }
        },
      },
      {
        text: 'Chọn từ Thư viện 🖼️',
        onPress: async () => {
          try {
            const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
            if (!permission.granted) {
              Alert.alert('Quyền truy cập', 'Vui lòng cấp quyền Thư viện ảnh để chọn ảnh thiết bị.');
              return;
            }
            const result = await ImagePicker.launchImageLibraryAsync({
              allowsEditing: true,
              quality: 0.8,
            });
            if (!result.canceled && result.assets[0]?.uri) {
              const updated = [...photos];
              updated[index] = result.assets[0].uri;
              setPhotos(updated);
            }
          } catch (err: any) {
            Alert.alert('Lỗi thư viện ảnh', err.message || 'Không thể mở thư viện ảnh.');
          }
        },
      },
      { text: 'Hủy', style: 'cancel' },
    ]);
  };

  const handleRemovePhoto = (index: number) => {
    const updated = [...photos];
    updated[index] = '';
    setPhotos(updated);
  };

  const handleSave = async () => {
    const validPhotos = photos.filter((p: string) => Boolean(p && p.trim()));
    if (validPhotos.length === 0) {
      Alert.alert('Thiếu hình ảnh', 'Vui lòng chụp ít nhất 1 ảnh thiết bị lúc nhận bàn giao.');
      return;
    }

    try {
      setSubmitting(true);
      await bookingService.updateBeforeRentalPhotos(
        booking._id,
        validPhotos,
        conditionNotes.trim()
      );
      Alert.alert(
        'Thành công 🎉',
        `Đã lưu ${validPhotos.length} ảnh biên bản nhận bàn giao máy (beforeRental). Bằng chứng này sẽ bảo vệ bạn trong suốt thời gian thuê.`
      );
      onSuccess();
      onClose();
    } catch (err: any) {
      console.error('Lỗi lưu ảnh nhận máy:', err);
      Alert.alert('Lỗi', err.response?.data?.message || 'Không thể lưu ảnh nhận bàn giao lúc này.');
    } finally {
      setSubmitting(false);
    }
  };

  const countTaken = photos.filter(Boolean).length;

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
    >
      <View style={styles.backdrop}>
        <View style={styles.sheetContainer}>
          {/* Header */}
          <View style={styles.headerRow}>
            <View style={styles.headerLeft}>
              <View style={styles.iconCircle}>
                <Ionicons name="camera" size={20} color={colors.light.primary} />
              </View>
              <View>
                <Text style={styles.title}>Chụp ảnh nhận máy</Text>
                <Text style={styles.subtitle}>Hiện trạng 4 góc thiết bị (beforeRental)</Text>
              </View>
            </View>
            <TouchableOpacity style={styles.closeBtn} onPress={onClose} disabled={submitting}>
              <Ionicons name="close" size={20} color="#64748B" />
            </TouchableOpacity>
          </View>

          {/* Progress bar */}
          <View style={styles.progressRow}>
            <Text style={styles.progressText}>
              Đã chụp: <Text style={styles.progressHighlight}>{countTaken}/4</Text> góc máy
            </Text>
            <View style={styles.progressBarBg}>
              <View style={[styles.progressBarFill, { width: `${(countTaken / 4) * 100}%` }]} />
            </View>
          </View>

          <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollBody}>
            {/* 4 Photo Slots Grid */}
            <View style={styles.slotsGrid}>
              {PHOTO_SLOTS.map((slot, index) => {
                const photoUri = photos[index];
                return (
                  <View key={slot.key} style={styles.slotItem}>
                    {photoUri ? (
                      <View style={styles.photoFilledCard}>
                        <Image source={{ uri: photoUri }} style={styles.photoPreview} />
                        <View style={styles.photoTag}>
                          <Text style={styles.photoTagText}>{slot.title}</Text>
                        </View>
                        <TouchableOpacity
                          style={styles.removePhotoBtn}
                          onPress={() => handleRemovePhoto(index)}
                          activeOpacity={0.7}
                        >
                          <Ionicons name="trash-outline" size={14} color="#FFFFFF" />
                        </TouchableOpacity>
                        <TouchableOpacity
                          style={styles.retakePhotoBtn}
                          onPress={() => handlePickImage(index)}
                          activeOpacity={0.7}
                        >
                          <Ionicons name="camera-outline" size={14} color="#FFFFFF" />
                        </TouchableOpacity>
                      </View>
                    ) : (
                      <TouchableOpacity
                        style={styles.slotEmptyCard}
                        onPress={() => handlePickImage(index)}
                        activeOpacity={0.75}
                      >
                        <View style={styles.emptyIconBox}>
                          <Ionicons name={slot.icon} size={24} color={colors.light.primary} />
                        </View>
                        <Text style={styles.slotTitleText}>{slot.title}</Text>
                        <Text style={styles.slotSubText} numberOfLines={2}>
                          {slot.subtitle}
                        </Text>
                        <View style={styles.addBadge}>
                          <Ionicons name="add" size={12} color="#FFFFFF" />
                          <Text style={styles.addBadgeText}>Chụp ảnh</Text>
                        </View>
                      </TouchableOpacity>
                    )}
                  </View>
                );
              })}
            </View>

            {/* Condition Notes Input */}
            <View style={styles.notesContainer}>
              <Text style={styles.notesLabel}>Ghi chú hiện trạng ban đầu (tùy chọn):</Text>
              <TextInput
                style={styles.notesInput}
                placeholder="VD: Máy có vết xước nhẹ góc dưới bên trái, màn hình đã dán cường lực tốt, phụ kiện gồm củ cáp zin..."
                placeholderTextColor="#94A3B8"
                multiline
                numberOfLines={3}
                value={conditionNotes}
                onChangeText={setConditionNotes}
              />
            </View>

            {/* Warning Advice */}
            <View style={styles.adviceBox}>
              <Ionicons name="shield-outline" size={16} color={colors.light.primary} />
              <Text style={styles.adviceText}>
                Ảnh chụp lúc nhận máy là căn cứ quan trọng nhất để đối chiếu với ảnh lúc trả máy (`afterRental`), giúp giải quyết tranh chấp hoàn cọc minh bạch.
              </Text>
            </View>
          </ScrollView>

          {/* Bottom Actions */}
          <View style={styles.bottomBar}>
            <TouchableOpacity
              style={styles.cancelBtn}
              onPress={onClose}
              disabled={submitting}
            >
              <Text style={styles.cancelBtnText}>Bỏ qua</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.saveBtn, (submitting || countTaken === 0) && { opacity: 0.6 }]}
              onPress={handleSave}
              disabled={submitting || countTaken === 0}
            >
              {submitting ? (
                <ActivityIndicator size="small" color="#FFFFFF" />
              ) : (
                <>
                  <Ionicons name="checkmark-done" size={18} color="#FFFFFF" />
                  <Text style={styles.saveBtnText}>Lưu biên bản nhận máy</Text>
                </>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.65)',
    justifyContent: 'flex-end',
  },
  sheetContainer: {
    backgroundColor: colors.light.card,
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    maxHeight: '90%',
    paddingTop: 20,
    paddingHorizontal: 20,
    paddingBottom: 24,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  iconCircle: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: colors.light.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.light.textPrimary,
  },
  subtitle: {
    fontSize: 12,
    color: colors.light.textSecondary,
    marginTop: 2,
  },
  closeBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: colors.light.borderSubtle,
    alignItems: 'center',
    justifyContent: 'center',
  },
  progressRow: {
    marginBottom: 14,
  },
  progressText: {
    fontSize: 13,
    color: '#64748B',
    marginBottom: 6,
  },
  progressHighlight: {
    fontWeight: '700',
    color: colors.light.primary,
  },
  progressBarBg: {
    height: 6,
    backgroundColor: '#F1F5F9',
    borderRadius: 3,
    overflow: 'hidden',
  },
  progressBarFill: {
    height: '100%',
    backgroundColor: colors.light.primary,
    borderRadius: 3,
  },
  scrollBody: {
    paddingBottom: 16,
  },
  slotsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    gap: 12,
    marginBottom: 16,
  },
  slotItem: {
    width: '48%',
    aspectRatio: 1,
  },
  slotEmptyCard: {
    flex: 1,
    backgroundColor: '#F8FAFC',
    borderRadius: 16,
    borderWidth: 1.5,
    borderColor: '#E2E8F0',
    borderStyle: 'dashed',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 10,
  },
  emptyIconBox: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: colors.light.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 6,
  },
  slotTitleText: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.light.textPrimary,
    textAlign: 'center',
  },
  slotSubText: {
    fontSize: 10,
    color: colors.light.textMuted,
    textAlign: 'center',
    marginTop: 2,
    lineHeight: 14,
  },
  addBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
    backgroundColor: colors.light.primary,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 12,
    marginTop: 8,
  },
  addBadgeText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  photoFilledCard: {
    flex: 1,
    borderRadius: 16,
    overflow: 'hidden',
    position: 'relative',
    backgroundColor: '#0F172A',
  },
  photoPreview: {
    width: '100%',
    height: '100%',
    resizeMode: 'cover',
  },
  photoTag: {
    position: 'absolute',
    bottom: 6,
    left: 6,
    right: 6,
    backgroundColor: 'rgba(15, 23, 42, 0.75)',
    paddingVertical: 3,
    paddingHorizontal: 6,
    borderRadius: 6,
  },
  photoTagText: {
    fontSize: 10,
    fontWeight: '600',
    color: '#FFFFFF',
    textAlign: 'center',
  },
  removePhotoBtn: {
    position: 'absolute',
    top: 6,
    right: 6,
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: 'rgba(239, 68, 68, 0.9)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  retakePhotoBtn: {
    position: 'absolute',
    top: 6,
    left: 6,
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: 'rgba(37, 99, 235, 0.9)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  notesContainer: {
    marginBottom: 14,
  },
  notesLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: '#1E293B',
    marginBottom: 6,
  },
  notesInput: {
    backgroundColor: '#F8FAFC',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.light.borderDefault,
    padding: 12,
    fontSize: 13,
    color: colors.light.textPrimary,
    minHeight: 70,
    textAlignVertical: 'top',
  },
  adviceBox: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
    backgroundColor: colors.light.primaryLight,
    padding: 12,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: colors.light.primaryLight,
  },
  adviceText: {
    flex: 1,
    fontSize: 12,
    color: colors.light.primaryDark,
    lineHeight: 18,
  },
  bottomBar: {
    flexDirection: 'row',
    gap: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: colors.light.borderSubtle,
  },
  cancelBtn: {
    flex: 1,
    backgroundColor: colors.light.borderSubtle,
    paddingVertical: 13,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cancelBtnText: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.light.textSecondary,
  },
  saveBtn: {
    flex: 2,
    flexDirection: 'row',
    backgroundColor: colors.light.primary,
    paddingVertical: 13,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  saveBtnText: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.light.white,
  },
});
