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
        <ActivityIndicator size="large" color="#38BDF8" />
        <Text style={styles.loadingText}>Loading device details...</Text>
      </View>
    );
  }

  if (!device) {
    return (
      <View style={styles.centerContainer}>
        <Ionicons name="alert-circle-outline" size={48} color="#EF4444" />
        <Text style={styles.errorTitle}>Device not found</Text>
        <TouchableOpacity style={styles.backBtn} onPress={onBack}>
          <Text style={styles.backBtnText}>Back to Home</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const imageUrl =
    device.images && device.images.length > 0
      ? device.images[0]
      : 'https://images.unsplash.com/photo-1519389950473-47ba0277781c?w=800';

  return (
    <View style={styles.root}>
      <StatusBar barStyle="light-content" backgroundColor="#070B13" />

      {/* Top Header with Back button */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.headerBtn} onPress={onBack}>
          <Ionicons name="chevron-back" size={22} color="#FFFFFF" />
        </TouchableOpacity>
        <Text style={styles.headerTitle} numberOfLines={1}>
          {device.title}
        </Text>
        <TouchableOpacity style={styles.headerBtn}>
          <Ionicons name="heart-outline" size={20} color="#FFFFFF" />
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
            <View style={styles.statusBadge}>
              <Text style={styles.statusText}>
                {device.status === 'available' ? 'Ready to rent' : 'Currently rented'}
              </Text>
            </View>
          </View>

          {/* Title */}
          <Text style={styles.title}>{device.title}</Text>

          {/* Rating & Address */}
          <View style={styles.metaRow}>
            <View style={styles.ratingBox}>
              <Ionicons name="star" size={14} color="#FBBF24" />
              <Text style={styles.ratingText}>
                {device.rating ? device.rating.toFixed(1) : '5.0'}
              </Text>
              <Text style={styles.reviewCount}>
                ({device.reviewCount || 0} reviews)
              </Text>
            </View>

            {device.location?.address && (
              <View style={styles.addressBox}>
                <Ionicons name="location-sharp" size={14} color="#38BDF8" />
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
              <Text style={styles.priceSub}>Security deposit</Text>
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

      {/* Bottom Sticky Action Bar */}
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
            if (onBookNow) onBookNow(deviceId);
          }}
          activeOpacity={0.8}
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
    backgroundColor: '#070B13',
  },
  centerContainer: {
    flex: 1,
    backgroundColor: '#070B13',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  loadingText: {
    color: '#94A3B8',
    marginTop: 12,
    fontSize: 14,
  },
  errorTitle: {
    color: '#EF4444',
    fontSize: 16,
    fontWeight: '700',
    marginTop: 12,
    marginBottom: 16,
  },
  backBtn: {
    backgroundColor: '#2563EB',
    paddingHorizontal: 18,
    paddingVertical: 10,
    borderRadius: 10,
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
    backgroundColor: '#0F172A',
    borderBottomWidth: 1,
    borderBottomColor: '#1E293B',
  },
  headerBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#1E293B',
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    flex: 1,
    fontSize: 15,
    fontWeight: '700',
    color: '#FFFFFF',
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
    backgroundColor: '#0F172A',
  },
  mainImage: {
    width: '100%',
    height: '100%',
  },
  categoryBadge: {
    position: 'absolute',
    bottom: 12,
    left: 16,
    backgroundColor: 'rgba(15, 23, 42, 0.85)',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#38BDF8',
  },
  categoryBadgeText: {
    color: '#38BDF8',
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
    color: '#38BDF8',
    fontSize: 12,
    fontWeight: '800',
    textTransform: 'uppercase',
  },
  statusBadge: {
    backgroundColor: 'rgba(16, 185, 129, 0.2)',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#10B981',
  },
  statusText: {
    color: '#10B981',
    fontSize: 11,
    fontWeight: '700',
  },
  title: {
    fontSize: 20,
    fontWeight: '800',
    color: '#FFFFFF',
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
    color: '#FBBF24',
    fontWeight: '700',
    fontSize: 13,
  },
  reviewCount: {
    color: '#64748B',
    fontSize: 12,
  },
  addressBox: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
  },
  addressText: {
    color: '#94A3B8',
    fontSize: 12,
  },
  priceCard: {
    flexDirection: 'row',
    backgroundColor: '#1E293B',
    borderRadius: 14,
    padding: 14,
    borderWidth: 1,
    borderColor: '#334155',
    marginBottom: 20,
  },
  priceColumn: {
    flex: 1,
  },
  depositDivider: {
    width: 1,
    backgroundColor: '#334155',
    marginHorizontal: 12,
  },
  priceSub: {
    fontSize: 11,
    color: '#94A3B8',
    marginBottom: 4,
  },
  priceMain: {
    fontSize: 16,
    fontWeight: '800',
    color: '#38BDF8',
  },
  depositMain: {
    fontSize: 15,
    fontWeight: '700',
    color: '#CBD5E1',
  },
  sectionHeading: {
    fontSize: 16,
    fontWeight: '700',
    color: '#FFFFFF',
    marginTop: 10,
    marginBottom: 8,
  },
  descriptionText: {
    color: '#CBD5E1',
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
    borderBottomColor: '#1E293B',
  },
  specKey: {
    color: '#94A3B8',
    fontSize: 13,
    fontWeight: '500',
  },
  specValue: {
    color: '#FFFFFF',
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
    backgroundColor: '#0F172A',
    borderTopWidth: 1,
    borderTopColor: '#1E293B',
    paddingHorizontal: 16,
    paddingVertical: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  bottomPriceSub: {
    fontSize: 10,
    color: '#94A3B8',
  },
  bottomPriceMain: {
    fontSize: 18,
    fontWeight: '800',
    color: '#38BDF8',
  },
  dayUnit: {
    fontSize: 12,
    color: '#94A3B8',
    fontWeight: '500',
  },
  bookBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#2563EB',
    paddingVertical: 12,
    paddingHorizontal: 22,
    borderRadius: 12,
    shadowColor: '#2563EB',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 6,
    elevation: 4,
  },
  bookBtnText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '700',
  },
});
