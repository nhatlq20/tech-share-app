import React, { useState } from 'react';
import {
  StyleSheet,
  View,
  Text,
  Modal,
  TouchableOpacity,
  TextInput,
  Image,
  ActivityIndicator,
  Alert,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../../theme/colors';
import { STRINGS } from '../../constants/strings';
import { reviewService, ReviewItem } from '../../services/reviewService';

interface OwnerRateRenterModalProps {
  visible: boolean;
  onClose: () => void;
  review: ReviewItem | null;  // Review object from completed booking
  onSuccess: () => void;
}

const TRUST_LABELS: Record<number, { label: string; color: string; icon: string; desc: string }> = {
  1: {
    label: STRINGS.OWNER_RATE_RENTER_MODAL.LEVELS[1].label,
    color: colors.light.error,
    icon: 'thumbs-down',
    desc: STRINGS.OWNER_RATE_RENTER_MODAL.LEVELS[1].desc,
  },
  2: {
    label: STRINGS.OWNER_RATE_RENTER_MODAL.LEVELS[2].label,
    color: colors.light.warning,
    icon: 'warning-outline',
    desc: STRINGS.OWNER_RATE_RENTER_MODAL.LEVELS[2].desc,
  },
  3: {
    label: STRINGS.OWNER_RATE_RENTER_MODAL.LEVELS[3].label,
    color: colors.light.warning,
    icon: 'remove-circle-outline',
    desc: STRINGS.OWNER_RATE_RENTER_MODAL.LEVELS[3].desc,
  },
  4: {
    label: STRINGS.OWNER_RATE_RENTER_MODAL.LEVELS[4].label,
    color: colors.light.success,
    icon: 'thumbs-up-outline',
    desc: STRINGS.OWNER_RATE_RENTER_MODAL.LEVELS[4].desc,
  },
  5: {
    label: STRINGS.OWNER_RATE_RENTER_MODAL.LEVELS[5].label,
    color: colors.light.primary,
    icon: 'star',
    desc: STRINGS.OWNER_RATE_RENTER_MODAL.LEVELS[5].desc,
  },
};

export function OwnerRateRenterModal({ visible, onClose, review, onSuccess }: OwnerRateRenterModalProps) {
  const [selectedRating, setSelectedRating] = useState(5);
  const [feedback, setFeedback] = useState('');
  const [selectedTags, setSelectedTags] = useState([] as string[]);
  const [submitting, setSubmitting] = useState(false);

  const reviewAny = review as any;
  const renter = reviewAny?.renterId || reviewAny?.renter || {};
  const currentTrustScore = renter.trustScore ?? 100;
  const deviceName =
    reviewAny?.deviceId?.name ||
    reviewAny?.deviceId?.title ||
    reviewAny?.device?.name ||
    reviewAny?.device?.title ||
    STRINGS.OWNER_RATE_RENTER_MODAL.DEFAULT_DEVICE;
  const trustInfo = TRUST_LABELS[selectedRating];

  const toggleTag = (tag: string) => {
    setSelectedTags((prev: string[]) =>
      prev.includes(tag) ? prev.filter((t: string) => t !== tag) : [...prev, tag]
    );
  };

  const buildFeedback = (): string => {
    const parts: string[] = [];
    if (selectedTags.length > 0) parts.push(selectedTags.join(', '));
    if (feedback.trim()) parts.push(feedback.trim());
    return parts.join('. ');
  };

  const handleSubmit = async () => {
    if (!review) return;

    const targetId =
      review._id ||
      (typeof review.bookingId === 'string'
        ? review.bookingId
        : (review.bookingId as any)?._id);

    if (!targetId) {
      Alert.alert(STRINGS.COMMON.ERROR, STRINGS.OWNER_RATE_RENTER_MODAL.ERR_NOT_FOUND);
      return;
    }

    const finalFeedback = buildFeedback();

    try {
      setSubmitting(true);
      await reviewService.ownerRateRenter(targetId, {
        renterTrustRating: selectedRating,
        renterFeedback: finalFeedback,
      });

      const deltaStr = STRINGS.OWNER_RATE_RENTER_MODAL.DELTA_INFO[selectedRating] || '';
      Alert.alert(
        STRINGS.OWNER_RATE_RENTER_MODAL.SUCCESS_TITLE,
        STRINGS.OWNER_RATE_RENTER_MODAL.SUCCESS_MSG(selectedRating, deltaStr)
      );
      onSuccess();
      onClose();
    } catch (err: any) {
      const msg = err?.response?.data?.message || STRINGS.OWNER_RATE_RENTER_MODAL.ERR_SUBMIT;
      Alert.alert(STRINGS.COMMON.ERROR, msg);
    } finally {
      setSubmitting(false);
    }
  };

  const resetModal = () => {
    setSelectedRating(5);
    setFeedback('');
    setSelectedTags([]);
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
      onShow={resetModal}
    >
      <KeyboardAvoidingView
        style={styles.overlay}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <View style={styles.sheet}>
          {/* Handle Bar */}
          <View style={styles.handleBar} />

          {/* Header */}
          <View style={styles.header}>
            <View style={styles.headerIconBox}>
              <Ionicons name="shield-checkmark" size={20} color={colors.light.primary} />
            </View>
            <View style={styles.headerText}>
              <Text style={styles.headerTitle}>{STRINGS.OWNER_RATE_RENTER_MODAL.TITLE}</Text>
              <Text style={styles.headerSubtitle}>{STRINGS.OWNER_RATE_RENTER_MODAL.SUBTITLE}</Text>
            </View>
            <TouchableOpacity onPress={onClose} style={styles.closeBtn} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
              <Ionicons name="close" size={20} color={colors.light.textSecondary} />
            </TouchableOpacity>
          </View>

          <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollBody}>
            {/* Renter Profile Summary */}
            {review && (
              <View style={styles.renterCard}>
                <Image
                  source={{ uri: renter.avatar || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150' }}
                  style={styles.renterAvatar}
                />
                <View style={styles.renterInfo}>
                  <Text style={styles.renterName}>{renter.name || STRINGS.OWNER_RATE_RENTER_MODAL.DEFAULT_RENTER}</Text>
                  <Text style={styles.renterDevice} numberOfLines={1}>{deviceName}</Text>
                  <View style={styles.trustScoreRow}>
                    <Ionicons name="shield-checkmark-outline" size={13} color={colors.light.primary} />
                    <Text style={styles.trustScoreText}>
                      {STRINGS.OWNER_RATE_RENTER_MODAL.CURRENT_TRUST(currentTrustScore)}
                    </Text>
                  </View>
                </View>
              </View>
            )}

            {/* Star Selector */}
            <Text style={styles.sectionLabel}>{STRINGS.OWNER_RATE_RENTER_MODAL.SECTION_RATING_LEVEL}</Text>
            <View style={styles.starSelector}>
              {[1, 2, 3, 4, 5].map((s) => {
                const info = TRUST_LABELS[s];
                const isActive = selectedRating === s;
                return (
                  <TouchableOpacity
                    key={s}
                    style={[styles.starBtn, isActive && { borderColor: info.color, backgroundColor: info.color + '15' }]}
                    onPress={() => setSelectedRating(s)}
                    activeOpacity={0.7}
                  >
                    <Ionicons
                      name="star"
                      size={28}
                      color={isActive ? info.color : colors.light.border}
                    />
                    <Text style={[styles.starBtnLabel, isActive && { color: info.color }]}>
                      {s}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>

            {/* Rating Description */}
            <View style={[styles.ratingDescBox, { borderLeftColor: trustInfo.color }]}>
              <View style={styles.ratingDescTop}>
                <Ionicons name={trustInfo.icon as any} size={16} color={trustInfo.color} />
                <Text style={[styles.ratingDescTitle, { color: trustInfo.color }]}>
                  {trustInfo.label} — {STRINGS.OWNER_RATE_RENTER_MODAL.DELTA_INFO[selectedRating]}
                </Text>
              </View>
              <Text style={styles.ratingDescText}>{trustInfo.desc}</Text>
            </View>

            {/* Quick Tags */}
            <Text style={styles.sectionLabel}>{STRINGS.OWNER_RATE_RENTER_MODAL.SECTION_QUICK_TAGS}</Text>
            <View style={styles.tagsWrap}>
              {STRINGS.OWNER_RATE_RENTER_MODAL.QUICK_TAGS.map((tag) => {
                const isSelected = selectedTags.includes(tag.label);
                return (
                  <TouchableOpacity
                    key={tag.label}
                    style={[
                      styles.tagChip,
                      isSelected && (tag.good ? styles.tagChipGoodActive : styles.tagChipBadActive),
                    ]}
                    onPress={() => toggleTag(tag.label)}
                    activeOpacity={0.7}
                  >
                    <Text
                      style={[
                        styles.tagChipText,
                        isSelected && (tag.good ? styles.tagChipTextGood : styles.tagChipTextBad),
                      ]}
                    >
                      {tag.label}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>

            {/* Free-form Feedback */}
            <Text style={styles.sectionLabel}>{STRINGS.OWNER_RATE_RENTER_MODAL.SECTION_COMMENTS}</Text>
            <TextInput
              style={styles.textInput}
              placeholder={STRINGS.OWNER_RATE_RENTER_MODAL.COMMENTS_PLACEHOLDER}
              placeholderTextColor={colors.light.textSecondary}
              value={feedback}
              onChangeText={setFeedback}
              multiline
              numberOfLines={3}
              maxLength={300}
            />
            <Text style={styles.charCount}>{feedback.length}/300</Text>

            {/* Action Buttons */}
            <View style={styles.actions}>
              <TouchableOpacity style={styles.cancelBtn} onPress={onClose} disabled={submitting}>
                <Text style={styles.cancelBtnText}>{STRINGS.OWNER_RATE_RENTER_MODAL.SKIP_BTN}</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.submitBtn, { backgroundColor: trustInfo.color }]}
                onPress={handleSubmit}
                disabled={submitting}
                activeOpacity={0.85}
              >
                {submitting ? (
                  <ActivityIndicator size="small" color={colors.light.white} />
                ) : (
                  <>
                    <Ionicons name="shield-checkmark" size={16} color={colors.light.white} />
                    <Text style={styles.submitBtnText}>
                      {STRINGS.OWNER_RATE_RENTER_MODAL.SUBMIT_BTN(selectedRating)}
                    </Text>
                  </>
                )}
              </TouchableOpacity>
            </View>
          </ScrollView>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: { flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(0,0,0,0.55)' },
  sheet: { backgroundColor: colors.light.background, borderTopLeftRadius: 24, borderTopRightRadius: 24, maxHeight: '92%' },
  handleBar: { width: 40, height: 4, borderRadius: 2, backgroundColor: colors.light.border, alignSelf: 'center', marginTop: 10, marginBottom: 6 },
  header: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 16, paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: colors.light.border },
  headerIconBox: { width: 36, height: 36, borderRadius: 10, backgroundColor: colors.light.primaryLight, alignItems: 'center', justifyContent: 'center' },
  headerText: { flex: 1 },
  headerTitle: { fontSize: 15, fontWeight: '800', color: colors.light.textPrimary },
  headerSubtitle: { fontSize: 11, color: colors.light.textSecondary, marginTop: 1 },
  closeBtn: { width: 32, height: 32, borderRadius: 16, backgroundColor: colors.light.surface, alignItems: 'center', justifyContent: 'center' },
  scrollBody: { padding: 16, gap: 14, paddingBottom: 40 },
  renterCard: { flexDirection: 'row', gap: 12, backgroundColor: colors.light.surface, borderRadius: 12, padding: 12, borderWidth: 1, borderColor: colors.light.border },
  renterAvatar: { width: 52, height: 52, borderRadius: 26, backgroundColor: colors.light.border },
  renterInfo: { flex: 1, justifyContent: 'center', gap: 3 },
  renterName: { fontSize: 15, fontWeight: '700', color: colors.light.textPrimary },
  renterDevice: { fontSize: 12, color: colors.light.textSecondary },
  trustScoreRow: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  trustScoreText: { fontSize: 12, fontWeight: '600', color: colors.light.primary },
  sectionLabel: { fontSize: 13, fontWeight: '700', color: colors.light.textPrimary },
  starSelector: { flexDirection: 'row', gap: 8, justifyContent: 'center' },
  starBtn: { width: 58, height: 62, borderRadius: 12, borderWidth: 2, borderColor: colors.light.border, alignItems: 'center', justifyContent: 'center', gap: 4, backgroundColor: colors.light.surface },
  starBtnLabel: { fontSize: 13, fontWeight: '700', color: colors.light.textSecondary },
  ratingDescBox: { backgroundColor: colors.light.surface, borderLeftWidth: 3, borderRadius: 8, padding: 12, gap: 6 },
  ratingDescTop: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  ratingDescTitle: { fontSize: 13, fontWeight: '700' },
  ratingDescText: { fontSize: 12, color: colors.light.textSecondary, lineHeight: 18 },
  tagsWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  tagChip: { paddingHorizontal: 12, paddingVertical: 7, borderRadius: 99, borderWidth: 1, borderColor: colors.light.border, backgroundColor: colors.light.surface },
  tagChipGoodActive: { borderColor: colors.light.success, backgroundColor: colors.light.successLight },
  tagChipBadActive: { borderColor: colors.light.warning, backgroundColor: colors.light.warningLight },
  tagChipText: { fontSize: 12, fontWeight: '600', color: colors.light.textSecondary },
  tagChipTextGood: { color: colors.light.success },
  tagChipTextBad: { color: colors.light.warning },
  textInput: { borderWidth: 1, borderColor: colors.light.border, borderRadius: 10, padding: 12, fontSize: 13, color: colors.light.textPrimary, backgroundColor: colors.light.surface, textAlignVertical: 'top', minHeight: 80 },
  charCount: { fontSize: 11, color: colors.light.textSecondary, textAlign: 'right', marginTop: -8 },
  actions: { flexDirection: 'row', gap: 10, marginTop: 6 },
  cancelBtn: { flex: 1, paddingVertical: 12, borderRadius: 10, borderWidth: 1, borderColor: colors.light.border, alignItems: 'center', backgroundColor: colors.light.surface },
  cancelBtnText: { fontSize: 14, fontWeight: '600', color: colors.light.textSecondary },
  submitBtn: { flex: 2, paddingVertical: 12, borderRadius: 10, alignItems: 'center', flexDirection: 'row', justifyContent: 'center', gap: 6 },
  submitBtnText: { fontSize: 14, fontWeight: '700', color: colors.light.white },
});
