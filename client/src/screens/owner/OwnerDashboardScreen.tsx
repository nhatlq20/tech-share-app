import React, { useState } from 'react';
import {
  StyleSheet,
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  Image,
  Alert,
  Switch,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../../theme/colors';
import { OwnerAnalyticsScreen } from './OwnerAnalyticsScreen';

interface OwnerDashboardScreenProps {
  onBackToHome?: () => void;
  onNavigateToDeviceDetail?: (deviceId: string) => void;
}

interface OwnerDeviceItem {
  id: string;
  name: string;
  category: string;
  price: number;
  rentals: number;
  status: string;
  isAvailable: boolean;
  image: string;
}

export function OwnerDashboardScreen({ onBackToHome, onNavigateToDeviceDetail }: OwnerDashboardScreenProps) {
  const [activeView, setActiveView] = useState('analytics' as 'analytics' | 'management');
  const [deviceFilter, setDeviceFilter] = useState('all' as 'all' | 'rented' | 'available');
  const [orderApproved, setOrderApproved] = useState(false);
  const [orderRejected, setOrderRejected] = useState(false);
  const [devicesState, setDevicesState] = useState([
    {
      id: '64e0a12f9b1c2b001a000001',
      name: 'iPhone 15 Pro Max 256GB Titanium',
      category: 'Smartphone',
      price: 250000,
      rentals: 24,
      status: 'rented',
      isAvailable: true,
      image: 'https://images.unsplash.com/photo-1695048133142-1a20484d2569?w=400',
    },
    {
      id: '64e0a12f9b1c2b001a000003',
      name: 'Sony Alpha A7 IV Mirrorless Kit 24-70mm',
      category: 'Máy ảnh',
      price: 450000,
      rentals: 18,
      status: 'available',
      isAvailable: true,
      image: 'https://images.unsplash.com/photo-1516035069371-29a1b244cc32?w=400',
    },
    {
      id: '64e0a12f9b1c2b001a000002',
      name: 'MacBook Pro 16 inch M3 Max 36GB RAM',
      category: 'Laptop',
      price: 500000,
      rentals: 9,
      status: 'available',
      isAvailable: true,
      image: 'https://images.unsplash.com/photo-1517336714731-489689fd1ca8?w=400',
    },
    {
      id: '64e0a12f9b1c2b001a000004',
      name: 'DJI Mini 4 Pro Fly More Combo Plus',
      category: 'Drone',
      price: 300000,
      rentals: 15,
      status: 'available',
      isAvailable: false,
      image: 'https://images.unsplash.com/photo-1527977966376-1c8408f9f108?w=400',
    },
  ] as OwnerDeviceItem[]);

  const toggleDeviceAvailability = (id: string) => {
    setDevicesState((prev: OwnerDeviceItem[]) =>
      prev.map((d: OwnerDeviceItem) => (d.id === id ? { ...d, isAvailable: !d.isAvailable } : d))
    );
  };

  const filteredDevices = devicesState.filter((d: OwnerDeviceItem) => {
    if (deviceFilter === 'rented') return d.status === 'rented';
    if (deviceFilter === 'available') return d.status === 'available';
    return true;
  });

  return (
    <View style={styles.container}>
      {/* 1. Header Shop Chủ máy */}
      <View style={styles.header}>
        <View style={styles.headerTop}>
          <View style={styles.ownerInfoRow}>
            <Image
              source={{ uri: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=400' }}
              style={styles.ownerAvatar}
            />
            <View>
              <View style={styles.nameRow}>
                <Text style={styles.ownerName}>Minh Tuấn Tech</Text>
                <Ionicons name="checkmark-circle" size={16} color={colors.light.primary} />
              </View>
              <View style={styles.ratingRow}>
                <Ionicons name="star" size={12} color={colors.light.ratingStar} />
                <Text style={styles.ratingText}>4.9 (28 đánh giá)</Text>
                <Text style={styles.dotSeparator}>•</Text>
                <View style={styles.badgeTopOwner}>
                  <Text style={styles.badgeTopOwnerText}>Top Owner</Text>
                </View>
              </View>
            </View>
          </View>

          {onBackToHome && (
            <TouchableOpacity style={styles.switchButton} onPress={onBackToHome} activeOpacity={0.8}>
              <Ionicons name="swap-horizontal" size={16} color={colors.light.primary} />
              <Text style={styles.switchButtonText}>Đi thuê</Text>
            </TouchableOpacity>
          )}
        </View>
      </View>

      {/* Sub-Tabs: Báo cáo Doanh thu (K-05) vs Quản lý Kho Máy */}
      <View style={styles.subTabBar}>
        <TouchableOpacity
          style={[styles.subTabItem, activeView === 'analytics' && styles.subTabItemActive]}
          onPress={() => setActiveView('analytics')}
          activeOpacity={0.8}
        >
          <Ionicons
            name="bar-chart"
            size={14}
            color={activeView === 'analytics' ? '#FFFFFF' : colors.light.textSecondary}
          />
          <Text
            style={[
              styles.subTabText,
              activeView === 'analytics' && styles.subTabTextActive,
            ]}
          >
            Báo cáo Doanh thu (K-05)
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.subTabItem, activeView === 'management' && styles.subTabItemActive]}
          onPress={() => setActiveView('management')}
          activeOpacity={0.8}
        >
          <Ionicons
            name="cube-outline"
            size={14}
            color={activeView === 'management' ? '#FFFFFF' : colors.light.textSecondary}
          />
          <Text
            style={[
              styles.subTabText,
              activeView === 'management' && styles.subTabTextActive,
            ]}
          >
            Quản lý Kho & Đơn
          </Text>
        </TouchableOpacity>
      </View>

      {activeView === 'analytics' ? (
        <OwnerAnalyticsScreen
          onBackToHome={onBackToHome}
          onNavigateToDeviceDetail={onNavigateToDeviceDetail}
        />
      ) : (
        <ScrollView style={styles.scrollView} contentContainerStyle={styles.scrollContent}>
        {/* 2. VÍ DOANH THU & KÝ QUỸ (FINANCIAL HUB) */}
        <View style={styles.walletCard}>
          <View style={styles.walletHeaderRow}>
            <View>
              <Text style={styles.walletLabel}>Số dư ví khả dụng</Text>
              <Text style={styles.walletAmount}>5.200.000 đ</Text>
            </View>
            <TouchableOpacity
              style={styles.btnWithdraw}
              onPress={() => Alert.alert('Rút tiền về Ngân hàng', 'Lệnh rút 5.200.000 đ về Vietcombank đang được khởi tạo.')}
              activeOpacity={0.8}
            >
              <Ionicons name="wallet-outline" size={16} color="#FFFFFF" />
              <Text style={styles.btnWithdrawText}>Rút tiền</Text>
            </TouchableOpacity>
          </View>

          <View style={styles.walletDivider} />

          <View style={styles.walletSubRow}>
            <View style={styles.walletSubCol}>
              <Text style={styles.walletSubLabel}>⏳ Cọc đang giữ hộ (Escrow)</Text>
              <Text style={styles.walletSubValueGreen}>15.000.000 đ</Text>
            </View>
            <View style={styles.walletSubColRight}>
              <Text style={styles.walletSubLabel}>📈 Doanh thu tháng này</Text>
              <Text style={styles.walletSubValueBlue}>3.850.000 đ (+12%)</Text>
            </View>
          </View>
        </View>

        {/* 3. ĐƠN THUÊ CẦN HÀNH ĐỘNG (ACTION REQUIRED) */}
        <View style={styles.sectionBlock}>
          <View style={styles.sectionTitleRow}>
            <Text style={styles.sectionHeaderTitle}>📦 ĐƠN THUÊ CẦN XỬ LÝ</Text>
            <View style={styles.badgeCountOrders}>
              <Text style={styles.badgeCountOrdersText}>
                {(!orderApproved && !orderRejected ? 1 : 0) + 1} đơn
              </Text>
            </View>
          </View>

          {/* Đơn mới chờ duyệt */}
          {!orderApproved && !orderRejected && (
            <View style={styles.orderActionCard}>
              <View style={styles.orderHeaderRow}>
                <View style={styles.orderCodeRow}>
                  <View style={styles.badgePendingYellow}>
                    <Text style={styles.badgePendingYellowText}>Đơn mới chờ duyệt</Text>
                  </View>
                  <Text style={styles.orderCodeText}>#TS-20260915</Text>
                </View>
                <Text style={styles.orderPriceText}>900.000 đ</Text>
              </View>

              <View style={styles.orderBody}>
                <Image
                  source={{ uri: 'https://images.unsplash.com/photo-1516035069371-29a1b244cc32?w=400' }}
                  style={styles.orderDeviceThumb}
                />
                <View style={styles.orderDeviceDetails}>
                  <Text style={styles.orderDeviceName}>Sony Alpha A7 IV Kit 24-70mm</Text>
                  <Text style={styles.orderDurationText}>Thời gian: 2 ngày (18/09 - 20/09)</Text>
                  <View style={styles.customerRow}>
                    <Ionicons name="person-circle" size={14} color="#94A3B8" />
                    <Text style={styles.customerName}>Hoang Nam Creator</Text>
                    <Text style={styles.customerTrustScore}>⭐ 5.0 (Uy tín: 100)</Text>
                  </View>
                </View>
              </View>

              <View style={styles.orderButtonRow}>
                <TouchableOpacity
                  style={styles.btnRejectOrder}
                  onPress={() => {
                    setOrderRejected(true);
                    Alert.alert('Đã từ chối', 'Đã từ chối đơn thuê và hoàn tiền cọc cho khách.');
                  }}
                  activeOpacity={0.8}
                >
                  <Text style={styles.btnRejectOrderText}>Từ chối</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.btnApproveOrder}
                  onPress={() => {
                    setOrderApproved(true);
                    Alert.alert('Phê duyệt thành công', 'Đã duyệt đơn thuê. Khách hàng sẽ đến nhận máy theo lịch.');
                  }}
                  activeOpacity={0.8}
                >
                  <Text style={styles.btnApproveOrderText}>Phê duyệt đơn</Text>
                </TouchableOpacity>
              </View>
            </View>
          )}

          {/* Đơn đang cho thuê sắp đến hạn trả */}
          <View style={styles.orderActiveCard}>
            <View style={styles.orderHeaderRow}>
              <View style={styles.badgeActiveGreen}>
                <Text style={styles.badgeActiveGreenText}>Đang cho thuê</Text>
              </View>
              <Text style={styles.orderDueDate}>Hạn trả: 18:00 Ngày mai</Text>
            </View>

            <View style={styles.orderBody}>
              <Image
                source={{ uri: 'https://images.unsplash.com/photo-1695048133142-1a20484d2569?w=400' }}
                style={styles.orderDeviceThumb}
              />
              <View style={styles.orderDeviceDetails}>
                <Text style={styles.orderDeviceName}>iPhone 15 Pro Max 256GB</Text>
                <Text style={styles.orderDurationText}>Đơn #TS-20260910 • Đã cọc: 15.000.000 đ</Text>
                <Text style={styles.customerName}>Khách: Hoang Nam Creator</Text>
              </View>
            </View>

            <View style={styles.orderButtonRow}>
              <TouchableOpacity
                style={styles.btnChatCustomer}
                onPress={() => Alert.alert('Chat với khách', 'Mở kênh chat 1-1 với Hoang Nam Creator')}
                activeOpacity={0.8}
              >
                <Ionicons name="chatbubble-ellipses-outline" size={14} color="#38BDF8" />
                <Text style={styles.btnChatCustomerText}>Nhắn tin</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.btnHandoverPhoto}
                onPress={() => Alert.alert('Chụp ảnh đối soát', 'Mở camera chụp hiện trạng máy lúc khách trả để hoàn cọc.')}
                activeOpacity={0.8}
              >
                <Ionicons name="camera-outline" size={14} color="#FFFFFF" />
                <Text style={styles.btnHandoverPhotoText}>Chuẩn bị nhận máy</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>

        {/* 4. QUẢN LÝ THIẾT BỊ CỦA TÔI (MY FLEET) */}
        <View style={styles.sectionBlock}>
          <View style={styles.sectionTitleRow}>
            <Text style={styles.sectionHeaderTitle}>📱 THIẾT BỊ CỦA TÔI ({devicesState.length})</Text>
            <TouchableOpacity onPress={() => Alert.alert('Đăng máy', 'Mở luồng đăng thiết bị mới')}>
              <Text style={styles.linkAddDevice}>+ Đăng máy mới</Text>
            </TouchableOpacity>
          </View>

          {/* Bộ lọc filter */}
          <View style={styles.deviceFilterRow}>
            <TouchableOpacity
              style={[styles.deviceFilterTab, deviceFilter === 'all' && styles.deviceFilterTabActive]}
              onPress={() => setDeviceFilter('all')}
            >
              <Text style={[styles.deviceFilterText, deviceFilter === 'all' && styles.deviceFilterTextActive]}>
                Tất cả ({devicesState.length})
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.deviceFilterTab, deviceFilter === 'rented' && styles.deviceFilterTabActive]}
              onPress={() => setDeviceFilter('rented')}
            >
              <Text style={[styles.deviceFilterText, deviceFilter === 'rented' && styles.deviceFilterTextActive]}>
                Đang thuê (1)
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.deviceFilterTab, deviceFilter === 'available' && styles.deviceFilterTabActive]}
              onPress={() => setDeviceFilter('available')}
            >
              <Text style={[styles.deviceFilterText, deviceFilter === 'available' && styles.deviceFilterTextActive]}>
                Sẵn sàng (3)
              </Text>
            </TouchableOpacity>
          </View>

          {/* Danh sách thiết bị */}
          {filteredDevices.map((item: OwnerDeviceItem) => (
            <TouchableOpacity
              key={item.id}
              style={styles.deviceCard}
              onPress={() => onNavigateToDeviceDetail && onNavigateToDeviceDetail(item.id)}
              activeOpacity={0.8}
            >
              <Image source={{ uri: item.image }} style={styles.deviceThumb} />
              <View style={styles.deviceInfoCol}>
                <View style={styles.deviceTitleRow}>
                  <Text style={styles.deviceName} numberOfLines={1}>
                    {item.name}
                  </Text>
                </View>

                <Text style={styles.devicePrice}>
                  {item.price.toLocaleString('vi-VN')} đ/ngày • {item.rentals} lượt thuê
                </Text>

                <View style={styles.deviceStatusRow}>
                  <View
                    style={[
                      styles.statusPill,
                      item.status === 'rented' ? styles.statusPillRented : styles.statusPillAvailable,
                    ]}
                  >
                    <Text
                      style={[
                        styles.statusPillText,
                        item.status === 'rented' ? styles.statusPillRentedText : styles.statusPillAvailableText,
                      ]}
                    >
                      {item.status === 'rented' ? '🟢 Đang cho thuê' : '⚪ Sẵn sàng'}
                    </Text>
                  </View>

                  <View style={styles.switchCol}>
                    <Text style={styles.switchLabel}>{item.isAvailable ? 'Nhận đơn' : 'Tạm ẩn'}</Text>
                    <Switch
                      value={item.isAvailable}
                      onValueChange={() => toggleDeviceAvailability(item.id)}
                      trackColor={{ false: '#334155', true: '#059669' }}
                      thumbColor={item.isAvailable ? '#10B981' : '#94A3B8'}
                    />
                  </View>
                </View>
              </View>
            </TouchableOpacity>
          ))}
        </View>

        {/* 5. THAO TÁC NHANH (QUICK SHORTCUTS) */}
        <View style={styles.sectionBlock}>
          <Text style={styles.sectionHeaderTitle}>⚡ CÔNG CỤ CHỦ MÁY</Text>

          <View style={styles.shortcutGrid}>
            <TouchableOpacity
              style={styles.shortcutButton}
              onPress={() => Alert.alert('Đăng máy mới', 'Chuyển sang màn hình tạo thiết bị công nghệ')}
              activeOpacity={0.8}
            >
              <Ionicons name="add-circle-outline" size={24} color="#10B981" />
              <Text style={styles.shortcutButtonText}>Đăng thiết bị mới</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.shortcutButton}
              onPress={() => Alert.alert('Quét mã QR', 'Mở camera quét QR xác nhận giao nhận máy')}
              activeOpacity={0.8}
            >
              <Ionicons name="qr-code-outline" size={24} color="#38BDF8" />
              <Text style={styles.shortcutButtonText}>Quét QR Giao/Nhận</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.shortcutButton}
              onPress={() => Alert.alert('Lịch chặn bận', 'Quản lý các ngày bạn bận dùng máy, không nhận khách')}
              activeOpacity={0.8}
            >
              <Ionicons name="calendar-outline" size={24} color="#F59E0B" />
              <Text style={styles.shortcutButtonText}>Chặn lịch bận</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.shortcutButton}
              onPress={() => Alert.alert('Hiệu suất cho thuê', 'Tỷ lệ lấp đầy tháng này: 68% (Đạt mức Tốt)')}
              activeOpacity={0.8}
            >
              <Ionicons name="bar-chart-outline" size={24} color="#A855F7" />
              <Text style={styles.shortcutButtonText}>Tỷ lệ lấp đầy</Text>
            </TouchableOpacity>
          </View>
        </View>
      </ScrollView>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.light.background,
  },
  header: {
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 16,
    backgroundColor: colors.light.background,
    borderBottomWidth: 1,
    borderBottomColor: colors.light.border,
  },
  headerTop: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  ownerInfoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  ownerAvatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    borderWidth: 2,
    borderColor: colors.light.primary,
  },
  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  ownerName: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.light.textPrimary,
  },
  ratingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 3,
  },
  ratingText: {
    fontSize: 11,
    color: colors.light.textPrimary,
    fontWeight: '600',
  },
  dotSeparator: {
    color: colors.light.textSecondary,
    fontSize: 10,
    marginHorizontal: 2,
  },
  badgeTopOwner: {
    backgroundColor: colors.light.primaryLight,
    paddingHorizontal: 6,
    paddingVertical: 1,
    borderRadius: 4,
  },
  badgeTopOwnerText: {
    color: colors.light.primary,
    fontSize: 10,
    fontWeight: '700',
  },
  switchButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: colors.light.surface,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.light.border,
  },
  switchButtonText: {
    color: colors.light.primary,
    fontSize: 12,
    fontWeight: '600',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 36,
  },
  walletCard: {
    backgroundColor: colors.light.surface,
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: colors.light.border,
    marginBottom: 20,
  },
  walletHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  walletLabel: {
    fontSize: 12,
    color: colors.light.textSecondary,
    marginBottom: 4,
  },
  walletAmount: {
    fontSize: 22,
    fontWeight: '800',
    color: colors.light.primary,
  },
  btnWithdraw: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: colors.light.primary,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 10,
  },
  btnWithdrawText: {
    color: '#FFFFFF',
    fontWeight: '700',
    fontSize: 13,
  },
  walletDivider: {
    height: 1,
    backgroundColor: colors.light.border,
    marginVertical: 14,
  },
  walletSubRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  walletSubCol: {
    flex: 1,
  },
  walletSubColRight: {
    flex: 1,
    alignItems: 'flex-end',
  },
  walletSubLabel: {
    fontSize: 11,
    color: colors.light.textSecondary,
    marginBottom: 4,
  },
  walletSubValueGreen: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.light.success,
  },
  walletSubValueBlue: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.light.primary,
  },
  sectionBlock: {
    marginBottom: 20,
  },
  sectionTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  sectionHeaderTitle: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.light.textSecondary,
    letterSpacing: 0.5,
  },
  badgeCountOrders: {
    backgroundColor: colors.light.primaryLight,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: colors.light.primary,
  },
  badgeCountOrdersText: {
    color: colors.light.primary,
    fontSize: 10,
    fontWeight: '700',
  },
  linkAddDevice: {
    color: colors.light.primary,
    fontSize: 12,
    fontWeight: '600',
  },
  orderActionCard: {
    backgroundColor: colors.light.surface,
    borderRadius: 12,
    padding: 14,
    borderWidth: 1,
    borderColor: colors.light.warning,
    marginBottom: 12,
  },
  orderActiveCard: {
    backgroundColor: colors.light.surface,
    borderRadius: 12,
    padding: 14,
    borderWidth: 1,
    borderColor: colors.light.border,
    marginBottom: 12,
  },
  orderHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  orderCodeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  badgePendingYellow: {
    backgroundColor: '#FEF3C7',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  badgePendingYellowText: {
    color: colors.light.warning,
    fontSize: 10,
    fontWeight: '700',
  },
  badgeActiveGreen: {
    backgroundColor: colors.light.primaryLight,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  badgeActiveGreenText: {
    color: colors.light.primary,
    fontSize: 10,
    fontWeight: '700',
  },
  orderCodeText: {
    fontSize: 12,
    color: colors.light.textSecondary,
  },
  orderPriceText: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.light.textPrimary,
  },
  orderDueDate: {
    fontSize: 11,
    color: colors.light.textSecondary,
  },
  orderBody: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 12,
  },
  orderDeviceThumb: {
    width: 60,
    height: 60,
    borderRadius: 8,
    backgroundColor: colors.light.border,
  },
  orderDeviceDetails: {
    flex: 1,
  },
  orderDeviceName: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.light.textPrimary,
    marginBottom: 2,
  },
  orderDurationText: {
    fontSize: 11,
    color: colors.light.textSecondary,
    marginBottom: 4,
  },
  customerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  customerName: {
    fontSize: 11,
    fontWeight: '600',
    color: colors.light.textPrimary,
  },
  customerTrustScore: {
    fontSize: 11,
    color: colors.light.warning,
  },
  orderButtonRow: {
    flexDirection: 'row',
    gap: 10,
  },
  btnRejectOrder: {
    flex: 1,
    backgroundColor: colors.light.surface,
    borderWidth: 1,
    borderColor: colors.light.border,
    paddingVertical: 10,
    borderRadius: 8,
    alignItems: 'center',
  },
  btnRejectOrderText: {
    color: colors.light.textSecondary,
    fontSize: 12,
    fontWeight: '600',
  },
  btnApproveOrder: {
    flex: 2,
    backgroundColor: colors.light.primary,
    paddingVertical: 10,
    borderRadius: 8,
    alignItems: 'center',
  },
  btnApproveOrderText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '700',
  },
  btnChatCustomer: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: colors.light.surface,
    borderWidth: 1,
    borderColor: colors.light.border,
    paddingVertical: 10,
    borderRadius: 8,
  },
  btnChatCustomerText: {
    color: colors.light.primary,
    fontSize: 12,
    fontWeight: '600',
  },
  btnHandoverPhoto: {
    flex: 2,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: colors.light.primary,
    paddingVertical: 10,
    borderRadius: 8,
  },
  btnHandoverPhotoText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '700',
  },
  deviceFilterRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 12,
  },
  deviceFilterTab: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    backgroundColor: colors.light.surface,
    borderWidth: 1,
    borderColor: colors.light.border,
  },
  deviceFilterTabActive: {
    backgroundColor: colors.light.primary,
    borderColor: colors.light.primaryDark,
  },
  deviceFilterText: {
    color: colors.light.textSecondary,
    fontSize: 11,
    fontWeight: '500',
  },
  deviceFilterTextActive: {
    color: '#FFFFFF',
    fontWeight: '700',
  },
  deviceCard: {
    flexDirection: 'row',
    backgroundColor: colors.light.surface,
    borderRadius: 12,
    padding: 12,
    borderWidth: 1,
    borderColor: colors.light.border,
    marginBottom: 10,
    gap: 12,
  },
  deviceThumb: {
    width: 70,
    height: 70,
    borderRadius: 8,
    backgroundColor: colors.light.border,
  },
  deviceInfoCol: {
    flex: 1,
    justifyContent: 'center',
  },
  deviceTitleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  deviceName: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.light.textPrimary,
    flex: 1,
  },
  devicePrice: {
    fontSize: 12,
    color: colors.light.primary,
    fontWeight: '600',
    marginBottom: 8,
  },
  deviceStatusRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  statusPill: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  statusPillRented: {
    backgroundColor: '#FEF3C7',
  },
  statusPillRentedText: {
    color: colors.light.warning,
    fontSize: 10,
    fontWeight: '600',
  },
  statusPillAvailable: {
    backgroundColor: colors.light.primaryLight,
  },
  statusPillAvailableText: {
    color: colors.light.primary,
    fontSize: 10,
    fontWeight: '600',
  },
  switchCol: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  switchLabel: {
    fontSize: 10,
    color: colors.light.textSecondary,
  },
  shortcutGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  shortcutButton: {
    width: '48%',
    backgroundColor: colors.light.surface,
    borderRadius: 10,
    padding: 14,
    borderWidth: 1,
    borderColor: colors.light.border,
    alignItems: 'center',
    gap: 6,
  },
  shortcutButtonText: {
    color: colors.light.textPrimary,
    fontSize: 12,
    fontWeight: '600',
  },
  subTabBar: {
    flexDirection: 'row',
    backgroundColor: colors.light.background,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: colors.light.border,
    gap: 8,
  },
  subTabItem: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: colors.light.surface,
    borderWidth: 1,
    borderColor: colors.light.border,
  },
  subTabItemActive: {
    backgroundColor: colors.light.primary,
    borderColor: colors.light.primaryDark,
  },
  subTabText: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.light.textSecondary,
  },
  subTabTextActive: {
    color: '#FFFFFF',
    fontWeight: '700',
  },
});
