import React, { useState } from 'react';
import {
  StyleSheet,
  View,
  Text,
  TextInput,
  TouchableOpacity,
  Image,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { theme } from '../../../constants/theme';

export interface UserItem {
  id: string;
  name: string;
  email: string;
  phone: string;
  role: 'renter' | 'owner' | 'admin';
  trustScore: number;
  avatar: string;
  isVerified: boolean;
  isActive: boolean;
  rentalCount: number;
}

export const DEMO_USERS: UserItem[] = [
  {
    id: 'u1',
    name: 'Hoang Nam Creator',
    email: 'renter1@techshare.vn',
    phone: '0901234567',
    role: 'renter',
    trustScore: 98,
    avatar: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=400',
    isVerified: true,
    isActive: true,
    rentalCount: 12,
  },
  {
    id: 'u2',
    name: 'Minh Tuan Tech Review',
    email: 'owner1@techshare.vn',
    phone: '0912345678',
    role: 'owner',
    trustScore: 100,
    avatar: 'https://images.unsplash.com/photo-1570295999919-56ceb5ecca61?w=400',
    isVerified: true,
    isActive: true,
    rentalCount: 45,
  },
  {
    id: 'u3',
    name: 'Thanh Thao Vlogger',
    email: 'renter2@techshare.vn',
    phone: '0923456789',
    role: 'renter',
    trustScore: 88,
    avatar: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=400',
    isVerified: false,
    isActive: true,
    rentalCount: 4,
  },
  {
    id: 'u4',
    name: 'Quoc Bao Studio',
    email: 'owner2@techshare.vn',
    phone: '0934567890',
    role: 'owner',
    trustScore: 95,
    avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=400',
    isVerified: true,
    isActive: false,
    rentalCount: 28,
  },
  {
    id: 'u5',
    name: 'TechShare System Admin',
    email: 'admin@techshare.vn',
    phone: '0999888777',
    role: 'admin',
    trustScore: 100,
    avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=400',
    isVerified: true,
    isActive: true,
    rentalCount: 0,
  },
];

export function UsersTab() {
  const [usersList, setUsersList] = useState(DEMO_USERS as UserItem[]);
  const [userSearch, setUserSearch] = useState('');
  const [selectedRole, setSelectedRole] = useState('all' as 'all' | 'renter' | 'owner' | 'admin');

  const filteredUsers = usersList.filter((user: UserItem) => {
    const matchesSearch =
      userSearch === '' ||
      user.name.toLowerCase().includes(userSearch.toLowerCase()) ||
      user.email.toLowerCase().includes(userSearch.toLowerCase()) ||
      user.phone.includes(userSearch);
    const matchesRole = selectedRole === 'all' || user.role === selectedRole;
    return matchesSearch && matchesRole;
  });

  const handleToggleLockUser = (user: UserItem) => {
    const action = user.isActive ? 'khóa' : 'mở khóa';
    Alert.alert(`Xác nhận ${action} tài khoản`, `Bạn có chắc muốn ${action} tài khoản "${user.name}"?`, [
      { text: 'Hủy', style: 'cancel' },
      {
        text: user.isActive ? 'Khóa tài khoản' : 'Mở khóa',
        style: user.isActive ? 'destructive' : 'default',
        onPress: () => {
          setUsersList((prev: UserItem[]) =>
            prev.map((u: UserItem) => (u.id === user.id ? { ...u, isActive: !u.isActive } : u))
          );
          Alert.alert('Thành công', `Đã ${action} tài khoản thành công.`);
        },
      },
    ]);
  };

  return (
    <View style={styles.sectionBlock}>
      <View style={styles.sectionHeaderTitleRow}>
        <Ionicons name="people-outline" size={16} color={theme.colors.primary[600]} />
        <Text style={styles.sectionHeaderTitle}>
          Danh sách tài khoản ({filteredUsers.length})
        </Text>
      </View>

      {/* Ô tìm kiếm bo tròn mềm */}
      <View style={styles.searchBarContainer}>
        <Ionicons name="search" size={18} color={theme.textSecondary} />
        <TextInput
          style={styles.searchInput}
          placeholder="Tìm theo tên, email, số điện thoại..."
          placeholderTextColor={theme.textSecondary}
          value={userSearch}
          onChangeText={setUserSearch}
        />
        {userSearch !== '' && (
          <TouchableOpacity onPress={() => setUserSearch('')}>
            <Ionicons name="close-circle" size={18} color={theme.textSecondary} />
          </TouchableOpacity>
        )}
      </View>

      {/* Role Filter Chips */}
      <View style={styles.roleChipsRow}>
        {[
          { id: 'all', label: 'Tất cả' },
          { id: 'renter', label: 'Khách thuê' },
          { id: 'owner', label: 'Chủ máy' },
          { id: 'admin', label: 'Quản trị viên' },
        ].map(chip => {
          const isActive = selectedRole === chip.id;
          return (
            <TouchableOpacity
              key={chip.id}
              style={[styles.roleChip, isActive && styles.roleChipActive]}
              onPress={() => setSelectedRole(chip.id as any)}
              activeOpacity={0.8}
            >
              <Text style={[styles.roleChipText, isActive && styles.roleChipTextActive]}>
                {chip.label}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>

      {/* Danh sách người dùng */}
      {filteredUsers.length === 0 ? (
        <View style={styles.emptyCard}>
          <Ionicons name="people-outline" size={44} color={theme.textSecondary} />
          <Text style={styles.emptyTitle}>Không tìm thấy thành viên</Text>
          <Text style={styles.emptyDesc}>Thử tìm kiếm với từ khóa khác.</Text>
        </View>
      ) : (
        filteredUsers.map((u: UserItem) => {
          const roleLabel =
            u.role === 'admin' ? 'Admin' : u.role === 'owner' ? 'Chủ thiết bị' : 'Người thuê';
          const roleBadgeColor =
            u.role === 'admin'
              ? theme.colors.danger[50]
              : u.role === 'owner'
              ? theme.colors.warning[50]
              : theme.colors.primary[50];
          const roleTextColor =
            u.role === 'admin'
              ? theme.colors.danger[600]
              : u.role === 'owner'
              ? theme.colors.warning[600]
              : theme.colors.primary[600];

          return (
            <View key={u.id} style={styles.userCard}>
              <View style={styles.userCardHeader}>
                <Image source={{ uri: u.avatar }} style={styles.userAvatar} />
                <View style={styles.userMeta}>
                  <View style={styles.userNameRow}>
                    <Text style={styles.userName}>{u.name}</Text>
                    {u.isVerified && (
                      <Ionicons name="checkmark-circle" size={16} color={theme.colors.primary[600]} />
                    )}
                  </View>
                  <Text style={styles.userEmail}>{u.email}</Text>
                  <Text style={styles.userPhone}>SĐT: {u.phone}</Text>
                </View>

                <View style={[styles.roleBadge, { backgroundColor: roleBadgeColor }]}>
                  <Text style={[styles.roleBadgeText, { color: roleTextColor }]}>{roleLabel}</Text>
                </View>
              </View>

              {/* Stats Row */}
              <View style={styles.userStatsRow}>
                <View style={styles.statBox}>
                  <Text style={styles.statLabel}>Trust Score:</Text>
                  <Text style={styles.statValueTrust}>⭐ {u.trustScore}/100</Text>
                </View>
                <View style={styles.statBox}>
                  <Text style={styles.statLabel}>Đơn giao dịch:</Text>
                  <Text style={styles.statValue}>{u.rentalCount} lượt</Text>
                </View>
                <View style={styles.statBox}>
                  <Text style={styles.statLabel}>Trạng thái:</Text>
                  <Text
                    style={[
                      styles.statStatus,
                      { color: u.isActive ? theme.colors.success[600] : theme.colors.danger[600] },
                    ]}
                  >
                    {u.isActive ? 'Hoạt động' : 'Bị khóa'}
                  </Text>
                </View>
              </View>

              {/* Actions */}
              {u.role !== 'admin' && (
                <View style={styles.cardActions}>
                  <TouchableOpacity
                    style={[
                      styles.btnLock,
                      {
                        backgroundColor: u.isActive
                          ? theme.colors.danger[50]
                          : theme.colors.success[50],
                      },
                    ]}
                    onPress={() => handleToggleLockUser(u)}
                    activeOpacity={0.8}
                  >
                    <Ionicons
                      name={u.isActive ? 'lock-closed-outline' : 'lock-open-outline'}
                      size={14}
                      color={u.isActive ? theme.colors.danger[600] : theme.colors.success[600]}
                    />
                    <Text
                      style={[
                        styles.btnLockText,
                        {
                          color: u.isActive
                            ? theme.colors.danger[600]
                            : theme.colors.success[600],
                        },
                      ]}
                    >
                      {u.isActive ? 'Khóa tài khoản' : 'Mở khóa tài khoản'}
                    </Text>
                  </TouchableOpacity>
                </View>
              )}
            </View>
          );
        })
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
  roleChipsRow: {
    flexDirection: 'row',
    gap: 8,
    marginVertical: 10,
  },
  roleChip: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: theme.radii.full,
    backgroundColor: theme.colors.slate[100],
  },
  roleChipActive: {
    backgroundColor: theme.colors.primary[600],
  },
  roleChipText: {
    fontSize: 12,
    fontWeight: '600',
    color: theme.textSecondary,
  },
  roleChipTextActive: {
    color: theme.colors.white,
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
  userCard: {
    backgroundColor: theme.colors.white,
    borderRadius: theme.radii.lg,
    padding: theme.spacing.md,
    marginBottom: 10,
    ...theme.shadows.card,
  },
  userCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 10,
  },
  userAvatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: theme.colors.slate[100],
  },
  userMeta: {
    flex: 1,
    gap: 1,
  },
  userNameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  userName: {
    fontSize: 14,
    fontWeight: '700',
    color: theme.textPrimary,
  },
  userEmail: {
    fontSize: 11,
    color: theme.textSecondary,
  },
  userPhone: {
    fontSize: 11,
    color: theme.textSecondary,
  },
  roleBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: theme.radii.full,
  },
  roleBadgeText: {
    fontSize: 10,
    fontWeight: '700',
  },
  userStatsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    backgroundColor: theme.colors.slate[50],
    padding: 8,
    borderRadius: theme.radii.md,
    marginBottom: 8,
  },
  statBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  statLabel: {
    fontSize: 10,
    color: theme.textSecondary,
  },
  statValueTrust: {
    fontSize: 10,
    fontWeight: '700',
    color: theme.colors.warning[600],
  },
  statValue: {
    fontSize: 10,
    fontWeight: '600',
    color: theme.textPrimary,
  },
  statStatus: {
    fontSize: 10,
    fontWeight: '700',
  },
  cardActions: {
    borderTopWidth: 0.5,
    borderTopColor: theme.colors.slate[100],
    paddingTop: 8,
    flexDirection: 'row',
    justifyContent: 'flex-end',
  },
  btnLock: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: theme.radii.full,
  },
  btnLockText: {
    fontSize: 11,
    fontWeight: '600',
  },
});
