import React, { useEffect, useRef, useState } from 'react';
import axios from 'axios';
import {
  StyleSheet,
  View,
  Text,
  ScrollView,
  Image,
  TouchableOpacity,
  ActivityIndicator,
  StatusBar,
  Platform,
  Alert,
  useWindowDimensions,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { deviceService } from '../../services/deviceService';
import { wishlistService } from '../../services/wishlistService';
import { Device } from '../../types';
import { colors } from '../../theme/colors';
import { ReviewListSection } from '../../components/device/ReviewListSection';
import { getAIReview } from '../../services/aiService';
import type { AIReview } from '../../types/ai';
import { AiReviewModal } from '../../components/ai/AiReviewModal';

interface DeviceDetailScreenProps {
  deviceId: string;
  onBack: () => void;
  onBookNow?: (deviceId: string) => void;
  hideBookNow?: boolean;
}

const formatPrice = (price: number): string => {
  return `${price.toLocaleString('en-US')} ₫`;
};

const CONDITION_LABELS: Record<string, string> = {
  new: 'New',
  new99: 'Like New',
  used: 'Used',
  used95: 'Gently Used',
  good: 'Good',
  fair: 'Fair',
  scratched: 'Visible Wear',
};

const STATUS_LABELS: Record<string, string> = {
  available: 'Available',
  rented: 'Currently Rented',
  maintenance: 'Under Maintenance',
  hidden: 'Unavailable',
};

const SPEC_LABELS: Record<string, string> = {
  'màn hình': 'Display',
  pin: 'Battery',
  'bộ nhớ': 'Storage',
  'vi xử lý': 'Chip',
  'hệ điều hành': 'Operating System',
  'kích thước': 'Dimensions',
  'trọng lượng': 'Weight',
};

const getConditionLabel = (condition?: string): string => {
  if (!condition) return 'Not specified';
  return CONDITION_LABELS[condition.toLowerCase()] ?? condition
    .replace(/[_-]+/g, ' ')
    .replace(/\b\w/g, (character: string) => character.toUpperCase());
};

const getSpecLabel = (key: string): string =>
  SPEC_LABELS[key.trim().toLowerCase()] ?? key;

export function DeviceDetailScreen({ deviceId, onBack, onBookNow, hideBookNow }: DeviceDetailScreenProps) {
  const { width: screenWidth } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const topInset = Math.max(
    insets.top,
    Platform.OS === 'android' ? StatusBar.currentHeight || 24 : 20
  );
  const [device, setDevice] = useState(null as Device | null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [isFavorite, setIsFavorite] = useState(false);
  const [retryCount, setRetryCount] = useState(0);
  const [activeImageIndex, setActiveImageIndex] = useState(0);
  const [failedImages, setFailedImages] = useState({} as Record<number, boolean>);
  const [loadingImages, setLoadingImages] = useState({} as Record<number, boolean>);
  const [aiReview, setAiReview] = useState(null as AIReview | null);
  const [aiLoading, setAiLoading] = useState(false);
  const [showAiModal, setShowAiModal] = useState(false);
  const aiRequestInProgress = useRef(false);

  const handleToggleFavorite = async () => {
    if (!device) return;
    const res = await wishlistService.toggleWishlist(device);
    setIsFavorite(res.isInWishlist);
  };

  const handleAIReview = async () => {
    if (!device || aiRequestInProgress.current) return;

    aiRequestInProgress.current = true;
    try {
      setAiLoading(true);
      const data = await getAIReview(device._id);
      setAiReview(data);
      setShowAiModal(true);
    } catch (err: unknown) {
      const status = axios.isAxiosError(err) ? err.response?.status : undefined;
      Alert.alert(
        'Error',
        status === 503
          ? 'AI is currently busy. Please try again later.'
          : 'Unable to analyze this device. Please try again.'
      );
    } finally {
      aiRequestInProgress.current = false;
      setAiLoading(false);
    }
  };

  useEffect(() => {
    let isMounted = true;
    wishlistService.checkIsFavorite(deviceId).then((fav) => {
      if (isMounted) setIsFavorite(fav);
    });

    (async () => {
      setLoading(true);
      setDevice(null);
      setError('');
      setActiveImageIndex(0);
      setFailedImages({});
      setLoadingImages({});
      try {
        const data = await deviceService.getDeviceById(deviceId, { throwOnError: true });
        if (isMounted) setDevice(data);
      } catch (err: unknown) {
        const status = (err as { response?: { status?: number } })?.response?.status;
        if (isMounted) {
          setError(status === 404 ? 'Device not found'
            : status === 400 ? 'Invalid device ID'
            : 'Unable to load device');
        }
      } finally {
        if (isMounted) setLoading(false);
      }
    })();
    return () => {
      isMounted = false;
    };
  }, [deviceId, retryCount]);

  if (loading) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color={colors.light.primary} />
        <Text style={styles.loadingText}>Loading device details...</Text>
      </View>
    );
  }

  if (!device) {
    return (
      <View style={styles.centerContainer}>
        <Ionicons name="alert-circle-outline" size={48} color={colors.light.error} />
        <Text style={styles.errorTitle}>{error || 'Device not found'}</Text>
        <View style={styles.errorActions}>
          <TouchableOpacity
            style={styles.retryBtn}
            onPress={() => setRetryCount((count: number) => count + 1)}
          >
            <Text style={styles.retryBtnText}>Try Again</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.backBtn} onPress={onBack}>
            <Text style={styles.backBtnText}>Back</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  const isAvailable = device.status === 'available';
  const imageUrls = (device.images ?? []).filter(
    (uri: string) => typeof uri === 'string' && uri.trim().length > 0
  );
  const condition = (device as Device & { condition?: string }).condition;
  const owner = typeof device.owner === 'object' ? device.owner : null;

  return (
    <View style={styles.root}>
      <StatusBar barStyle="dark-content" backgroundColor={colors.light.background} />

      {/* Top Header with Back button */}
      <View style={[styles.header, { paddingTop: topInset + 8 }]}>
        <TouchableOpacity style={styles.headerBtn} onPress={onBack} activeOpacity={0.7}>
          <Ionicons name="chevron-back" size={22} color={colors.light.textPrimary} />
        </TouchableOpacity>
        <Text style={styles.headerTitle} numberOfLines={1}>
          {device.title}
        </Text>
        <TouchableOpacity style={styles.headerBtn} onPress={handleToggleFavorite} activeOpacity={0.7}>
          <Ionicons
            name={isFavorite ? 'heart' : 'heart-outline'}
            size={22}
            color={isFavorite ? '#EF4444' : colors.light.textPrimary}
          />
        </TouchableOpacity>
      </View>

      <ScrollView
        contentContainerStyle={[
          styles.scrollContent,
          { paddingBottom: hideBookNow ? 24 : 120 + insets.bottom },
        ]}
      >
        {/* Device Image */}
        <View style={styles.imageContainer}>
          {imageUrls.length > 0 ? (
            <ScrollView
              horizontal
              pagingEnabled
              bounces={false}
              showsHorizontalScrollIndicator={false}
              onMomentumScrollEnd={(event: { nativeEvent: { contentOffset: { x: number } } }) => {
                const nextIndex = Math.round(event.nativeEvent.contentOffset.x / screenWidth);
                setActiveImageIndex(Math.min(nextIndex, imageUrls.length - 1));
              }}
            >
              {imageUrls.map((uri: string, index: number) => (
                <View key={`${uri}-${index}`} style={[styles.imagePage, { width: screenWidth }]}>
                  {!failedImages[index] && loadingImages[index] !== false && (
                    <ActivityIndicator
                      style={styles.imageLoading}
                      size="small"
                      color={colors.light.primary}
                    />
                  )}
                  {failedImages[index] ? (
                    <View style={styles.imageFallback}>
                      <Ionicons name="image-outline" size={42} color={colors.light.textSecondary} />
                      <Text style={styles.imageFallbackText}>Image unavailable</Text>
                    </View>
                  ) : (
                    <Image
                      source={{ uri }}
                      style={styles.mainImage}
                      resizeMode="cover"
                      onLoadEnd={() =>
                        setLoadingImages((current: Record<number, boolean>) => ({
                          ...current,
                          [index]: false,
                        }))
                      }
                      onError={() =>
                        setFailedImages((current: Record<number, boolean>) => ({
                          ...current,
                          [index]: true,
                        }))
                      }
                    />
                  )}
                </View>
              ))}
            </ScrollView>
          ) : (
            <View style={styles.imageFallback}>
              <Ionicons name="image-outline" size={42} color={colors.light.textSecondary} />
              <Text style={styles.imageFallbackText}>No image available</Text>
            </View>
          )}
          {imageUrls.length > 1 && (
            <View style={styles.paginationDots}>
              {imageUrls.map((_: string, index: number) => (
                <View
                  key={index}
                  style={[styles.paginationDot, index === activeImageIndex && styles.paginationDotActive]}
                />
              ))}
            </View>
          )}
          <View style={styles.categoryBadge}>
            <Text style={styles.categoryBadgeText}>
              {device.category.toUpperCase()}
            </Text>
          </View>
        </View>

        <View style={styles.infoCard}>
          {/* Brand & Status */}
          <View style={styles.brandRow}>
            <Text style={styles.brandText}>{device.brand}</Text>
            <View
              style={[
                styles.statusBadge,
                isAvailable ? styles.statusAvailable : styles.statusRented,
              ]}
            >
              <Text
                style={[
                  styles.statusText,
                  isAvailable ? styles.statusTextAvailable : styles.statusTextRented,
                ]}
              >
                {STATUS_LABELS[device.status] ?? device.status}
              </Text>
            </View>
          </View>

          {/* Title */}
          <Text style={styles.title} numberOfLines={2}>{device.title}</Text>

          {/* Rating & Address */}
          <View style={styles.metaRow}>
            <View style={styles.ratingBox}>
              <Ionicons name="star" size={14} color={colors.light.ratingStar} />
              <Text style={styles.ratingText}>
                {device.rating ? device.rating.toFixed(1) : '5.0'}
              </Text>
              <Text style={styles.reviewCount}>
                ({device.reviewCount || 0} reviews)
              </Text>
            </View>

            {(device.addressText || device.location?.address) && (
              <View style={styles.addressBox}>
                <Ionicons name="location-sharp" size={14} color={colors.light.primary} />
                <Text style={styles.addressText} numberOfLines={1}>
                  {device.addressText || device.location?.address}
                </Text>
              </View>
            )}
          </View>

          {/* Price & Deposit Card */}
          <View style={styles.priceCard}>
            <View style={styles.priceColumn}>
              <Text style={styles.priceSub}>Daily rental price</Text>
              <Text style={styles.priceMain}>{formatPrice(device.dailyRate)}/day</Text>
            </View>
            <View style={styles.depositDivider} />
            <View style={styles.priceColumn}>
              <Text style={styles.priceSub}>Security deposit</Text>
              <Text style={styles.depositMain}>{formatPrice(device.depositValue)}</Text>
            </View>
          </View>

          <Text style={styles.sectionHeading}>Device Information</Text>
          <View style={styles.specRow}>
            <Text style={styles.specKey}>Brand</Text>
            <Text style={styles.specValue}>{device.brand}</Text>
          </View>
          <View style={styles.specRow}>
            <Text style={styles.specKey}>Condition</Text>
            <Text style={styles.specValue}>{getConditionLabel(condition)}</Text>
          </View>
          {owner?.name && (
            <View style={styles.specRow}>
              <Text style={styles.specKey}>Owner</Text>
              <Text style={styles.specValue}>{owner.name}</Text>
            </View>
          )}

          {/* Description */}
          <Text style={styles.sectionHeading}>Description</Text>
          <Text style={styles.descriptionText}>{device.description}</Text>

          {/* Specs */}
          {device.specs && Object.keys(device.specs).length > 0 && (
            <View style={styles.specsContainer}>
              <Text style={styles.sectionHeading}>Specifications</Text>
              {Object.entries(device.specs).map(([key, val]) => (
                <View key={key} style={styles.specRow}>
                  <Text style={styles.specKey}>{getSpecLabel(key)}</Text>
                  <Text style={styles.specValue}>{val}</Text>
                </View>
              ))}
            </View>
          )}

          <TouchableOpacity
            style={[styles.aiReviewButton, aiLoading && styles.aiReviewButtonDisabled]}
            onPress={handleAIReview}
            disabled={aiLoading}
            activeOpacity={0.8}
          >
            {aiLoading ? (
              <ActivityIndicator size="small" color="#FFFFFF" />
            ) : (
              <Ionicons name="sparkles-outline" size={18} color="#FFFFFF" />
            )}
            <Text style={styles.aiReviewButtonText}>
              {aiLoading ? 'Analyzing...' : 'AI Review'}
            </Text>
          </TouchableOpacity>
        </View>

        {/* Review List Section */}
        <ReviewListSection
          deviceId={deviceId}
          ratingAvg={device.ratingAvg ?? (device as any).ratingAverage}
          ratingCount={(device as any).reviewCount ?? (device as any).ratingCount}
        />
      </ScrollView>

      {/* Bottom Sticky Action Bar (CTA bo góc 12px theo theme-skill.md) */}
      {!hideBookNow && (
        <View
          style={[
            styles.bottomBar,
            { paddingBottom: Math.max(insets.bottom, 12) },
          ]}
        >
          <View>
            <Text style={styles.bottomPriceSub}>Total rental fee</Text>
            <Text style={styles.bottomPriceMain}>
              {formatPrice(device.dailyRate)}
              <Text style={styles.dayUnit}>/day</Text>
            </Text>
          </View>

          <TouchableOpacity
            style={styles.bookBtn}
            onPress={() => {
              if (onBookNow) {
                onBookNow(deviceId);
              } else {
                alert(`Book device: ${device.title}`);
              }
            }}
            activeOpacity={0.85}
          >
            <Ionicons name="calendar-outline" size={18} color="#FFFFFF" />
            <Text style={styles.bookBtnText}>Book Now</Text>
          </TouchableOpacity>
        </View>
      )}

      <AiReviewModal
        visible={showAiModal}
        review={aiReview}
        onClose={() => setShowAiModal(false)}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: colors.light.background,
  },
  centerContainer: {
    flex: 1,
    backgroundColor: colors.light.background,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  loadingText: {
    color: colors.light.textSecondary,
    marginTop: 12,
    fontSize: 14,
  },
  errorTitle: {
    color: colors.light.error,
    fontSize: 16,
    fontWeight: '700',
    marginTop: 12,
    marginBottom: 16,
    textAlign: 'center',
  },
  errorActions: {
    flexDirection: 'row',
    gap: 10,
  },
  retryBtn: {
    backgroundColor: colors.light.primary,
    paddingHorizontal: 18,
    paddingVertical: 10,
    borderRadius: 12,
  },
  retryBtnText: {
    color: '#FFFFFF',
    fontWeight: '600',
  },
  backBtn: {
    backgroundColor: colors.light.surface,
    paddingHorizontal: 18,
    paddingVertical: 10,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.light.border,
  },
  backBtnText: {
    color: colors.light.textPrimary,
    fontWeight: '600',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 10,
    backgroundColor: colors.light.background,
    borderBottomWidth: 1,
    borderBottomColor: colors.light.border,
  },
  headerBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: colors.light.surface,
    borderWidth: 1,
    borderColor: colors.light.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    flex: 1,
    fontSize: 15,
    fontWeight: '700',
    color: colors.light.textPrimary,
    textAlign: 'center',
    marginHorizontal: 10,
  },
  scrollContent: {
    paddingBottom: 120,
  },
  imageContainer: {
    width: '100%',
    height: 240,
    position: 'relative',
    backgroundColor: '#F1F5F9',
    overflow: 'hidden',
  },
  imagePage: {
    height: 240,
    position: 'relative',
  },
  mainImage: {
    width: '100%',
    height: '100%',
  },
  imageLoading: {
    ...StyleSheet.absoluteFillObject,
  },
  imageFallback: {
    width: '100%',
    height: '100%',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  imageFallbackText: {
    color: colors.light.textSecondary,
    fontSize: 13,
    fontWeight: '600',
  },
  paginationDots: {
    position: 'absolute',
    bottom: 12,
    alignSelf: 'center',
    flexDirection: 'row',
    gap: 6,
    backgroundColor: 'rgba(15, 23, 42, 0.35)',
    borderRadius: 10,
    paddingHorizontal: 8,
    paddingVertical: 5,
  },
  paginationDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: 'rgba(255, 255, 255, 0.55)',
  },
  paginationDotActive: {
    width: 14,
    backgroundColor: '#FFFFFF',
  },
  categoryBadge: {
    position: 'absolute',
    bottom: 12,
    left: 16,
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.light.border,
  },
  categoryBadgeText: {
    color: colors.light.primary,
    fontSize: 11,
    fontWeight: '800',
  },
  infoCard: {
    padding: 16,
  },
  brandRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  brandText: {
    flex: 1,
    color: colors.light.primary,
    fontSize: 12,
    fontWeight: '800',
    textTransform: 'uppercase',
    marginRight: 8,
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    borderWidth: 1,
  },
  statusAvailable: {
    backgroundColor: colors.light.primaryLight,
    borderColor: colors.light.primary,
  },
  statusRented: {
    backgroundColor: '#FEF3C7',
    borderColor: colors.light.warning,
  },
  statusText: {
    fontSize: 11,
    fontWeight: '700',
  },
  statusTextAvailable: {
    color: colors.light.primaryDark,
  },
  statusTextRented: {
    color: colors.light.warning,
  },
  title: {
    fontSize: 20,
    fontWeight: '800',
    color: colors.light.textPrimary,
    lineHeight: 26,
    marginBottom: 10,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
    marginBottom: 16,
  },
  ratingBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  ratingText: {
    color: colors.light.ratingStar,
    fontWeight: '700',
    fontSize: 13,
  },
  reviewCount: {
    color: colors.light.textSecondary,
    fontSize: 12,
  },
  addressBox: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
  },
  addressText: {
    color: colors.light.textSecondary,
    fontSize: 12,
  },
  priceCard: {
    flexDirection: 'row',
    backgroundColor: colors.light.surface,
    borderRadius: 14,
    padding: 14,
    borderWidth: 1,
    borderColor: colors.light.border,
    marginBottom: 20,
  },
  priceColumn: {
    flex: 1,
  },
  depositDivider: {
    width: 1,
    backgroundColor: colors.light.border,
    marginHorizontal: 12,
  },
  priceSub: {
    fontSize: 11,
    color: colors.light.textSecondary,
    marginBottom: 4,
  },
  priceMain: {
    fontSize: 16,
    fontWeight: '800',
    color: colors.light.primary,
  },
  depositMain: {
    fontSize: 15,
    fontWeight: '700',
    color: colors.light.textPrimary,
  },
  sectionHeading: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.light.textPrimary,
    marginTop: 10,
    marginBottom: 8,
  },
  descriptionText: {
    color: colors.light.textSecondary,
    fontSize: 13,
    lineHeight: 20,
    marginBottom: 18,
  },
  specsContainer: {
    marginBottom: 20,
  },
  aiReviewButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: colors.light.primary,
    borderRadius: 12,
    paddingVertical: 13,
    marginBottom: 20,
  },
  aiReviewButtonDisabled: {
    opacity: 0.7,
  },
  aiReviewButtonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '700',
  },
  specRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: colors.light.border,
  },
  specKey: {
    color: colors.light.textSecondary,
    fontSize: 13,
    fontWeight: '500',
  },
  specValue: {
    color: colors.light.textPrimary,
    fontSize: 13,
    fontWeight: '600',
    textAlign: 'right',
    maxWidth: '60%',
  },
  bottomBar: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: colors.light.background,
    borderTopWidth: 1,
    borderTopColor: colors.light.border,
    paddingHorizontal: 16,
    paddingVertical: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 6,
  },
  bottomPriceSub: {
    fontSize: 10,
    color: colors.light.textSecondary,
  },
  bottomPriceMain: {
    fontSize: 18,
    fontWeight: '800',
    color: colors.light.primary,
  },
  dayUnit: {
    fontSize: 12,
    color: colors.light.textSecondary,
    fontWeight: '500',
  },
  bookBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: colors.light.primary,
    paddingVertical: 12,
    paddingHorizontal: 22,
    borderRadius: 12,
    shadowColor: colors.light.primary,
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.3,
    shadowRadius: 5,
    elevation: 3,
  },
  bookBtnText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '700',
  },
});
