import React from 'react';
import {
  StyleSheet,
  View,
  Text,
  Image,
  TouchableOpacity,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Device } from '../../types';
import { colors } from '../../theme/colors';

interface DeviceCardProps {
  device: Device;
  onPress: (deviceId: string) => void;
  width?: number;
}

const formatPrice = (price: number): string => {
  return price.toLocaleString('vi-VN') + ' đ/day';
};

export function DeviceCard({ device, onPress, width }: DeviceCardProps) {
  const imageUrl =
    device.images && device.images.length > 0
      ? device.images[0]
      : 'https://images.unsplash.com/photo-1519389950473-47ba0277781c?w=600';

  const isAvailable = device.status === 'available';

  return (
    <TouchableOpacity
      style={[styles.card, width ? { width } : styles.defaultWidth]}
      onPress={() => onPress(device._id)}
      activeOpacity={0.85}
    >
      {/* Device image & status badge */}
      <View style={styles.imageContainer}>
        <Image
          source={{ uri: `imageUrl` }}
          style={styles.image}
          resizeMode="cover"
        />

        {/* Brand badge */}
        <View style={styles.brandBadge}>
          <Text style={styles.brandText}>{device.brand}</Text>
        </View>

        {/* Badge trạng thái (Tuân thủ theme-skill.md) */}
        <View
          style={[
            styles.statusBadge,
            isAvailable ? styles.statusAvailable : styles.statusRented,
          ]}
        >
          <View
            style={[
              styles.statusDot,
              isAvailable ? styles.statusDotAvailable : styles.statusDotRented,
            ]}
          />
          <Text
            style={[
              styles.statusText,
              isAvailable ? styles.statusTextAvailable : styles.statusTextRented,
            ]}
          >
            {isAvailable ? 'Có sẵn' : 'Đang thuê'}
          </Text>
        </View>
      </View>

      {/* Device info content */}
      <View style={styles.content}>
        <Text style={styles.title} numberOfLines={2}>
          {device.title}
        </Text>

        {/* Rating & Lượt đánh giá */}
        <View style={styles.metaRow}>
          <View style={styles.ratingBox}>
            <Ionicons name="star" size={13} color={colors.light.ratingStar} />
            <Text style={styles.ratingText}>
              {device.rating ? device.rating.toFixed(1) : '5.0'}
            </Text>
            <Text style={styles.reviewCount}>({device.reviewCount || 0})</Text>
          </View>

          {/* Địa điểm */}
          {device.location?.address ? (
            <View style={styles.locationBox}>
              <Ionicons name="location-outline" size={12} color={colors.light.textSecondary} />
              <Text style={styles.locationText} numberOfLines={1}>
                {device.location.address.split(',').slice(-2).join(',').trim()}
              </Text>
            </View>
          ) : null}
        </View>

        {/* Giá thuê & Nút xem */}
        <View style={styles.bottomRow}>
          <View>
            <Text style={styles.priceLabel}>Giá thuê</Text>
            <Text style={styles.priceText}>{formatPrice(device.dailyRate)}</Text>
          </View>

          <View style={styles.arrowBtn}>
            <Ionicons name="arrow-forward" size={14} color="#FFFFFF" />
          </View>
        </View>
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.light.surface,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.light.border,
    overflow: 'hidden',
    elevation: 2,
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 6,
    marginBottom: 14,
  },
  defaultWidth: {
    width: '100%',
  },
  imageContainer: {
    width: '100%',
    height: 140,
    backgroundColor: '#F1F5F9',
    position: 'relative',
  },
  image: {
    width: '100%',
    height: '100%',
  },
  brandBadge: {
    position: 'absolute',
    top: 10,
    left: 10,
    backgroundColor: 'rgba(255, 255, 255, 0.92)',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: colors.light.border,
  },
  brandText: {
    color: colors.light.primary,
    fontSize: 10,
    fontWeight: '700',
    textTransform: 'uppercase',
  },
  statusBadge: {
    position: 'absolute',
    top: 10,
    right: 10,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 12,
  },
  statusAvailable: {
    backgroundColor: colors.light.primaryLight,
    borderWidth: 1,
    borderColor: colors.light.primary,
  },
  statusRented: {
    backgroundColor: '#FEF3C7',
    borderWidth: 1,
    borderColor: colors.light.warning,
  },
  statusDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  statusDotAvailable: {
    backgroundColor: colors.light.primary,
  },
  statusDotRented: {
    backgroundColor: colors.light.warning,
  },
  statusText: {
    fontSize: 10,
    fontWeight: '700',
  },
  statusTextAvailable: {
    color: colors.light.primaryDark,
  },
  statusTextRented: {
    color: colors.light.warning,
  },
  content: {
    padding: 12,
  },
  title: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.light.textPrimary,
    lineHeight: 18,
    minHeight: 36,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 8,
    marginBottom: 10,
    gap: 8,
  },
  ratingBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
  },
  ratingText: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.light.textPrimary,
  },
  reviewCount: {
    fontSize: 11,
    color: colors.light.textSecondary,
  },
  locationBox: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
    justifyContent: 'flex-end',
  },
  locationText: {
    fontSize: 11,
    color: colors.light.textSecondary,
  },
  bottomRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: colors.light.border,
  },
  priceLabel: {
    fontSize: 10,
    color: colors.light.textSecondary,
  },
  priceText: {
    fontSize: 14,
    fontWeight: '800',
    color: colors.light.primary,
  },
  arrowBtn: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: colors.light.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
