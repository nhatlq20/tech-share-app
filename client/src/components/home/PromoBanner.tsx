import React, { useState, useEffect, useRef } from 'react';
import {
  StyleSheet,
  View,
  Text,
  ScrollView,
  Image,
  Dimensions,
  TouchableOpacity,
} from 'react-native';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const BANNER_CARD_WIDTH = SCREEN_WIDTH - 32; // 16px padding on each side

export interface PromoBannerItem {
  id: string;
  badge: string;
  title: string;
  subtitle: string;
  imageUrl: string;
  accentColor: string;
}

export const PROMO_BANNERS: PromoBannerItem[] = [
  {
    id: 'banner_1',
    badge: 'ƯU ĐÃI SPRINT 1',
    title: 'Thuê Thiết Bị Dễ Dàng',
    subtitle: 'Flagship Apple, Sony & DJI sẵn sàng trải nghiệm chỉ từ 100k/ngày',
    imageUrl: 'https://images.unsplash.com/photo-1519389950473-47ba0277781c?w=800&auto=format&fit=crop&q=80',
    accentColor: '#2563EB',
  },
  {
    id: 'banner_2',
    badge: 'ĐỊNH VỊ GPS',
    title: 'Khám Phá Quanh Bạn',
    subtitle: 'Tìm máy ảnh, laptop, gimbal gần bạn nhất nhận máy trong 30 phút',
    imageUrl: 'https://images.unsplash.com/photo-1516035069371-29a1b244cc32?w=800&auto=format&fit=crop&q=80',
    accentColor: '#8B5CF6',
  },
  {
    id: 'banner_3',
    badge: 'AN TÂM 100%',
    title: 'Thiết Bị Chất Lượng Cao',
    subtitle: 'Được kiểm định ngoại hình và thông số trước khi bàn giao',
    imageUrl: 'https://images.unsplash.com/photo-1508614589041-895b88991e3e?w=800&auto=format&fit=crop&q=80',
    accentColor: '#059669',
  },
];

interface PromoBannerProps {
  onPressBanner?: (banner: PromoBannerItem) => void;
}

export function PromoBanner({ onPressBanner }: PromoBannerProps) {
  const [activeIndex, setActiveIndex] = useState(0);
  const scrollRef = useRef(null as any);
  const timerRef = useRef(null as any);

  const startAutoScroll = () => {
    stopAutoScroll();
    timerRef.current = setInterval(() => {
      const nextIndex = (activeIndex + 1) % PROMO_BANNERS.length;
      scrollRef.current?.scrollTo({
        x: nextIndex * (BANNER_CARD_WIDTH + 12),
        animated: true,
      });
      setActiveIndex(nextIndex);
    }, 4000);
  };

  const stopAutoScroll = () => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
  };

  // Auto-scroll logic
  useEffect(() => {
    startAutoScroll();
    return () => stopAutoScroll();
  }, [activeIndex]);

  const handleScroll = (event: any) => {
    const offsetX = event.nativeEvent.contentOffset.x;
    const index = Math.round(offsetX / (BANNER_CARD_WIDTH + 12));
    if (index >= 0 && index < PROMO_BANNERS.length && index !== activeIndex) {
      setActiveIndex(index);
    }
  };

  return (
    <View style={styles.container}>
      <ScrollView
        ref={scrollRef}
        horizontal
        showsHorizontalScrollIndicator={false}
        pagingEnabled={false}
        snapToInterval={BANNER_CARD_WIDTH + 12}
        decelerationRate="fast"
        contentContainerStyle={styles.scrollContent}
        onScroll={handleScroll}
        scrollEventThrottle={16}
        onTouchStart={stopAutoScroll}
        onTouchEnd={startAutoScroll}
      >
        {PROMO_BANNERS.map(banner => (
          <TouchableOpacity
            key={banner.id}
            style={styles.bannerCard}
            activeOpacity={0.9}
            onPress={() => onPressBanner?.(banner)}
          >
            <Image
              source={{ uri: banner.imageUrl }}
              style={styles.bannerImage}
              resizeMode="cover"
            />
            {/* Dark gradient overlay */}
            <View style={styles.overlay} />

            <View style={styles.textContainer}>
              <View style={[styles.badge, { backgroundColor: banner.accentColor }]}>
                <Text style={styles.badgeText}>{banner.badge}</Text>
              </View>
              <Text style={styles.title} numberOfLines={1}>
                {banner.title}
              </Text>
              <Text style={styles.subtitle} numberOfLines={2}>
                {banner.subtitle}
              </Text>
            </View>
          </TouchableOpacity>
        ))}
      </ScrollView>

      {/* Indicator dots */}
      <View style={styles.indicatorContainer}>
        {PROMO_BANNERS.map((_, i) => (
          <View
            key={i}
            style={[
              styles.indicatorDot,
              i === activeIndex && styles.indicatorDotActive,
            ]}
          />
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginVertical: 6,
  },
  scrollContent: {
    paddingHorizontal: 16,
    gap: 12,
  },
  bannerCard: {
    width: BANNER_CARD_WIDTH,
    height: 156,
    borderRadius: 18,
    overflow: 'hidden',
    backgroundColor: '#1E293B',
    borderWidth: 1,
    borderColor: '#334155',
    elevation: 3,
  },
  bannerImage: {
    width: '100%',
    height: '100%',
    position: 'absolute',
  },
  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(15, 23, 42, 0.65)',
  },
  textContainer: {
    flex: 1,
    justifyContent: 'flex-end',
    padding: 16,
  },
  badge: {
    alignSelf: 'flex-start',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    marginBottom: 6,
  },
  badgeText: {
    color: '#FFFFFF',
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  title: {
    fontSize: 18,
    fontWeight: '800',
    color: '#FFFFFF',
    marginBottom: 4,
    textShadowColor: 'rgba(0, 0, 0, 0.75)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 3,
  },
  subtitle: {
    fontSize: 12,
    color: '#CBD5E1',
    lineHeight: 16,
    textShadowColor: 'rgba(0, 0, 0, 0.75)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 3,
  },
  indicatorContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 10,
    gap: 6,
  },
  indicatorDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#334155',
  },
  indicatorDotActive: {
    width: 18,
    backgroundColor: '#38BDF8',
  },
});
