import React, { useEffect, useState } from 'react';
import {
  StyleSheet,
  View,
  Text,
  ScrollView,
  Image,
  TouchableOpacity,
  ActivityIndicator,
  StatusBar,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { deviceService } from '../../services/deviceService';
import { Device } from '../../types';
import { colors } from '../../theme/colors';

interface DeviceDetailScreenProps {
  deviceId: string;
  onBack: () => void;
  onBookNow?: (deviceId: string) => void;
}

const formatPrice = (price: number): string => {
  return price.toLocaleString('vi-VN') + ' đ';
};

export function DeviceDetailScreen({ deviceId, onBack, onBookNow }: DeviceDetailScreenProps) {
  const [device, setDevice] = useState(null as Device | null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let isMounted = true;
    (async () => {
      setLoading(true);
      const data = await deviceService.getDeviceById(deviceId);
      if (isMounted) {
        setDevice(data);
        setLoading(false);
      }
    })();
    return () => {
      isMounted = false;
    };
  }, [deviceId]);

  if (loading) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color={colors.light.primary} />
        <Text style={styles.loadingText}>Đang tải chi tiết thiết bị...</Text>
      </View>
    );
  }

  if (!device) {
    return (
      <View style={styles.centerContainer}>
        <Ionicons name="alert-circle-outline" size={48} color={colors.light.error} />
        <Text style={styles.errorTitle}>Không tìm thấy thiết bị</Text>
        <TouchableOpacity style={styles.backBtn} onPress={onBack}>
          <Text style={styles.backBtnText}>Quay lại trang chủ</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const imageUrl =
    device.images && device.images.length > 0
      ? device.images[0]
      : 'https://images.unsplash.com/photo-1519389950473-47ba0277781c?w=800';

  const isAvailable = device.status === 'available';

  return (
    <View style={styles.root}>
      <StatusBar barStyle="dark-content" backgroundColor={colors.light.background} />

      {/* Top Header with Back button */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.headerBtn} onPress={onBack} activeOpacity={0.7}>
          <Ionicons name="chevron-back" size={22} color={colors.light.textPrimary} />
        </TouchableOpacity>
        <Text style={styles.headerTitle} numberOfLines={1}>
          {device.title}
        </Text>
        <TouchableOpacity style={styles.headerBtn} activeOpacity={0.7}>
          <Ionicons name="heart-outline" size={20} color={colors.light.textPrimary} />
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent}>
        {/* Device Image */}
        <View style={styles.imageContainer}>
          <Image
            source={{ uri: imageUrl }}
            style={styles.mainImage}
            resizeMode="cover"
          />
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
                {isAvailable ? 'Sẵn sàng thuê' : 'Đang thuê'}
              </Text>
            </View>
          </View>

          {/* Title */}
          <Text style={styles.title}>{device.title}</Text>

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

            {device.location?.address && (
              <View style={styles.addressBox}>
                <Ionicons name="location-sharp" size={14} color={colors.light.primary} />
                <Text style={styles.addressText} numberOfLines={1}>
                  {device.location.address}
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
              <Text style={styles.priceSub}>Tiền cọc đảm bảo (Ký quỹ)</Text>
              <Text style={styles.depositMain}>{formatPrice(device.depositValue)}</Text>
            </View>
          </View>

          {/* Description */}
          <Text style={styles.sectionHeading}>Device description</Text>
          <Text style={styles.descriptionText}>{device.description}</Text>

          {/* Specs */}
          {device.specs && Object.keys(device.specs).length > 0 && (
            <View style={styles.specsContainer}>
              <Text style={styles.sectionHeading}>Technical specs</Text>
              {Object.entries(device.specs).map(([key, val]) => (
                <View key={key} style={styles.specRow}>
                  <Text style={styles.specKey}>{key}</Text>
                  <Text style={styles.specValue}>{val}</Text>
                </View>
              ))}
            </View>
          )}
        </View>
      </ScrollView>

      {/* Bottom Sticky Action Bar (CTA bo góc 12px theo theme-skill.md) */}
      <View style={styles.bottomBar}>
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
              alert(`Đặt thuê thiết bị: ${device.title}`);
            }
          }}
          activeOpacity={0.85}
        >
          <Ionicons name="calendar-outline" size={18} color="#FFFFFF" />
          <Text style={styles.bookBtnText}>Book now</Text>
        </TouchableOpacity>
      </View>
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
  },
  backBtn: {
    backgroundColor: colors.light.primary,
    paddingHorizontal: 18,
    paddingVertical: 10,
    borderRadius: 12,
  },
  backBtnText: {
    color: '#FFFFFF',
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
    paddingBottom: 90,
  },
  imageContainer: {
    width: '100%',
    height: 240,
    position: 'relative',
    backgroundColor: '#F1F5F9',
  },
  mainImage: {
    width: '100%',
    height: '100%',
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
    color: colors.light.primary,
    fontSize: 12,
    fontWeight: '800',
    textTransform: 'uppercase',
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
