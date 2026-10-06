import React, { useEffect, useRef, useState } from 'react';
import { Animated, Image, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { API_BASE_URL } from '../../config/api';
import { colors } from '../../theme/colors';
import { Device } from '../../types';

interface DevicePreviewCardProps {
  device: Device;
  distanceMeters: number;
  onOpenDetails: (deviceId: string) => void;
  onClose?: () => void;
}

function resolveImageUri(url?: string): string | null {
  if (!url || typeof url !== 'string' || !url.trim()) return null;
  if (/^https?:\/\//i.test(url)) return url;
  if (url.startsWith('/')) {
    const origin = API_BASE_URL.replace(/\/api\/?$/, '');
    return `${origin}${url}`;
  }
  return url;
}

function formatDistance(distanceMeters: number): string {
  if (distanceMeters < 1000) return `${Math.round(distanceMeters)} m away`;
  return `${(distanceMeters / 1000).toFixed(1)} km away`;
}

export function DevicePreviewCard({
  device,
  distanceMeters,
  onOpenDetails,
  onClose,
}: DevicePreviewCardProps) {
  const [imageFailed, setImageFailed] = useState(false);
  const translateY = useRef(new Animated.Value(18)).current;
  const opacity = useRef(new Animated.Value(0)).current;

  const title = device.title || (device as any).name || 'Device';
  const dailyRate = device.dailyRate ?? (device as any).pricePerDay ?? 0;
  const rating = device.rating ?? (device as any).ratingAvg ?? 5;
  const brand = (device.brand || '').trim().toUpperCase();
  const rawImages: unknown = device.images || (device as any).image || (device as any).imageUrl;
  const rawUrl =
    Array.isArray(rawImages) && rawImages.length > 0
      ? rawImages[0]
      : typeof rawImages === 'string' && rawImages.trim()
        ? rawImages
        : undefined;
  const imageUri = resolveImageUri(rawUrl);

  useEffect(() => {
    setImageFailed(false);
    translateY.setValue(18);
    opacity.setValue(0);
    Animated.parallel([
      Animated.timing(translateY, {
        toValue: 0,
        duration: 180,
        useNativeDriver: true,
      }),
      Animated.timing(opacity, {
        toValue: 1,
        duration: 180,
        useNativeDriver: true,
      }),
    ]).start();
  }, [device._id]);

  return (
    <Animated.View
      style={[
        styles.card,
        {
          transform: [{ translateY }],
          opacity,
        },
      ]}
      accessibilityRole="summary"
    >
      <TouchableOpacity
        style={styles.cardInner}
        activeOpacity={0.92}
        onPress={() => onOpenDetails(device._id)}
      >
        {/* Left: Device Image */}
        <View style={styles.imageContainer}>
          {imageUri && !imageFailed ? (
            <Image
              source={{ uri: imageUri }}
              style={styles.image}
              resizeMode="cover"
              onError={() => setImageFailed(true)}
            />
          ) : (
            <View style={styles.imagePlaceholder}>
              <Ionicons name="image-outline" size={24} color={colors.light.textSecondary} />
            </View>
          )}
        </View>

        {/* Right: Content details */}
        <View style={styles.content}>
          {/* Row 1: Device Name + Close */}
          <View style={styles.titleRow}>
            <Text style={styles.name} numberOfLines={1}>
              {title}
            </Text>
            {onClose && (
              <TouchableOpacity
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                onPress={onClose}
                accessibilityRole="button"
                accessibilityLabel="Close"
                style={styles.closeBtn}
              >
                <Ionicons name="close" size={16} color={colors.light.textSecondary} />
              </TouchableOpacity>
            )}
          </View>

          {/* Row 2: Brand · ★ Rating */}
          <View style={styles.metaRow}>
            {brand ? (
              <>
                <Text style={styles.brand} numberOfLines={1}>
                  {brand}
                </Text>
                <Text style={styles.metaDot}>·</Text>
              </>
            ) : null}
            <Ionicons name="star" size={11} color={colors.light.ratingStar} />
            <Text style={styles.rating}>{Number(rating).toFixed(1)}</Text>
          </View>

          {/* Row 3: Price */}
          <Text style={styles.price}>{dailyRate.toLocaleString('en-US')} ₫/day</Text>

          {/* Row 4: Distance & CTA */}
          <View style={styles.bottomRow}>
            <View style={styles.distanceRow}>
              <Ionicons name="navigate-outline" size={11} color={colors.light.textSecondary} />
              <Text style={styles.distance}>{formatDistance(distanceMeters)}</Text>
            </View>

            <View style={styles.ctaRow}>
              <Text style={styles.ctaText}>View Details</Text>
              <Ionicons name="arrow-forward" size={12} color={colors.light.primary} />
            </View>
          </View>
        </View>
      </TouchableOpacity>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  card: {
    position: 'absolute',
    left: 16,
    right: 16,
    bottom: 16,
    maxWidth: 500,
    alignSelf: 'center',
    minHeight: 108,
    borderRadius: 16,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: colors.light.border,
    elevation: 8,
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.12,
    shadowRadius: 8,
    zIndex: 40,
  },
  cardInner: {
    flex: 1,
    flexDirection: 'row',
    padding: 10,
    gap: 10,
    alignItems: 'center',
  },
  imageContainer: {
    width: 68,
    height: 68,
    borderRadius: 12,
    overflow: 'hidden',
    backgroundColor: '#F1F5F9',
  },
  image: {
    width: '100%',
    height: '100%',
  },
  imagePlaceholder: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#F1F5F9',
  },
  content: {
    flex: 1,
    minWidth: 0,
    justifyContent: 'space-between',
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 4,
  },
  name: {
    flex: 1,
    color: colors.light.textPrimary,
    fontSize: 14,
    fontWeight: '700',
    lineHeight: 18,
  },
  closeBtn: {
    padding: 2,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    marginTop: 2,
  },
  brand: {
    color: colors.light.textSecondary,
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.2,
  },
  metaDot: {
    color: colors.light.textSecondary,
    fontSize: 11,
    marginHorizontal: 1,
  },
  rating: {
    color: colors.light.textSecondary,
    fontSize: 11,
    fontWeight: '600',
  },
  price: {
    color: colors.light.primary,
    fontSize: 13,
    fontWeight: '800',
    marginTop: 3,
  },
  bottomRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 3,
  },
  distanceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
  },
  distance: {
    color: colors.light.textSecondary,
    fontSize: 11,
  },
  ctaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
    paddingVertical: 2,
    paddingHorizontal: 4,
  },
  ctaText: {
    color: colors.light.primary,
    fontSize: 12,
    fontWeight: '700',
  },
});

