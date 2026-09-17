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

  return (
    <TouchableOpacity
      style={[styles.card, width ? { width } : styles.defaultWidth]}
      onPress={() => onPress(device._id)}
      activeOpacity={0.8}
    >
      {/* Device image & status badge */}
      <View style={styles.imageContainer}>
        <Image
          source={{ uri: imageUrl }}
          style={styles.image}
          resizeMode="cover"
        />

        {/* Brand badge */}
        <View style={styles.brandBadge}>
          <Text style={styles.brandText}>{device.brand}</Text>
        </View>

        {/* Status badge */}
        <View
          style={[
            styles.statusBadge,
            device.status === 'available'
              ? styles.statusAvailable
              : styles.statusOther,
          ]}
        >
          <View
            style={[
              styles.statusDot,
              device.status === 'available'
                ? styles.statusDotAvailable
                : styles.statusDotOther,
            ]}
          />
          <Text style={styles.statusText}>
            {device.status === 'available' ? 'Available' : 'Rented'}
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
            <Ionicons name="star" size={13} color="#FBBF24" />
            <Text style={styles.ratingText}>
              {device.rating ? device.rating.toFixed(1) : '5.0'}
            </Text>
            <Text style={styles.reviewCount}>({device.reviewCount || 0})</Text>
          </View>

          {/* Địa điểm */}
          {device.location?.address ? (
            <View style={styles.locationBox}>
              <Ionicons name="location-outline" size={12} color="#94A3B8" />
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
    backgroundColor: '#1E293B',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#334155',
    overflow: 'hidden',
    elevation: 3,
    marginBottom: 14,
  },
  defaultWidth: {
    width: '100%',
  },
  imageContainer: {
    width: '100%',
    height: 140,
    backgroundColor: '#0F172A',
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
    backgroundColor: 'rgba(15, 23, 42, 0.85)',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  brandText: {
    color: '#38BDF8',
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
    backgroundColor: 'rgba(16, 185, 129, 0.2)',
    borderWidth: 1,
    borderColor: '#10B981',
  },
  statusOther: {
    backgroundColor: 'rgba(245, 158, 11, 0.2)',
    borderWidth: 1,
    borderColor: '#F59E0B',
  },
  statusDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  statusDotAvailable: {
    backgroundColor: '#10B981',
  },
  statusDotOther: {
    backgroundColor: '#F59E0B',
  },
  statusText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  content: {
    padding: 12,
  },
  title: {
    fontSize: 14,
    fontWeight: '700',
    color: '#FFFFFF',
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
    color: '#FBBF24',
  },
  reviewCount: {
    fontSize: 11,
    color: '#64748B',
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
    color: '#94A3B8',
  },
  bottomRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: '#334155',
  },
  priceLabel: {
    fontSize: 10,
    color: '#64748B',
  },
  priceText: {
    fontSize: 14,
    fontWeight: '800',
    color: '#38BDF8',
  },
  arrowBtn: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#2563EB',
    alignItems: 'center',
    justifyContent: 'center',
  },
});
