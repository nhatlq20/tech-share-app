import React, { useState, useEffect, useCallback } from 'react';
import {
  StyleSheet,
  View,
  Text,
  FlatList,
  TouchableOpacity,
  Image,
  TextInput,
  ActivityIndicator,
  RefreshControl,
  Platform,
  StatusBar,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { theme, STRINGS, CONFIG } from '../../constants';
import { bookingService, Booking } from '../../services/bookingService';
import { socketService } from '../../services/socketService';

export interface OwnerMessagesScreenProps {
  navigation?: any;
  onOpenDrawer?: () => void;
  onNavigateToChat?: (bookingId: string) => void;
}

type FilterTab = 'all' | 'renting' | 'pending' | 'completed';

export function OwnerMessagesScreen({
  navigation,
  onOpenDrawer,
  onNavigateToChat,
}: OwnerMessagesScreenProps) {
  const insets = useSafeAreaInsets();
  const topInset = Math.max(
    insets.top,
    Platform.OS === 'android' ? StatusBar.currentHeight || 24 : 20
  );

  const [bookings, setBookings] = useState([] as Booking[]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeTab, setActiveTab] = useState('all' as FilterTab);

  const fetchBookings = useCallback(async (isSilent = false) => {
    if (!isSilent) setLoading(true);
    try {
      const data = await bookingService.getOwnerBookings();
      setBookings(Array.isArray(data) ? data : []);
    } catch (err: any) {
      console.warn('Failed to load owner conversations:', err?.message);
    } finally {
      if (!isSilent) setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchBookings();

    // Listen to real-time incoming messages to refresh list
    const unsubscribe = socketService.onNewMessage(() => {
      fetchBookings(true);
    });

    return () => {
      unsubscribe();
    };
  }, [fetchBookings]);

  const onRefresh = () => {
    setRefreshing(true);
    fetchBookings(true);
  };

  const handleOpenChat = (bookingId: string) => {
    if (onNavigateToChat) {
      onNavigateToChat(bookingId);
    } else if (navigation?.navigate) {
      navigation.navigate('ChatDetail', { bookingId });
    }
  };

  // Filter conversations based on tab and search keyword
  const filteredBookings = bookings.filter((item: Booking) => {
    // 1. Tab filter
    if (activeTab === 'renting' && item.status !== 'active') return false;
    if (activeTab === 'pending' && item.status !== 'pending') return false;
    if (activeTab === 'completed' && item.status !== 'completed') return false;

    // 2. Search query filter
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase().trim();

    const renter: any = typeof item.renterId === 'object' ? item.renterId : null;
    const device: any = typeof item.deviceId === 'object' ? item.deviceId : null;

    const renterName = renter?.name ? String(renter.name).toLowerCase() : '';
    const deviceName = (device?.name || device?.title) ? String(device.name || device.title).toLowerCase() : '';
    const bookingCode = String(item.bookingCode || '').toLowerCase();

    return renterName.includes(q) || deviceName.includes(q) || bookingCode.includes(q);
  });

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'active':
        return {
          bg: theme.colors.success[50],
          text: theme.colors.success[600],
          label: STRINGS.OWNER_MESSAGES.ACTIVE_TAB,
        };
      case 'pending':
        return {
          bg: theme.colors.warning[50],
          text: theme.colors.warning[600],
          label: STRINGS.OWNER_MESSAGES.PENDING_TAB,
        };
      case 'completed':
        return {
          bg: theme.colors.primary[50],
          text: theme.colors.primary[700],
          label: STRINGS.OWNER_MESSAGES.COMPLETED_TAB,
        };
      default:
        return {
          bg: theme.colors.slate[100],
          text: theme.colors.slate[600],
          label: status.toUpperCase(),
        };
    }
  };

  return (
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor={theme.colors.card} />

      {/* ── 1. TOP HEADER WITH DRAWER BUTTON ── */}
      <View style={[styles.topBar, { paddingTop: topInset + theme.spacing.sm }]}>
        <View style={styles.topBarLeft}>
          <TouchableOpacity
            accessibilityRole="button"
            accessibilityLabel={STRINGS.OWNER_MESSAGES.MENU_ACCESSIBILITY_LABEL}
            onPress={() => {
              if (onOpenDrawer) {
                onOpenDrawer();
              } else if (navigation?.openDrawer) {
                navigation.openDrawer();
              }
            }}
            style={styles.hamburgerButton}
            activeOpacity={CONFIG.ANIMATION.ACTIVE_OPACITY_BUTTON}
          >
            <Ionicons name="menu-outline" size={24} color={theme.colors.slate[900]} />
          </TouchableOpacity>
          <View style={styles.topBarTitleCol}>
            <Text style={styles.topBarTitle}>{STRINGS.OWNER_MESSAGES.TOP_BAR_TITLE}</Text>
            <Text style={styles.topBarSubtitle}>{STRINGS.OWNER_MESSAGES.TOP_BAR_SUBTITLE}</Text>
          </View>
        </View>
      </View>

      {/* ── 2. SEARCH BAR ── */}
      <View style={styles.searchWrapper}>
        <View style={styles.searchInputContainer}>
          <Ionicons name="search-outline" size={18} color={theme.colors.slate[400]} />
          <TextInput
            style={styles.searchInput}
            placeholder={STRINGS.OWNER_MESSAGES.SEARCH_PLACEHOLDER}
            placeholderTextColor={theme.colors.slate[400]}
            value={searchQuery}
            onChangeText={setSearchQuery}
            clearButtonMode="while-editing"
          />
          {searchQuery.length > 0 && (
            <TouchableOpacity onPress={() => setSearchQuery('')}>
              <Ionicons name="close-circle" size={18} color={theme.colors.slate[400]} />
            </TouchableOpacity>
          )}
        </View>
      </View>

      {/* ── 3. FILTER TABS ── */}
      <View style={styles.tabsContainer}>
        {(['all', 'renting', 'pending', 'completed'] as FilterTab[]).map((tab) => {
          const isActive = activeTab === tab;
          let label: string = STRINGS.OWNER_MESSAGES.ALL_TAB;
          if (tab === 'renting') label = STRINGS.OWNER_MESSAGES.ACTIVE_TAB;
          if (tab === 'pending') label = STRINGS.OWNER_MESSAGES.PENDING_TAB;
          if (tab === 'completed') label = STRINGS.OWNER_MESSAGES.COMPLETED_TAB;

          return (
            <TouchableOpacity
              key={tab}
              style={[styles.tabButton, isActive && styles.tabButtonActive]}
              onPress={() => setActiveTab(tab)}
              activeOpacity={0.75}
            >
              <Text style={[styles.tabButtonText, isActive && styles.tabButtonTextActive]}>
                {label}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>

      {/* ── 4. CONVERSATIONS LIST ── */}
      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={theme.colors.primary[600]} />
          <Text style={styles.loadingText}>{STRINGS.OWNER_MESSAGES.LOADING_TEXT}</Text>
        </View>
      ) : (
        <FlatList
          data={filteredBookings}
          keyExtractor={(item: Booking) => item._id}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              colors={[theme.colors.primary[600]]}
              tintColor={theme.colors.primary[600]}
            />
          }
          renderItem={({ item }: { item: Booking }) => {
            const renter: any = typeof item.renterId === 'object' ? item.renterId : null;
            const device: any = typeof item.deviceId === 'object' ? item.deviceId : null;

            const renterName = renter?.name || STRINGS.OWNER_MESSAGES.DEFAULT_RENTER_NAME;
            const renterAvatar = renter?.avatar || 'https://via.placeholder.com/80';
            const renterPhone = renter?.phone || '';

            const deviceName = device?.name || device?.title || 'Tech Device';
            const deviceImage =
              device?.images?.[0] || 'https://via.placeholder.com/120';

            const statusBadge = getStatusBadge(item.status);
            const startDateStr = item.startDate
              ? new Date(item.startDate).toLocaleDateString([], { month: 'short', day: 'numeric' })
              : '';
            const endDateStr = item.endDate
              ? new Date(item.endDate).toLocaleDateString([], { month: 'short', day: 'numeric' })
              : '';

            return (
              <TouchableOpacity
                style={styles.conversationCard}
                onPress={() => handleOpenChat(item._id)}
                activeOpacity={0.85}
              >
                {/* Top: Renter Info & Status Pill */}
                <View style={styles.cardHeader}>
                  <Image source={{ uri: renterAvatar }} style={styles.renterAvatar} />
                  <View style={styles.renterInfoCol}>
                    <View style={styles.renterNameRow}>
                      <Text style={styles.renterName} numberOfLines={1}>
                        {renterName}
                      </Text>
                      {renter?.isVerified && (
                        <Ionicons
                          name="checkmark-circle"
                          size={14}
                          color={theme.colors.primary[600]}
                          style={{ marginLeft: 3 }}
                        />
                      )}
                    </View>
                    {renterPhone ? (
                      <Text style={styles.renterPhone}>
                        <Ionicons name="call-outline" size={11} color={theme.colors.slate[400]} />{' '}
                        {renterPhone}
                      </Text>
                    ) : null}
                  </View>

                  <View
                    style={[
                      styles.statusPill,
                      { backgroundColor: statusBadge.bg },
                    ]}
                  >
                    <Text style={[styles.statusPillText, { color: statusBadge.text }]}>
                      {statusBadge.label}
                    </Text>
                  </View>
                </View>

                {/* Middle: Device & Order Info */}
                <View style={styles.deviceRow}>
                  <Image source={{ uri: deviceImage }} style={styles.deviceThumb} />
                  <View style={styles.deviceInfoCol}>
                    <Text style={styles.deviceName} numberOfLines={1}>
                      {deviceName}
                    </Text>
                    <Text style={styles.bookingCodeText}>
                      {STRINGS.OWNER_MESSAGES.ORDER_CODE_PREFIX}
                      {item.bookingCode}
                    </Text>
                    {startDateStr && endDateStr ? (
                      <Text style={styles.dateRangeText}>
                        <Ionicons name="calendar-outline" size={11} color={theme.colors.slate[400]} />{' '}
                        {startDateStr} - {endDateStr} ({item.totalDays}d)
                      </Text>
                    ) : null}
                  </View>
                </View>

                {/* Bottom: Action bar */}
                <View style={styles.cardFooter}>
                  <View style={styles.chatActionBtn}>
                    <Ionicons
                      name="chatbubble-ellipses-outline"
                      size={15}
                      color={theme.colors.primary[700]}
                    />
                    <Text style={styles.chatActionBtnText}>
                      {STRINGS.OWNER_MESSAGES.CHAT_BUTTON}
                    </Text>
                  </View>
                  <Ionicons
                    name="chevron-forward"
                    size={18}
                    color={theme.colors.slate[400]}
                  />
                </View>
              </TouchableOpacity>
            );
          }}
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <View style={styles.emptyIconCircle}>
                <Ionicons
                  name="chatbubbles-outline"
                  size={42}
                  color={theme.colors.slate[400]}
                />
              </View>
              <Text style={styles.emptyTitle}>{STRINGS.OWNER_MESSAGES.EMPTY_TITLE}</Text>
              <Text style={styles.emptySubtitle}>{STRINGS.OWNER_MESSAGES.EMPTY_DESC}</Text>
            </View>
          }
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  topBar: {
    backgroundColor: theme.colors.card,
    paddingHorizontal: theme.spacing.md,
    paddingBottom: theme.spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.borderSubtle,
  },
  topBarLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.sm + 4,
  },
  hamburgerButton: {
    width: 40,
    height: 40,
    borderRadius: theme.radii.md,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: theme.colors.slate[100],
  },
  topBarTitleCol: {
    flex: 1,
  },
  topBarTitle: {
    ...theme.typography.subheading,
    fontSize: 18,
    fontWeight: '700',
    color: theme.colors.slate[900],
  },
  topBarSubtitle: {
    ...theme.typography.caption,
    fontSize: 12,
    color: theme.colors.slate[500],
    marginTop: 2,
  },
  searchWrapper: {
    backgroundColor: theme.colors.card,
    paddingHorizontal: theme.spacing.md,
    paddingBottom: theme.spacing.sm + 2,
  },
  searchInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.colors.slate[100],
    borderRadius: theme.radii.md,
    paddingHorizontal: theme.spacing.sm + 4,
    height: 40,
    gap: theme.spacing.xs + 2,
  },
  searchInput: {
    flex: 1,
    ...theme.typography.body,
    fontSize: 14,
    color: theme.colors.slate[900],
    paddingVertical: 0,
  },
  tabsContainer: {
    flexDirection: 'row',
    backgroundColor: theme.colors.card,
    paddingHorizontal: theme.spacing.md,
    paddingBottom: theme.spacing.sm + 2,
    gap: theme.spacing.xs + 4,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.borderSubtle,
  },
  tabButton: {
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: theme.radii.full,
    backgroundColor: theme.colors.slate[100],
  },
  tabButtonActive: {
    backgroundColor: theme.colors.primary[600],
  },
  tabButtonText: {
    ...theme.typography.caption,
    fontSize: 12,
    fontWeight: '600',
    color: theme.colors.slate[600],
  },
  tabButtonTextActive: {
    color: theme.colors.white,
    fontWeight: '700',
  },
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: theme.spacing.sm,
  },
  loadingText: {
    ...theme.typography.body,
    fontSize: 13,
    color: theme.colors.slate[500],
  },
  listContent: {
    padding: theme.spacing.md,
    gap: theme.spacing.md,
  },
  conversationCard: {
    backgroundColor: theme.colors.card,
    borderRadius: theme.radii.lg,
    padding: theme.spacing.md,
    borderWidth: 1,
    borderColor: theme.colors.borderSubtle,
    ...theme.shadows.card,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.sm + 2,
    paddingBottom: theme.spacing.sm + 2,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.slate[100],
  },
  renterAvatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: theme.colors.slate[200],
  },
  renterInfoCol: {
    flex: 1,
  },
  renterNameRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  renterName: {
    ...theme.typography.body,
    fontSize: 15,
    fontWeight: '700',
    color: theme.colors.slate[900],
  },
  renterPhone: {
    ...theme.typography.caption,
    fontSize: 12,
    color: theme.colors.slate[500],
    marginTop: 2,
  },
  statusPill: {
    paddingHorizontal: 9,
    paddingVertical: 3,
    borderRadius: theme.radii.full,
  },
  statusPillText: {
    ...theme.typography.caption,
    fontSize: 11,
    fontWeight: '700',
  },
  deviceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.sm + 2,
    paddingVertical: theme.spacing.sm + 2,
  },
  deviceThumb: {
    width: 46,
    height: 46,
    borderRadius: theme.radii.md,
    backgroundColor: theme.colors.slate[100],
  },
  deviceInfoCol: {
    flex: 1,
  },
  deviceName: {
    ...theme.typography.body,
    fontSize: 13.5,
    fontWeight: '600',
    color: theme.colors.slate[800],
  },
  bookingCodeText: {
    ...theme.typography.caption,
    fontSize: 11.5,
    color: theme.colors.slate[400],
    marginTop: 1,
  },
  dateRangeText: {
    ...theme.typography.caption,
    fontSize: 11.5,
    color: theme.colors.slate[500],
    marginTop: 2,
  },
  cardFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: theme.spacing.sm,
    borderTopWidth: 1,
    borderTopColor: theme.colors.slate[100],
  },
  chatActionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: theme.radii.full,
    backgroundColor: theme.colors.primary[50],
  },
  chatActionBtnText: {
    ...theme.typography.caption,
    fontSize: 12,
    fontWeight: '700',
    color: theme.colors.primary[700],
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingTop: theme.spacing.xl * 2,
    paddingHorizontal: theme.spacing.lg,
  },
  emptyIconCircle: {
    width: 76,
    height: 76,
    borderRadius: 38,
    backgroundColor: theme.colors.slate[100],
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: theme.spacing.md,
  },
  emptyTitle: {
    ...theme.typography.subheading,
    fontSize: 17,
    fontWeight: '700',
    color: theme.colors.slate[800],
    marginBottom: 6,
  },
  emptySubtitle: {
    ...theme.typography.body,
    fontSize: 13,
    color: theme.colors.slate[500],
    textAlign: 'center',
    lineHeight: 18,
  },
});
