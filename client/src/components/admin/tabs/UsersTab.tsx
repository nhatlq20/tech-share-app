import React, { useCallback, useEffect, useState } from 'react';
import {
  StyleSheet,
  View,
  Text,
  TextInput,
  TouchableOpacity,
  Image,
  Alert,
  ActivityIndicator,
  Modal,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSelector } from 'react-redux';
import type { RootState } from '../../../store';
import { theme } from '../../../constants/theme';
import { adminService } from '../../../services/adminService';
import type { AdminUser } from '../../../services/adminService';

type UserItem = AdminUser;
type UserRoleFilter = 'all' | 'renter' | 'owner' | 'admin';

export function UsersTab() {
  const token = useSelector((state: RootState) => state.auth.token);
  const [usersList, setUsersList] = useState([] as UserItem[]);
  const [userSearch, setUserSearch] = useState('');
  const [selectedRole, setSelectedRole] = useState('all' as UserRoleFilter);
  const [loadingUsers, setLoadingUsers] = useState(true);
  const [usersError, setUsersError] = useState('');
  const [lockingUser, setLockingUser] = useState(null as UserItem | null);
  const [lockReason, setLockReason] = useState('');

  const loadUsers = useCallback(async () => {
    if (!token) {
      setUsersError('Phiên đăng nhập không hợp lệ. Vui lòng đăng nhập lại.');
      setLoadingUsers(false);
      return;
    }

    setLoadingUsers(true);
    setUsersError('');
    try {
      const data = await adminService.getUsers(token);
      setUsersList(data);
    } catch (error) {
      console.warn('Failed to load admin users:', error);
      const responseMessage =
        typeof error === 'object' &&
        error !== null &&
        'response' in error &&
        typeof error.response === 'object' &&
        error.response !== null &&
        'data' in error.response &&
        typeof error.response.data === 'object' &&
        error.response.data !== null &&
        'message' in error.response.data &&
        typeof error.response.data.message === 'string'
          ? error.response.data.message
          : '';
      const message = responseMessage || (error instanceof Error ? error.message : '');
      setUsersError(message || 'Không thể tải danh sách người dùng. Vui lòng thử lại.');
    } finally {
      setLoadingUsers(false);
    }
  }, [token]);

  useEffect(() => {
    void loadUsers();
  }, [loadUsers]);

  const filteredUsers = usersList.filter((user: UserItem) => {
    const matchesSearch =
      userSearch === '' ||
      user.name.toLowerCase().includes(userSearch.toLowerCase()) ||
      user.email.toLowerCase().includes(userSearch.toLowerCase()) ||
      user.phone.includes(userSearch);
    const matchesRole = selectedRole === 'all' || user.role === selectedRole;
    return matchesSearch && matchesRole;
  });

  const confirmLockUser = async () => {
    const reason = lockReason.trim();
    if (!lockingUser || !reason) {
      Alert.alert('Thiếu lý do', 'Vui lòng nhập lý do khóa tài khoản.');
      return;
    }
    if (!token) {
      Alert.alert('Lỗi', 'Phiên đăng nhập không hợp lệ. Vui lòng đăng nhập lại.');
      return;
    }

    try {
      await adminService.toggleUserStatus(lockingUser.id, false, token, reason);
      setUsersList((prev: UserItem[]) =>
        prev.map((user: UserItem) =>
          user.id === lockingUser.id ? { ...user, isActive: false, lockReason: reason } : user
        )
      );
      setLockingUser(null);
      setLockReason('');
      Alert.alert('Thành công', 'Đã khóa tài khoản và lưu lý do.');
    } catch (error) {
      console.warn('Lock user failed:', error);
      Alert.alert('Lỗi', 'Không thể khóa tài khoản. Vui lòng thử lại.');
    }
  };

  const handleToggleLockUser = (user: UserItem) => {
    if (user.isActive) {
      setLockReason('');
      setLockingUser(user);
      return;
    }

    Alert.alert('Xác nhận mở khóa tài khoản', `Bạn có chắc muốn mở khóa tài khoản "${user.name}"?`, [
      { text: 'Hủy', style: 'cancel' },
      {
        text: 'Mở khóa',
        onPress: async () => {
          try {
            if (!token) {
              throw new Error('Phiên đăng nhập không hợp lệ. Vui lòng đăng nhập lại.');
            }
            await adminService.toggleUserStatus(user.id, true, token);
            setUsersList((prev: UserItem[]) =>
              prev.map((item: UserItem) =>
                item.id === user.id ? { ...item, isActive: true, lockReason: '' } : item
              )
            );
            Alert.alert('Thành công', 'Đã mở khóa tài khoản thành công.');
          } catch (error) {
            console.warn('Unlock user failed:', error);
            Alert.alert('Lỗi', 'Không thể mở khóa tài khoản. Vui lòng thử lại.');
          }
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
              onPress={() => setSelectedRole(chip.id as UserRoleFilter)}
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
      {loadingUsers ? (
        <View style={styles.loadingCard}>
          <ActivityIndicator size="small" color={theme.colors.primary[600]} />
          <Text style={styles.loadingText}>Đang tải dữ liệu người dùng...</Text>
        </View>
      ) : usersError ? (
        <View style={styles.emptyCard}>
          <Ionicons name="cloud-offline-outline" size={44} color={theme.colors.danger[600]} />
          <Text style={styles.emptyTitle}>Không tải được dữ liệu</Text>
          <Text style={styles.emptyDesc}>{usersError}</Text>
          <TouchableOpacity style={styles.retryButton} onPress={() => void loadUsers()}>
            <Text style={styles.retryButtonText}>Thử lại</Text>
          </TouchableOpacity>
        </View>
      ) : filteredUsers.length === 0 ? (
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
              {!u.isActive && u.lockReason ? (
                <Text style={styles.lockReasonText}>Lý do khóa: {u.lockReason}</Text>
              ) : null}

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
      <Modal
        visible={Boolean(lockingUser)}
        transparent
        animationType="fade"
        onRequestClose={() => setLockingUser(null)}
      >
        <View style={styles.modalBackdrop}>
          <View style={styles.lockModal}>
            <Text style={styles.lockModalTitle}>Khóa tài khoản</Text>
            <Text style={styles.lockModalDescription}>
              Nhập lý do khóa tài khoản của {lockingUser?.name || 'người dùng'}.
            </Text>
            <TextInput
              style={styles.lockReasonInput}
              value={lockReason}
              onChangeText={setLockReason}
              placeholder="Nhập lý do..."
              placeholderTextColor={theme.textSecondary}
              multiline
              textAlignVertical="top"
              maxLength={500}
            />
            <View style={styles.lockModalActions}>
              <TouchableOpacity
                style={[styles.lockModalButton, styles.lockModalCancel]}
                onPress={() => setLockingUser(null)}
              >
                <Text style={styles.lockModalCancelText}>Hủy</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.lockModalButton, styles.lockModalConfirm]}
                onPress={() => void confirmLockUser()}
              >
                <Text style={styles.lockModalConfirmText}>Khóa tài khoản</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
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
  loadingCard: {
    backgroundColor: theme.colors.white,
    borderRadius: theme.radii.lg,
    padding: theme.spacing.xl,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: 10,
    ...theme.shadows.card,
  },
  loadingText: {
    fontSize: 13,
    color: theme.textSecondary,
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
  retryButton: {
    marginTop: 14,
    paddingHorizontal: 18,
    paddingVertical: 8,
    borderRadius: theme.radii.full,
    backgroundColor: theme.colors.primary[600],
  },
  retryButtonText: {
    fontSize: 12,
    fontWeight: '700',
    color: theme.colors.white,
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
  lockReasonText: {
    marginBottom: 8,
    fontSize: 11,
    lineHeight: 16,
    color: theme.colors.danger[600],
  },
  modalBackdrop: {
    flex: 1,
    justifyContent: 'center',
    padding: 24,
    backgroundColor: 'rgba(15, 23, 42, 0.55)',
  },
  lockModal: {
    backgroundColor: theme.colors.white,
    borderRadius: theme.radii.lg,
    padding: 20,
    ...theme.shadows.card,
  },
  lockModalTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: theme.textPrimary,
  },
  lockModalDescription: {
    marginTop: 8,
    fontSize: 13,
    lineHeight: 19,
    color: theme.textSecondary,
  },
  lockReasonInput: {
    minHeight: 110,
    marginTop: 16,
    padding: 12,
    borderWidth: 1,
    borderColor: theme.colors.slate[200],
    borderRadius: theme.radii.md,
    fontSize: 14,
    color: theme.textPrimary,
  },
  lockModalActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 10,
    marginTop: 16,
  },
  lockModalButton: {
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: theme.radii.md,
  },
  lockModalCancel: {
    backgroundColor: theme.colors.slate[100],
  },
  lockModalConfirm: {
    backgroundColor: theme.colors.danger[600],
  },
  lockModalCancelText: {
    fontSize: 13,
    fontWeight: '600',
    color: theme.textPrimary,
  },
  lockModalConfirmText: {
    fontSize: 13,
    fontWeight: '700',
    color: theme.colors.white,
  },
});
