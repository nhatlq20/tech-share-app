import React, { useEffect, useState, useMemo } from 'react';
import {
  StyleSheet,
  View,
  Text,
  TextInput,
  TouchableOpacity,
  FlatList,
  RefreshControl,
  StatusBar,
  Dimensions,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { HeaderActions } from '../../components/navigation/HeaderActions';
import { useAppDispatch, useAppSelector } from '../../store';
import {
  fetchDevices,
  refreshDevices,
  setSelectedCategory,
  setSearchQuery,
  clearFilters,
} from '../../store/slices/deviceSlice';
import { CategoryBar } from '../../components/home/CategoryBar';
import { PromoBanner, PromoBannerItem } from '../../components/home/PromoBanner';
import { SectionHeader } from '../../components/home/SectionHeader';
import { DeviceCard } from '../../components/device/DeviceCard';
import { Device, DeviceCategory } from '../../types';
import { colors } from '../../theme/colors';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const COLUMN_WIDTH = (SCREEN_WIDTH - 40) / 2; // 16px screen padding + 8px gap

interface HomeScreenProps {
  onNavigateToDeviceDetail: (deviceId: string) => void;
  onNavigateToSearch?: () => void;
  onNavigateToNotifications?: () => void;
  onNavigateToChat?: () => void;
  /** Số tin nhắn chưa đọc — hiện badge nếu > 0 */
  unreadMessages?: number;
  /** Số thông báo chưa đọc — hiện badge nếu > 0 */
  unreadNotifications?: number;
}

export function HomeScreen({
  onNavigateToDeviceDetail,
  onNavigateToNotifications,
  onNavigateToChat,
  unreadMessages = 2,
  unreadNotifications = 5,
}: HomeScreenProps) {
  const dispatch = useAppDispatch();
  const {
    filteredDevices,
    selectedCategory,
    searchQuery,
    isLoading,
    isRefreshing,
    error,
  } = useAppSelector(state => state.devices);

  const [localSearch, setLocalSearch] = useState(searchQuery);

  // Gọi fetchDevices lần đầu khi mount
  useEffect(() => {
    dispatch(fetchDevices(undefined));
  }, [dispatch]);

  // Cập nhật tìm kiếm vào Redux và gọi Backend API
  const handleSearchChange = (text: string) => {
    setLocalSearch(text);
    dispatch(setSearchQuery(text));
    dispatch(fetchDevices({ category: selectedCategory, search: text }));
  };

  const handleClearSearch = () => {
    setLocalSearch('');
    dispatch(setSearchQuery(''));
    dispatch(fetchDevices({ category: selectedCategory, search: '' }));
  };

  const handleSelectCategory = (category: DeviceCategory | 'all') => {
    dispatch(setSelectedCategory(category));
    dispatch(fetchDevices({ category, search: localSearch }));
  };

  const handleRefresh = () => {
    dispatch(refreshDevices({ category: selectedCategory, search: localSearch }));
  };

  const handleRetry = () => {
    dispatch(fetchDevices({ category: selectedCategory, search: localSearch }));
  };

  // Header của FlatList gồm: Search, CategoryBar, PromoBanner, SectionHeader
  const renderListHeader = useMemo(() => {
    return (
      <View style={styles.headerArea}>
        {/* TOP BAR: Logo & notifications */}
        <View style={styles.topBar}>
          <View style={styles.brandContainer}>
            <View style={styles.logoBadge}>
              <Ionicons name="hardware-chip" size={18} color="#FFFFFF" />
            </View>
            <View>
              <Text style={styles.brandTitle}>TechShare</Text>
              <View style={styles.locationRow}>
                <Ionicons name="location-sharp" size={11} color={colors.light.primary} />
                <Text style={styles.locationText}>Hà Nội, Việt Nam</Text>
              </View>
            </View>
          </View>

          {/* Chat + Thông báo — dùng HeaderActions component */}
          <HeaderActions
            unreadMessages={unreadMessages}
            unreadNotifications={unreadNotifications}
            onPressChat={onNavigateToChat}
            onPressNotifications={onNavigateToNotifications}
          />
        </View>

        {/* SEARCH BAR */}
        <View style={styles.searchContainer}>
          <View style={styles.searchBar}>
            <Ionicons name="search-outline" size={20} color="#94A3B8" />
            <TextInput
              style={styles.searchInput}
              placeholder="Search devices..."
              placeholderTextColor="#64748B"
              value={localSearch}
              onChangeText={handleSearchChange}
              returnKeyType="search"
            />
            {localSearch.length > 0 ? (
              <TouchableOpacity
                onPress={handleClearSearch}
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              >
                <Ionicons name="close-circle" size={18} color="#94A3B8" />
              </TouchableOpacity>
            ) : (
              <View style={styles.searchFilterIcon}>
                <Ionicons name="options-outline" size={18} color="#38BDF8" />
              </View>
            )}
          </View>
        </View>

        {/* 6 DEVICE CATEGORIES */}
        <CategoryBar
          selectedCategory={selectedCategory}
          onSelectCategory={handleSelectCategory}
        />

        {/* PROMO BANNER CAROUSEL */}
        <PromoBanner
          onPressBanner={(banner: PromoBannerItem) => {
            console.log('Tapped banner:', banner.title);
          }}
        />

        {/* SECTION HEADER */}
        <SectionHeader
          title="Available devices"
          subtitle={
            selectedCategory === 'all'
              ? 'All tech categories'
              : `Filtered by: ${selectedCategory.toUpperCase()}`
          }
          badgeCount={filteredDevices.length}
          actionText={selectedCategory !== 'all' ? 'Clear filter' : undefined}
          onActionPress={
            selectedCategory !== 'all'
              ? () => {
                  dispatch(setSelectedCategory('all'));
                  dispatch(fetchDevices({ category: 'all', search: localSearch }));
                }
              : undefined
          }
        />
      </View>
    );
  }, [selectedCategory, filteredDevices.length, localSearch, dispatch, onNavigateToNotifications]);

  // Loading Skeleton State
  const renderLoadingSkeleton = () => (
    <View style={styles.skeletonContainer}>
      <View style={styles.skeletonCard}>
        <View style={styles.skeletonImage} />
        <View style={styles.skeletonLine} />
        <View style={[styles.skeletonLine, { width: '60%' }]} />
      </View>
      <View style={styles.skeletonCard}>
        <View style={styles.skeletonImage} />
        <View style={styles.skeletonLine} />
        <View style={[styles.skeletonLine, { width: '60%' }]} />
      </View>
    </View>
  );

  // Empty State
  const renderEmptyState = () => {
    if (isLoading) {
      return renderLoadingSkeleton();
    }

    return (
      <View style={styles.emptyContainer}>
        <View style={styles.emptyIconCircle}>
          <Ionicons name="hardware-chip-outline" size={36} color="#64748B" />
        </View>
        <Text style={styles.emptyTitle}>No devices available yet</Text>
        <Text style={styles.emptySubtitle}>
          {searchQuery || selectedCategory !== 'all'
            ? 'No matching devices were found for your current filters.'
            : 'There are no devices available for rent at the moment.'}
        </Text>

        {(searchQuery || selectedCategory !== 'all') && (
          <TouchableOpacity
            style={styles.resetBtn}
            onPress={() => {
              setLocalSearch('');
              dispatch(clearFilters());
              dispatch(fetchDevices({ category: 'all' }));
            }}
            activeOpacity={0.8}
          >
            <Ionicons name="refresh-outline" size={16} color="#FFFFFF" />
            <Text style={styles.resetBtnText}>View all devices</Text>
          </TouchableOpacity>
        )}
      </View>
    );
  };

  // Error State
  const renderErrorState = () => (
    <View style={styles.errorContainer}>
      <Ionicons name="alert-circle-outline" size={40} color="#EF4444" />
      <Text style={styles.errorTitle}>Something went wrong</Text>
      <Text style={styles.errorSubtitle}>{error}</Text>
      <TouchableOpacity
        style={styles.retryBtn}
        onPress={handleRetry}
        activeOpacity={0.8}
      >
        <Ionicons name="reload-outline" size={16} color="#FFFFFF" />
        <Text style={styles.retryBtnText}>Retry</Text>
      </TouchableOpacity>
    </View>
  );

  return (
    <View style={styles.root}>
      <StatusBar barStyle="dark-content" backgroundColor={colors.light.background} />

      {error && filteredDevices.length === 0 ? (
        <View style={styles.root}>
          {renderListHeader}
          {renderErrorState()}
        </View>
      ) : (
        <FlatList
          data={filteredDevices}
          keyExtractor={(item: Device) => item._id}
          renderItem={({ item }: { item: Device }) => (
            <View style={styles.cardWrapper}>
              <DeviceCard
                device={item}
                onPress={onNavigateToDeviceDetail}
                width={COLUMN_WIDTH}
              />
            </View>
          )}
          numColumns={2}
          columnWrapperStyle={styles.columnWrapper}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
          ListHeaderComponent={renderListHeader}
          ListEmptyComponent={renderEmptyState}
          refreshControl={
            <RefreshControl
              refreshing={isRefreshing}
              onRefresh={handleRefresh}
              tintColor="#38BDF8"
              colors={['#2563EB', '#38BDF8']}
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
    backgroundColor: colors.light.background,
  },
  listContent: {
    paddingBottom: 24,
  },
  headerArea: {
    paddingBottom: 4,
  },
  topBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 8,
  },
  brandContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  logoBadge: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: colors.light.primary,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: colors.light.primary,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 2,
  },
  brandTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: colors.light.textPrimary,
    letterSpacing: 0.5,
  },
  locationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    marginTop: 1,
  },
  locationText: {
    fontSize: 11,
    color: colors.light.textSecondary,
  },
  notificationBtn: {
    width: 38,
    height: 38,
    borderRadius: 12,
    backgroundColor: colors.light.surface,
    borderWidth: 1,
    borderColor: colors.light.border,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  notificationDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: colors.light.error,
    position: 'absolute',
    top: 8,
    right: 8,
    borderWidth: 1.5,
    borderColor: colors.light.surface,
  },
  searchContainer: {
    paddingHorizontal: 16,
    marginVertical: 6,
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.light.surface,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: colors.light.border,
    paddingHorizontal: 14,
    height: 48,
    gap: 10,
  },
  searchInput: {
    flex: 1,
    color: colors.light.textPrimary,
    fontSize: 14,
  },
  searchFilterIcon: {
    padding: 4,
  },
  columnWrapper: {
    paddingHorizontal: 16,
    justifyContent: 'space-between',
  },
  cardWrapper: {
    width: COLUMN_WIDTH,
  },
  skeletonContainer: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    gap: 8,
    marginTop: 12,
  },
  skeletonCard: {
    width: COLUMN_WIDTH,
    height: 220,
    backgroundColor: colors.light.surface,
    borderRadius: 16,
    padding: 10,
    borderWidth: 1,
    borderColor: colors.light.border,
  },
  skeletonImage: {
    width: '100%',
    height: 120,
    backgroundColor: colors.light.border,
    borderRadius: 12,
    marginBottom: 12,
  },
  skeletonLine: {
    height: 12,
    backgroundColor: colors.light.border,
    borderRadius: 6,
    marginBottom: 8,
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 40,
    paddingHorizontal: 24,
  },
  emptyIconCircle: {
    width: 68,
    height: 68,
    borderRadius: 34,
    backgroundColor: colors.light.primaryLight,
    borderWidth: 1,
    borderColor: colors.light.border,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 14,
  },
  emptyTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: colors.light.textPrimary,
    marginBottom: 6,
    textAlign: 'center',
  },
  emptySubtitle: {
    fontSize: 13,
    color: colors.light.textSecondary,
    textAlign: 'center',
    lineHeight: 18,
    marginBottom: 18,
  },
  resetBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: colors.light.primary,
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 10,
  },
  resetBtnText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '700',
  },
  errorContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: 30,
    backgroundColor: '#FEF2F2',
    margin: 16,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.light.error,
  },
  errorTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.light.error,
    marginTop: 8,
    marginBottom: 4,
  },
  errorSubtitle: {
    fontSize: 13,
    color: colors.light.textSecondary,
    textAlign: 'center',
    marginBottom: 16,
  },
  retryBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: colors.light.error,
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 8,
  },
  retryBtnText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '600',
  },
});
