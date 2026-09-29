import React, { useState } from 'react';
import {
  StyleSheet,
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  Image,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { theme } from '../../../constants/theme';
import { AdminDeviceItem } from '../../../types';

interface CategoryOption {
  id: string;
  label: string;
  icon: keyof typeof Ionicons.glyphMap;
}

const DEVICE_CATEGORIES: CategoryOption[] = [
  { id: 'all', label: 'Tất cả', icon: 'apps-outline' },
  { id: 'camera', label: 'Máy ảnh', icon: 'camera-outline' },
  { id: 'laptop', label: 'Laptop', icon: 'laptop-outline' },
  { id: 'smartphone', label: 'Điện thoại', icon: 'phone-portrait-outline' },
  { id: 'drone', label: 'Drone & Flycam', icon: 'airplane-outline' },
  { id: 'gaming', label: 'Gaming', icon: 'game-controller-outline' },
];

interface DevicesTabProps {
  devices: AdminDeviceItem[];
  onDeleteDevice: (device: AdminDeviceItem) => void;
}

export function DevicesTab({ devices, onDeleteDevice }: DevicesTabProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');

  const filteredDevices = devices.filter((d: AdminDeviceItem) => {
    const matchesSearch =
      searchQuery === '' ||
      d.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      d.brand.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCategory = selectedCategory === 'all' || d.category === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  return (
    <View style={styles.sectionBlock}>
      <View style={styles.sectionHeaderTitleRow}>
        <Ionicons name="hardware-chip-outline" size={16} color={theme.colors.primary[600]} />
        <Text style={styles.sectionHeaderTitle}>
          Kiểm duyệt thiết bị ({filteredDevices.length})
        </Text>
      </View>

      {/* Ô tìm kiếm bo tròn mềm */}
      <View style={styles.searchBarContainer}>
        <Ionicons name="search" size={18} color={theme.textSecondary} />
        <TextInput
          style={styles.searchInput}
          placeholder="Tìm theo tên máy hoặc thương hiệu..."
          placeholderTextColor={theme.textSecondary}
          value={searchQuery}
          onChangeText={setSearchQuery}
        />
        {searchQuery !== '' && (
          <TouchableOpacity onPress={() => setSearchQuery('')}>
            <Ionicons name="close-circle" size={18} color={theme.textSecondary} />
          </TouchableOpacity>
        )}
      </View>

      {/* Thanh lọc danh mục thiết bị (Cuộn ngang) */}
      <View style={styles.categoryFilterContainer}>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          nestedScrollEnabled={true}
          contentContainerStyle={styles.categoryFilterScroll}
        >
          {DEVICE_CATEGORIES.map((cat) => {
            const isActive = selectedCategory === cat.id;
            return (
              <TouchableOpacity
                key={cat.id}
                style={[
                  styles.categoryChip,
                  isActive && styles.categoryChipActive,
                ]}
                onPress={() => setSelectedCategory(cat.id)}
                activeOpacity={0.8}
              >
                <Ionicons
                  name={cat.icon}
                  size={14}
                  color={isActive ? theme.colors.white : theme.textSecondary}
                />
                <Text
                  style={[
                    styles.categoryChipText,
                    isActive && styles.categoryChipTextActive,
                  ]}
                >
                  {cat.label}
                </Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      </View>

      {/* Danh sách thiết bị */}
      {filteredDevices.length === 0 ? (
        <View style={styles.emptyCard}>
          <Ionicons
            name="hardware-chip-outline"
            size={48}
            color={theme.textSecondary}
          />
          <Text style={styles.emptyTitle}>Không tìm thấy thiết bị</Text>
          <Text style={styles.emptyDesc}>Thử tìm kiếm với từ khóa khác.</Text>
        </View>
      ) : (
        filteredDevices.map((device: AdminDeviceItem) => (
          <View key={device._id} style={styles.deviceCard}>
            <Image
              source={{
                uri:
                  device.images?.[0] ||
                  'https://images.unsplash.com/photo-1516035069371-29a1b244cc32?w=800',
              }}
              style={styles.deviceImage}
            />
            <View style={styles.deviceInfoCol}>
              <View style={styles.deviceCategoryBadge}>
                <Text style={styles.deviceCategoryText}>{device.category.toUpperCase()}</Text>
              </View>
              <Text style={styles.deviceName} numberOfLines={2}>
                {device.name}
              </Text>
              <Text style={styles.deviceBrand}>
                Hãng: {device.brand} • Tình trạng: {device.condition}
              </Text>
              <Text style={styles.devicePrice}>
                {device.pricePerDay?.toLocaleString('vi-VN')} đ/ngày • Cọc:{' '}
                {device.depositAmount?.toLocaleString('vi-VN')} đ
              </Text>

              {/* Nút xóa mềm */}
              <TouchableOpacity
                style={styles.btnDeleteDevice}
                onPress={() => onDeleteDevice(device)}
                activeOpacity={0.8}
              >
                <Ionicons name="trash-outline" size={14} color={theme.colors.danger[600]} />
                <Text style={styles.btnDeleteDeviceText}>Gỡ / Xóa máy vi phạm</Text>
              </TouchableOpacity>
            </View>
          </View>
        ))
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  sectionBlock: {
    marginBottom: 4,
  },
  sectionHeaderTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: theme.spacing.sm,
  },
  sectionHeaderTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: theme.textPrimary,
  },
  searchBarContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.colors.white,
    borderRadius: theme.radii.full,
    paddingHorizontal: 16,
    height: 44,
    marginBottom: theme.spacing.sm,
    gap: 8,
    ...theme.shadows.subtle,
  },
  searchInput: {
    flex: 1,
    fontSize: 13,
    color: theme.textPrimary,
  },
  categoryFilterContainer: {
    marginBottom: theme.spacing.md,
  },
  categoryFilterScroll: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  categoryChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: theme.radii.full,
    backgroundColor: theme.colors.white,
    ...theme.shadows.subtle,
  },
  categoryChipActive: {
    backgroundColor: theme.colors.primary[600],
    ...theme.shadows.card,
  },
  categoryChipText: {
    color: theme.textSecondary,
    fontSize: 11,
    fontWeight: '500',
  },
  categoryChipTextActive: {
    color: theme.colors.white,
    fontWeight: '600',
  },
  emptyCard: {
    backgroundColor: theme.colors.white,
    borderRadius: theme.radii.lg,
    padding: theme.spacing.xl,
    alignItems: 'center',
    justifyContent: 'center',
    ...theme.shadows.card,
  },
  emptyTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: theme.textPrimary,
    marginTop: 12,
    marginBottom: 4,
  },
  emptyDesc: {
    fontSize: 12,
    color: theme.textSecondary,
    textAlign: 'center',
  },
  deviceCard: {
    flexDirection: 'row',
    backgroundColor: theme.colors.white,
    borderRadius: theme.radii.lg,
    padding: theme.spacing.md,
    marginBottom: theme.spacing.md,
    gap: 12,
    ...theme.shadows.card,
  },
  deviceImage: {
    width: 84,
    height: 84,
    borderRadius: theme.radii.md,
    backgroundColor: theme.colors.slate[100],
  },
  deviceInfoCol: {
    flex: 1,
  },
  deviceCategoryBadge: {
    backgroundColor: theme.colors.primary[50],
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: theme.radii.full,
    alignSelf: 'flex-start',
    marginBottom: 4,
  },
  deviceCategoryText: {
    fontSize: 9,
    fontWeight: '700',
    color: theme.colors.primary[600],
  },
  deviceName: {
    fontSize: 13,
    fontWeight: '700',
    color: theme.textPrimary,
    marginBottom: 2,
  },
  deviceBrand: {
    fontSize: 11,
    color: theme.textSecondary,
    marginBottom: 2,
  },
  devicePrice: {
    fontSize: 11,
    fontWeight: '600',
    color: theme.colors.primary[600],
    marginBottom: 8,
  },
  btnDeleteDevice: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: theme.colors.danger[50],
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: theme.radii.full,
    alignSelf: 'flex-start',
  },
  btnDeleteDeviceText: {
    color: theme.colors.danger[600],
    fontSize: 11,
    fontWeight: '600',
  },
});
