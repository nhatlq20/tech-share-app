import React, { useEffect, useState, useCallback, useMemo } from 'react';
import {
  StyleSheet,
  View,
  Text,
  TouchableOpacity,
  Image,
  ActivityIndicator,
  ScrollView,
  Modal,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { reviewService, ReviewItem } from '../../services/reviewService';
import { colors } from '../../theme/colors';

interface ReviewListSectionProps {
  deviceId: string;
  ratingAvg?: number;
  ratingCount?: number;
}

type FilterType = 'all' | 'photo' | '5' | '4' | '3below';

const FILTER_LABELS: Record<FilterType, string> = {
  all: 'All',
  photo: '📷 With Photos',
  '5': '5 ★',
  '4': '4 ★',
  '3below': '≤ 3 ★',
};

function maskName(name: string): string {
  if (!name) return 'Anonymous User';
  const parts = name.trim().split(' ');
  return parts
    .map((part: string, idx: number) => {
      if (idx === 0) return part;
      if (part.length <= 1) return part;
      return part[0] + '***';
    })
    .join(' ');
}

function StarRow({ rating, size = 14 }: { rating: number; size?: number }) {
  return (
    <View style={styles.starRow}>
      {[1, 2, 3, 4, 5].map((s) => (
        <Ionicons
          key={s}
          name={s <= Math.round(rating) ? 'star' : 'star-outline'}
          size={size}
          color={colors.light.ratingStar}
        />
      ))}
    </View>
  );
}

function RatingBar({ star, count, total }: { star: number; count: number; total: number }) {
  const pct = total > 0 ? (count / total) * 100 : 0;
  return (
    <View style={styles.ratingBarRow}>
      <Text style={styles.ratingBarLabel}>{star}★</Text>
      <View style={styles.ratingBarTrack}>
        <View style={[styles.ratingBarFill, { width: `${Math.round(pct)}%` as any }]} />
      </View>
      <Text style={styles.ratingBarCount}>{count}</Text>
    </View>
  );
}

export function ReviewListSection({
  deviceId,
  ratingAvg,
  ratingCount,
}: ReviewListSectionProps) {
  const [reviews, setReviews] = useState([] as ReviewItem[]);
  const [loading, setLoading] = useState(true);
  const [activeFilter, setActiveFilter] = useState('all' as FilterType);
  const [lightboxUri, setLightboxUri] = useState(null as string | null);
  const [showAll, setShowAll] = useState(false);

  const fetchReviews = useCallback(async () => {
    try {
      setLoading(true);
      const data = await reviewService.getDeviceReviews(deviceId);
      setReviews(data || []);
    } catch {
      setReviews([]);
    } finally {
      setLoading(false);
    }
  }, [deviceId]);

  useEffect(() => {
    fetchReviews();
  }, [fetchReviews]);

  const starCounts = useMemo(() => {
    const counts: Record<number, number> = { 5: 0, 4: 0, 3: 0, 2: 0, 1: 0 };
    reviews.forEach((r: ReviewItem) => {
      const s = Math.round(r.rating);
      if (s >= 1 && s <= 5) counts[s]++;
    });
    return counts;
  }, [reviews]);

  const totalReviews = reviews.length;
  const avgRating =
    ratingAvg ??
    (totalReviews > 0
      ? reviews.reduce((sum: number, r: ReviewItem) => sum + r.rating, 0) / totalReviews
      : 0);

  const filteredReviews = useMemo(() => {
    switch (activeFilter) {
      case 'photo':
        return reviews.filter((r: ReviewItem) => r.images && r.images.length > 0);
      case '5':
        return reviews.filter((r: ReviewItem) => r.rating >= 4.5);
      case '4':
        return reviews.filter((r: ReviewItem) => r.rating >= 3.5 && r.rating < 4.5);
      case '3below':
        return reviews.filter((r: ReviewItem) => r.rating < 3.5);
      default:
        return reviews;
    }
  }, [reviews, activeFilter]);

  const displayedReviews = showAll ? filteredReviews : filteredReviews.slice(0, 3);

  return (
    <View style={styles.container}>
      <View style={styles.sectionHeaderRow}>
        <Text style={styles.sectionTitle}>⭐ Renter Reviews</Text>
        <Text style={styles.sectionSubtitle}>
          {ratingCount ?? totalReviews} verified rentals
        </Text>
      </View>

      {loading ? (
        <View style={styles.loadingBox}>
          <ActivityIndicator size="small" color={colors.light.primary} />
          <Text style={styles.loadingText}>Loading reviews...</Text>
        </View>
      ) : totalReviews === 0 ? (
        <View style={styles.emptyBox}>
          <Ionicons name="chatbubble-ellipses-outline" size={36} color={colors.light.border} />
          <Text style={styles.emptyTitle}>No reviews yet</Text>
          <Text style={styles.emptyDesc}>
            This device has not been reviewed yet. Be the first renter to share your experience.
          </Text>
        </View>
      ) : (
        <>
          <View style={styles.aggregateCard}>
            <View style={styles.scoreBlock}>
              <Text style={styles.scoreBig}>{avgRating.toFixed(1)}</Text>
              <StarRow rating={avgRating} size={16} />
              <Text style={styles.scoreSub}>{totalReviews} reviews</Text>
            </View>
            <View style={styles.barBlock}>
              {[5, 4, 3, 2, 1].map((s) => (
                <RatingBar key={s} star={s} count={starCounts[s] || 0} total={totalReviews} />
              ))}
            </View>
          </View>

          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            style={styles.filterScroll}
            contentContainerStyle={styles.filterContent}
          >
            {(Object.keys(FILTER_LABELS) as FilterType[]).map((f) => (
              <TouchableOpacity
                key={f}
                style={[styles.filterChip, activeFilter === f && styles.filterChipActive]}
                onPress={() => { setActiveFilter(f); setShowAll(false); }}
                activeOpacity={0.7}
              >
                <Text style={[styles.filterChipText, activeFilter === f && styles.filterChipTextActive]}>
                  {FILTER_LABELS[f]}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>

          {filteredReviews.length === 0 ? (
            <View style={styles.emptyFilter}>
              <Text style={styles.emptyFilterText}>No reviews match this filter.</Text>
            </View>
          ) : (
            <>
              {displayedReviews.map((review: ReviewItem) => {
                const renter = (review.renterId as any) || {};
                const maskedName = maskName(renter.name || '');
                const avatar = renter.avatar || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150';
                const dateStr = new Date(review.createdAt).toLocaleDateString('en-US', { day: 'numeric', month: 'short', year: 'numeric' });

                return (
                  <View key={review._id} style={styles.reviewCard}>
                    <View style={styles.reviewTopRow}>
                      <Image source={{ uri: avatar }} style={styles.reviewAvatar} />
                      <View style={styles.reviewMeta}>
                        <View style={styles.reviewMetaTop}>
                          <Text style={styles.reviewerName}>{maskedName}</Text>
                          <View style={styles.verifiedBadge}>
                            <Ionicons name="checkmark-circle" size={11} color={colors.light.success} />
                            <Text style={styles.verifiedText}>Verified Rental</Text>
                          </View>
                        </View>
                        <View style={styles.reviewMetaBottom}>
                          <StarRow rating={review.rating} size={13} />
                          <Text style={styles.reviewDate}>{dateStr}</Text>
                        </View>
                      </View>
                    </View>
                    <Text style={styles.reviewComment}>{review.comment}</Text>
                    {!!review.ownerFeedback && (
                      <View style={styles.ownerFeedbackBox}>
                        <View style={styles.ownerFeedbackHeader}>
                          <Ionicons name="chatbubble" size={11} color={colors.light.primary} />
                          <Text style={styles.ownerFeedbackLabel}>Owner Response</Text>
                        </View>
                        <Text style={styles.ownerFeedbackText}>{review.ownerFeedback}</Text>
                      </View>
                    )}
                    {review.images && review.images.length > 0 && (
                      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.photoContent}>
                        {review.images.map((uri: string, idx: number) => (
                          <TouchableOpacity key={idx} onPress={() => setLightboxUri(uri)} activeOpacity={0.85}>
                            <Image source={{ uri }} style={styles.reviewPhoto} />
                          </TouchableOpacity>
                        ))}
                      </ScrollView>
                    )}
                  </View>
                );
              })}
              {filteredReviews.length > 3 && !showAll && (
                <TouchableOpacity style={styles.showMoreBtn} onPress={() => setShowAll(true)} activeOpacity={0.8}>
                  <Text style={styles.showMoreText}>Show {filteredReviews.length - 3} More Reviews</Text>
                  <Ionicons name="chevron-down" size={16} color={colors.light.primary} />
                </TouchableOpacity>
              )}
              {showAll && filteredReviews.length > 3 && (
                <TouchableOpacity style={styles.showMoreBtn} onPress={() => setShowAll(false)} activeOpacity={0.8}>
                  <Text style={styles.showMoreText}>Show Less</Text>
                  <Ionicons name="chevron-up" size={16} color={colors.light.primary} />
                </TouchableOpacity>
              )}
            </>
          )}
        </>
      )}

      <Modal visible={!!lightboxUri} transparent animationType="fade" onRequestClose={() => setLightboxUri(null)}>
        <TouchableOpacity style={styles.lightboxOverlay} activeOpacity={1} onPress={() => setLightboxUri(null)}>
          {lightboxUri && <Image source={{ uri: lightboxUri }} style={styles.lightboxImage} resizeMode="contain" />}
          <View style={styles.lightboxClose}>
            <Ionicons name="close-circle" size={32} color="#FFFFFF" />
          </View>
        </TouchableOpacity>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { marginTop: 24, paddingBottom: 12 },
  sectionHeaderRow: { paddingHorizontal: 16, marginBottom: 12 },
  sectionTitle: { fontSize: 16, fontWeight: '800', color: colors.light.textPrimary },
  sectionSubtitle: { fontSize: 12, color: colors.light.textSecondary, marginTop: 2 },
  loadingBox: { alignItems: 'center', paddingVertical: 24, gap: 8 },
  loadingText: { fontSize: 13, color: colors.light.textSecondary },
  emptyBox: { alignItems: 'center', paddingVertical: 28, paddingHorizontal: 24, gap: 8, marginHorizontal: 16, borderRadius: 12, backgroundColor: colors.light.surface, borderWidth: 1, borderColor: colors.light.border },
  emptyTitle: { fontSize: 15, fontWeight: '700', color: colors.light.textPrimary },
  emptyDesc: { fontSize: 13, color: colors.light.textSecondary, textAlign: 'center', lineHeight: 18 },
  emptyFilter: { paddingVertical: 16, alignItems: 'center', paddingHorizontal: 16 },
  emptyFilterText: { fontSize: 13, color: colors.light.textSecondary },
  aggregateCard: { flexDirection: 'row', marginHorizontal: 16, marginBottom: 14, backgroundColor: colors.light.surface, borderRadius: 14, borderWidth: 1, borderColor: colors.light.border, padding: 16, gap: 16 },
  scoreBlock: { alignItems: 'center', justifyContent: 'center', minWidth: 70 },
  scoreBig: { fontSize: 36, fontWeight: '900', color: colors.light.textPrimary, lineHeight: 40 },
  starRow: { flexDirection: 'row', gap: 2, marginTop: 4 },
  scoreSub: { fontSize: 11, color: colors.light.textSecondary, marginTop: 4 },
  barBlock: { flex: 1, justifyContent: 'center', gap: 5 },
  ratingBarRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  ratingBarLabel: { fontSize: 11, fontWeight: '600', color: colors.light.textSecondary, width: 24 },
  ratingBarTrack: { flex: 1, height: 7, borderRadius: 4, backgroundColor: colors.light.border, overflow: 'hidden' },
  ratingBarFill: { height: '100%', borderRadius: 4, backgroundColor: colors.light.ratingStar },
  ratingBarCount: { fontSize: 11, color: colors.light.textSecondary, width: 20, textAlign: 'right' },
  filterScroll: { marginBottom: 12 },
  filterContent: { paddingHorizontal: 16, gap: 8, flexDirection: 'row' },
  filterChip: { paddingHorizontal: 14, paddingVertical: 6, borderRadius: 99, borderWidth: 1, borderColor: colors.light.border, backgroundColor: colors.light.background },
  filterChipActive: { backgroundColor: colors.light.primary, borderColor: colors.light.primary },
  filterChipText: { fontSize: 13, fontWeight: '600', color: colors.light.textSecondary },
  filterChipTextActive: { color: colors.light.white },
  reviewCard: { backgroundColor: colors.light.background, borderRadius: 12, borderWidth: 1, borderColor: colors.light.border, padding: 14, marginHorizontal: 16, marginBottom: 10, gap: 10 },
  reviewTopRow: { flexDirection: 'row', gap: 10, alignItems: 'flex-start' },
  reviewAvatar: { width: 38, height: 38, borderRadius: 19, backgroundColor: colors.light.surface },
  reviewMeta: { flex: 1, gap: 4 },
  reviewMetaTop: { flexDirection: 'row', alignItems: 'center', gap: 8, flexWrap: 'wrap' },
  reviewerName: { fontSize: 14, fontWeight: '700', color: colors.light.textPrimary },
  verifiedBadge: { flexDirection: 'row', alignItems: 'center', gap: 3, backgroundColor: colors.light.successLight, paddingHorizontal: 6, paddingVertical: 1, borderRadius: 4 },
  verifiedText: { fontSize: 10, fontWeight: '600', color: colors.light.success },
  reviewMetaBottom: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  reviewDate: { fontSize: 11, color: colors.light.textSecondary },
  reviewComment: { fontSize: 13, color: colors.light.textPrimary, lineHeight: 20 },
  ownerFeedbackBox: { backgroundColor: colors.light.surface, borderLeftWidth: 3, borderLeftColor: colors.light.primary, borderRadius: 6, padding: 10, gap: 4 },
  ownerFeedbackHeader: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  ownerFeedbackLabel: { fontSize: 11, fontWeight: '700', color: colors.light.primary },
  ownerFeedbackText: { fontSize: 12, color: colors.light.textSecondary, lineHeight: 18 },
  photoContent: { gap: 6, flexDirection: 'row', paddingTop: 4 },
  reviewPhoto: { width: 80, height: 80, borderRadius: 8, backgroundColor: colors.light.surface },
  showMoreBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, marginHorizontal: 16, marginTop: 4, paddingVertical: 10, borderRadius: 10, borderWidth: 1, borderColor: colors.light.primary, backgroundColor: colors.light.primaryLight },
  showMoreText: { fontSize: 13, fontWeight: '700', color: colors.light.primary },
  lightboxOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.92)', justifyContent: 'center', alignItems: 'center' },
  lightboxImage: { width: '100%', height: '80%' },
  lightboxClose: { position: 'absolute', top: 50, right: 20 },
});
