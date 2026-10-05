import React from 'react';
import {
  Modal,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { AIReview } from '../../types/ai';
import { colors } from '../../theme/colors';
import { ProsConsCard } from './ProsConsCard';

interface AiReviewModalProps {
  visible: boolean;
  review: AIReview | null;
  onClose: () => void;
}

export function AiReviewModal({
  visible,
  review,
  onClose,
}: AiReviewModalProps) {
  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
    >
      <View style={styles.overlay}>
        <View style={styles.modal}>
          <Text style={styles.heading}>AI Device Review</Text>

          {review ? (
            <ScrollView
              style={styles.reviewScroll}
              contentContainerStyle={styles.reviewContent}
              showsVerticalScrollIndicator={false}
            >
              <ProsConsCard title="Pros" items={review.pros} type="pros" />
              <ProsConsCard title="Cons" items={review.cons} type="cons" />

              <View style={styles.adviceCard}>
                <Text style={styles.sectionTitle}>Advice</Text>
                <Text style={styles.adviceText}>{review.advice}</Text>
              </View>
            </ScrollView>
          ) : null}

          <TouchableOpacity
            style={styles.closeButton}
            onPress={onClose}
            activeOpacity={0.8}
          >
            <Text style={styles.closeButtonText}>Close</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: 'center',
    backgroundColor: 'rgba(15, 23, 42, 0.5)',
    padding: 20,
  },
  modal: {
    maxHeight: '85%',
    backgroundColor: colors.light.background,
    borderRadius: 18,
    padding: 20,
  },
  heading: {
    color: colors.light.textPrimary,
    fontSize: 20,
    fontWeight: '800',
    marginBottom: 16,
  },
  reviewScroll: {
    flexShrink: 1,
  },
  reviewContent: {
    paddingBottom: 4,
  },
  adviceCard: {
    backgroundColor: colors.light.surface,
    borderColor: colors.light.border,
    borderWidth: 1,
    borderRadius: 12,
    padding: 14,
  },
  sectionTitle: {
    color: colors.light.textPrimary,
    fontSize: 16,
    fontWeight: '700',
    marginBottom: 8,
  },
  adviceText: {
    color: colors.light.textSecondary,
    fontSize: 14,
    lineHeight: 21,
  },
  closeButton: {
    alignItems: 'center',
    backgroundColor: colors.light.primary,
    borderRadius: 12,
    marginTop: 16,
    paddingVertical: 12,
  },
  closeButtonText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '700',
  },
});
