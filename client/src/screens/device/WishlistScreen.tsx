import React, { useState, useCallback } from 'react';
import {
  StyleSheet,
  View,
  Text,
  TouchableOpacity,
  FlatList,
  RefreshControl,
  Image,
  ActivityIndicator,
  StatusBar,
  Platform,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { wishlistService } from '../../services/wishlistService';
import { Device } from '../../types';
import { colors } from '../../theme/colors';

interface WishlistScreenProps {
  onBack: () => void;
  onNavigateToDeviceDetail: (deviceId: string) => void;
  onNavigateToHome?: () => void;
}

const formatPrice = (price: number): string => {
  return price.toLocaleString('vi-VN') + ' đ';
};

export function WishlistScreen({
  onBack,
  onNavigateToDeviceDetail,
  onNavigateToHome,
}: WishlistScreenProps) {
  const insets = useSafeAreaInsets();
  const topInset = Math.max(
    insets.top,
    Platform.OS === 'android' ? StatusBar.currentHeight || 24 : 20
  );

  const [wishlist, setWishlist] = useState([] as Device[]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchWishlist = useCallback(async () => {
    try {
      const data = await wishlistService.getWishlist();
      setWishlist(data || []);
    } catch (error) {
      console.warn('Lỗi tải danh sách yêu thích:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      fetchWishlist();
    }, [fetchWishlist])
  );

  const onRefresh = async () => {
    setRefreshing(true);
    await fetchWishlist();
    setRefreshing(false);
  };

  const handleRemoveItem = async (device: Device) => {
    const res = await wishlistService.toggleWishlist(device);
    setWishlist(res.wishlist);
  };

  const renderItem = ({ item }: { item: Device }) => {
    const rawImages: any = item.images || (item as any).image;
    const imageUrl =
      Array.isArray(rawImages) && rawImages.length > 0
        ? rawImages[0]
        : typeof rawImages === 'string' && rawImages.trim()
        ? rawImages
        : 'https://images.unsplash.com/photo-1517336714731-489689fd1ca8?w=500';

    const isAvailable = item.status === 'available';

    return (
      <TouchableOpacity
        style={styles.card}
        onPress={() => onNavigateToDeviceDetail(item._id)}
        activeOpacity={0.88}
      >
        {/* Left: Device Image */}
        <View style={styles.imageContainer}>
          <Image source={{ uri: imageUrl }} style={styles.image} resizeMode="cover" />

          {/* Badge trạng thái */}
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
              {isAvailable ? 'Sẵn sàng' : 'Đang thuê'}
            </Text>
          </View>
        </View>

        {/* Right: Info */}
        <View style={styles.cardInfo}>
          {/* Header Row: Brand & Heart Remove button */}
          <View style={styles.cardHeaderRow}>
            <View style={styles.brandBadge}>
              <Text style={styles.brandText}>{item.brand}</Text>
            </View>

            <TouchableOpacity
              style={styles.heartButton}
              onPress={() => handleRemoveItem(item)}
              activeOpacity={0.7}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            >
              <Ionicons name="heart" size={20} color="#EF4444" />
            </TouchableOpacity>
          </View>

          {/* Title */}
          <Text style={styles.cardTitle} numberOfLines={2}>
            {item.title}
          </Text>

          {/* Category & Rating */}
          <View style={styles.metaRow}>
            <Text style={styles.categoryText}>{item.category}</Text>
            <View style={styles.ratingBadge}>
              <Ionicons name="star" size={11} color={colors.light.ratingStar} />
              <Text style={styles.ratingText}>
                {item.rating ? item.rating.toFixed(1) : '5.0'}
              </Text>
            </View>
          </View>

          {/* Bottom Row: Price & Action */}
          <View style={styles.cardFooter}>
            <View>
              <Text style={styles.priceSub}>Giá thuê</Text>
              <Text style={styles.priceValue}>{formatPrice(item.dailyRate)}/ngày</Text>
            </View>

            <View style={styles.viewBtn}>
              <Text style={styles.viewBtnText}>Xem máy</Text>
              <Ionicons name="arrow-forward" size={12} color="#FFFFFF" />
            </View>
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  const renderEmpty = () => {
    if (loading) return null;
    return (
      <View style={styles.emptyContainer}>
        <View style={styles.emptyIconCircle}>
          <Ionicons name="heart-dislike-outline" size={48} color="#94A3B8" />
        </View>
        <Text style={styles.emptyTitle}>Chưa có thiết bị yêu thích</Text>
        <Text style={styles.emptySubtitle}>
          Hãy chạm vào biểu tượng trái tim trên các thiết bị bạn quan tâm để lưu lại và xem nhanh tại đây!
        </Text>
        {onNavigateToHome && (
          <TouchableOpacity
            style={styles.exploreBtn}
            onPress={onNavigateToHome}
            activeOpacity={0.8}
          >
            <Ionicons name="compass-outline" size={18} color="#FFFFFF" />
            <Text style={styles.exploreBtnText}>Khám phá thiết bị ngay</Text>
          </TouchableOpacity>
        )}
      </View>
    );
  };

  return (
    <View style={styles.root}>
      <StatusBar barStyle="dark-content" backgroundColor="#FFFFFF" />

      {/* Header */}
      <View style={[styles.header, { paddingTop: topInset + 8 }]}>
        <TouchableOpacity style={styles.backBtn} onPress={onBack} activeOpacity={0.7}>
          <Ionicons name="chevron-back" size={22} color={colors.light.textPrimary} />
        </TouchableOpacity>

        <View style={styles.headerTitleBox}>
          <Text style={styles.headerTitle}>Danh sách Yêu thích</Text>
          {wishlist.length > 0 && (
            <View style={styles.countBadge}>
              <Text style={styles.countBadgeText}>{wishlist.length}</Text>
            </View>
          )}
        </View>

        <View style={{ width: 40 }} />
      </View>

      {/* Subheader status bar if items exist */}
      {wishlist.length > 0 && (
        <View style={styles.subHeader}>
          <Ionicons name="heart" size={14} color="#EF4444" />
          <Text style={styles.subHeaderText}>
            Đã lưu <Text style={{ fontWeight: '700' }}>{wishlist.length}</Text> thiết bị vào bộ sưu tập
          </Text>
        </View>
      )}

      {loading ? (
        <View style={styles.centerContainer}>
          <ActivityIndicator size="large" color={colors.light.primary} />
          <Text style={styles.loadingText}>Đang tải danh sách yêu thích...</Text>
        </View>
      ) : (
        <FlatList
          data={wishlist}
          keyExtractor={(item: Device) => item._id}
          renderItem={renderItem}
          ListEmptyComponent={renderEmpty}
          contentContainerStyle={[
            styles.listContent,
            wishlist.length === 0 && { flex: 1, justifyContent: 'center' },
          ]}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              colors={[colors.light.primary]}
              tintColor={colors.light.primary}
            />
          }
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },
  header: {
    backgroundColor: '#FFFFFF',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  backBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#F1F5F9',
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitleBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.light.textPrimary,
  },
  countBadge: {
    backgroundColor: '#FEE2E2',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 12,
  },
  countBadgeText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#EF4444',
  },
  subHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 16,
    paddingVertical: 10,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
  },
  subHeaderText: {
    fontSize: 13,
    color: '#64748B',
  },
  listContent: {
    padding: 16,
    paddingBottom: 36,
  },
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    overflow: 'hidden',
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
    flexDirection: 'row',
  },
  imageContainer: {
    width: 125,
    backgroundColor: '#F1F5F9',
    position: 'relative',
  },
  image: {
    width: '100%',
    height: '100%',
  },
  statusBadge: {
    position: 'absolute',
    bottom: 8,
    left: 8,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 6,
    paddingVertical: 3,
    borderRadius: 8,
    gap: 4,
  },
  statusAvailable: {
    backgroundColor: 'rgba(220, 252, 231, 0.95)',
  },
  statusRented: {
    backgroundColor: 'rgba(254, 226, 226, 0.95)',
  },
  statusDot: {
    width: 5,
    height: 5,
    borderRadius: 2.5,
  },
  statusDotAvailable: {
    backgroundColor: '#16A34A',
  },
  statusDotRented: {
    backgroundColor: '#DC2626',
  },
  statusText: {
    fontSize: 10,
    fontWeight: '700',
  },
  statusTextAvailable: {
    color: '#15803D',
  },
  statusTextRented: {
    color: '#B91C1C',
  },
  cardInfo: {
    flex: 1,
    padding: 12,
    justifyContent: 'space-between',
  },
  cardHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  brandBadge: {
    backgroundColor: '#F1F5F9',
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 6,
  },
  brandText: {
    fontSize: 11,
    fontWeight: '700',
    color: colors.light.primary,
    textTransform: 'uppercase',
  },
  heartButton: {
    padding: 2,
  },
  cardTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.light.textPrimary,
    lineHeight: 19,
    marginBottom: 6,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 10,
  },
  categoryText: {
    fontSize: 12,
    color: '#64748B',
  },
  ratingBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    backgroundColor: '#FEF9C3',
    paddingHorizontal: 5,
    paddingVertical: 1,
    borderRadius: 4,
  },
  ratingText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#A16207',
  },
  cardFooter: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
    borderTopWidth: 1,
    borderTopColor: '#F8FAFC',
    paddingTop: 8,
  },
  priceSub: {
    fontSize: 10,
    color: '#94A3B8',
  },
  priceValue: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.light.primary,
  },
  viewBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: colors.light.primary,
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: 8,
  },
  viewBtnText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  centerContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
  },
  loadingText: {
    color: colors.light.textSecondary,
    fontSize: 14,
  },
  emptyContainer: {
    alignItems: 'center',
    paddingHorizontal: 32,
  },
  emptyIconCircle: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#F1F5F9',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.light.textPrimary,
    marginBottom: 8,
    textAlign: 'center',
  },
  emptySubtitle: {
    fontSize: 14,
    color: '#64748B',
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 24,
  },
  exploreBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: colors.light.primary,
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 12,
  },
  exploreBtnText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
  },
});
