import React, { useEffect, useState } from 'react';
import {
  StyleSheet,
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  Image,
  StatusBar,
  useWindowDimensions,
  ActivityIndicator,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useDispatch, useSelector } from 'react-redux';
import { RootState } from '../../store';
import { updateUser } from '../../store/slices/authSlice';
import { apiClient } from '../../config/api';
import { colors } from '../../theme/colors';
import { pickAvatar } from '../../services/cloudinaryService';

interface ProfileScreenProps {
  onLogout: () => void;
  onNavigateToLogin?: () => void;
  onNavigateToPostDevice?: () => void;
  onNavigateToMyDevices: () => void;
  onNavigateToOwnerDashboard?: () => void;
  onNavigateToAdminDashboard?: () => void;
}

export function ProfileScreen({
  onLogout,
  onNavigateToLogin,
  onNavigateToPostDevice,
  onNavigateToMyDevices,
  onNavigateToOwnerDashboard,
  onNavigateToAdminDashboard,
}: ProfileScreenProps) {
  const dispatch = useDispatch();
  const user = useSelector((state: RootState) => state.auth.user);
  const token = useSelector((state: RootState) => state.auth.token);
  const [isEditing, setIsEditing] = useState(false);
  const [activeTab, setActiveTab] = useState('info' as 'info' | 'address' | 'activity');
  const [toastMsg, setToastMsg] = useState('');
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const { width } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const compact = width < 360;
  const isWide = width >= 768;

  // User info
  const [name, setName] = useState(user?.name || 'John Nguyen');
  const [email, setEmail] = useState(user?.email || 'an.creator@techshare.vn');
  const [phone, setPhone] = useState(user?.phone || '0988 123 456');
  const [bio, setBio] = useState('Tech Reviewer & Content Creator. Đam mê máy ảnh Sony & Apple Flagships.');
  const [role, setRole] = useState((user?.role as 'admin' | 'owner' | 'rental' | 'renter') || 'rental');

  // Address
  const [street, setStreet] = useState('Landmark 81 Tower, 720A Dien Bien Phu');
  const [ward, setWard] = useState('Ward 22');
  const [district, setDistrict] = useState('Binh Thanh District');
  const [city, setCity] = useState('Ho Chi Minh City');

  // Avatar
  const [avatarUri, setAvatarUri] = useState(
    user?.avatar || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=400&auto=format&fit=crop&q=80'
  );

  useEffect(() => {
    if (user) {
      setName(user.name || '');
      setEmail(user.email || '');
      setPhone(user.phone || '');
      setStreet(user.address || '');
      setAvatarUri(user.avatar || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=400&auto=format&fit=crop&q=80');
      setRole((user.role as 'admin' | 'owner' | 'rental') || 'rental');
    }
  }, [user]);

  useEffect(() => {
    let isMounted = true;

    const loadProfile = async () => {
      if (!token) {
        return;
      }

      try {
        const response = await apiClient.get('/profile/me', {
          headers: { Authorization: `Bearer ${token}` },
        });

        if (isMounted && response.data?.user) {
          dispatch(updateUser(response.data.user));
        }
      } catch (error: any) {
        if (isMounted && error?.response?.status === 401) {
          onLogout();
        }
      }
    };

    loadProfile();

    return () => {
      isMounted = false;
    };
  }, [dispatch, token]);

  const showToast = (msg: string) => {
    setToastMsg(msg);
    setTimeout(() => setToastMsg(''), 2500);
  };

  const handleSaveInfo = async () => {
    try {
      const response = await apiClient.patch(
        '/profile/me',
        { name, phone },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      dispatch(updateUser(response.data.user));
      setIsEditing(false);
      showToast('Profile information saved successfully!');
    } catch (error) {
      showToast('Unable to save profile information.');
    }
  };

  const handleSaveAddress = async () => {
    try {
      const response = await apiClient.patch(
        '/profile/me',
        { address: [street, ward, district, city].filter(Boolean).join(', ') },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      dispatch(updateUser(response.data.user));
      showToast('Default delivery address updated!');
    } catch (error) {
      showToast('Unable to update delivery address.');
    }
  };

  const handleAvatarChange = async () => {
    try {
      setUploadingAvatar(true);
      const avatar = await pickAvatar();
      if (!avatar) {
        return;
      }

      const formData = new FormData();
      formData.append('avatar', {
        uri: avatar.uri,
        name: avatar.name,
        type: avatar.type,
      } as unknown as Blob);
      const response = await apiClient.post('/profile/me/avatar', formData, {
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'multipart/form-data',
        },
      });
      setAvatarUri(response.data.user.avatar);
      dispatch(updateUser(response.data.user));
      showToast('Profile photo updated!');
    } catch (error: any) {
      showToast(error?.response?.data?.message || 'Unable to update profile photo.');
    } finally {
      setUploadingAvatar(false);
    }
  };

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#0F172A" />

      {/* TOAST THÔNG BÁO */}
      {toastMsg ? (
        <View style={[styles.toastBanner, { top: 12 + insets.top }]}>
          <Ionicons name="checkmark-circle" size={16} color="#10B981" />
          <Text style={styles.toastText}>{toastMsg}</Text>
        </View>
      ) : null}

      <ScrollView
        contentContainerStyle={[styles.scrollContent, { maxWidth: isWide ? 720 : 560 }]}
        showsVerticalScrollIndicator={false}
      >
        {/* PROFILE HEADER */}
        <View style={styles.headerCard}>
          <View style={styles.topActionsRow}>
            <Text style={styles.headerTitle}>Personal profile</Text>
            <TouchableOpacity style={styles.logoutBtn} onPress={onLogout}>
              <Ionicons name="log-out-outline" size={18} color="#EF4444" />
              <Text style={styles.logoutText}>Log out</Text>
            </TouchableOpacity>
          </View>

          {/* AVATAR + TÊN */}
          <View style={[styles.userMainRow, compact && styles.userMainRowCompact]}>
            <View style={styles.avatarWrapper}>
              <Image
                source={{ uri: avatarUri }}
                style={[styles.avatarImg, compact && styles.avatarImgCompact]}
              />
              <TouchableOpacity
                style={styles.cameraIconBtn}
                onPress={handleAvatarChange}
                disabled={uploadingAvatar}
              >
                {uploadingAvatar ? (
                  <ActivityIndicator size="small" color="#FFFFFF" />
                ) : (
                  <Ionicons name="camera" size={14} color="#FFFFFF" />
                )}
              </TouchableOpacity>
            </View>

            <View style={styles.userInfoCol}>
              <View style={styles.nameBadgeRow}>
                <Text style={styles.userNameText}>{name}</Text>
                <Ionicons name="checkmark-circle" size={18} color={colors.light.primary} />
              </View>
              <Text style={styles.userEmailText}>{email}</Text>
              <Text style={styles.userPhoneText}>{phone}</Text>

              <View style={styles.rolePill}>
                <Text style={styles.rolePillText}>
                  {role === 'admin' ? 'Quản trị viên' : role === 'owner' ? 'Chủ máy đã xác thực' : 'Người thuê'}
                </Text>
              </View>
            </View>
          </View>

          {/* TRUST SCORE */}
          <View style={styles.trustScoreBox}>
            <View style={styles.trustHeaderRow}>
              <View style={styles.trustTitleGroup}>
                <Ionicons name="shield-checkmark" size={16} color={colors.light.warning} />
                <Text style={styles.trustScoreTitle}>Điểm Tín Nhiệm (Trust Score)</Text>
              </View>
              <Text style={styles.trustScoreValue}>98/100</Text>
            </View>
            <View style={styles.progressBarBg}>
              <View style={[styles.progressBarFill, { width: '98%' }]} />
            </View>
            <Text style={styles.trustBenefit}>⭐ Gold tier: 20% deposit discount on rentals</Text>
          </View>

          {/* QUICK STATS */}
          <View style={styles.statsRow}>
            <View style={styles.statItem}>
              <Text style={styles.statNum}>18</Text>
              <Text style={styles.statLabel}>Rented</Text>
            </View>
            <View style={styles.statDivider} />
            <View style={styles.statItem}>
              <Text style={styles.statNum}>6</Text>
              <Text style={styles.statLabel}>Listed</Text>
            </View>
            <View style={styles.statDivider} />
            <View style={styles.statItem}>
              <Text style={[styles.statNum, { color: colors.light.ratingStar }]}>4.9 ★</Text>
              <Text style={styles.statLabel}>32 đánh giá</Text>
            </View>
          </View>

          <TouchableOpacity
            style={styles.listDeviceButton}
            onPress={onNavigateToPostDevice}
            activeOpacity={0.8}
          >
            <Ionicons name="add-circle-outline" size={19} color="#FFFFFF" />
            <Text style={styles.listDeviceButtonText}>List Your Device</Text>
            <Ionicons name="arrow-forward" size={16} color="#FFFFFF" />
          </TouchableOpacity>
        </View>

        <View style={styles.dashboardSection}>
          <Text style={styles.dashboardSectionTitle}>My Account</Text>
          <TouchableOpacity
            style={styles.dashboardShortcutCard}
            onPress={onNavigateToMyDevices}
            activeOpacity={0.8}
            accessibilityRole="button"
            accessibilityLabel="My Devices"
          >
            <View style={styles.dashboardIconBoxOwner}>
              <Ionicons name="cube-outline" size={20} color={colors.light.primary} />
            </View>
            <View style={styles.dashboardCardContent}>
              <Text style={styles.dashboardCardTitle}>My Devices</Text>
            </View>
            <Ionicons name="chevron-forward" size={18} color={colors.light.primary} />
          </TouchableOpacity>
        </View>

        {/* CỔNG QUẢN LÝ CHUYÊN DỤNG (DASHBOARDS DỰA TRÊN ROLE) */}
        {(role === 'owner' || role === 'admin') && (
          <View style={styles.dashboardSection}>
            <Text style={styles.dashboardSectionTitle}>Cổng Quản lý Chuyên dụng</Text>
            
            {(role === 'owner' || role === 'admin') && onNavigateToOwnerDashboard && (
              <TouchableOpacity
                style={styles.dashboardShortcutCard}
                onPress={onNavigateToOwnerDashboard}
                activeOpacity={0.8}
              >
                <View style={styles.dashboardIconBoxOwner}>
                  <Ionicons name="briefcase" size={20} color={colors.light.primary} />
                </View>
                <View style={styles.dashboardCardContent}>
                  <View style={styles.dashboardCardTitleRow}>
                    <Text style={styles.dashboardCardTitle}>Bảng điều khiển Chủ máy</Text>
                    <Ionicons name="chevron-forward" size={16} color={colors.light.primary} />
                  </View>
                  <Text style={styles.dashboardCardDesc}>
                    Quản lý thiết bị, doanh thu & duyệt đơn thuê
                  </Text>
                </View>
              </TouchableOpacity>
            )}

            {role === 'admin' && onNavigateToAdminDashboard && (
              <TouchableOpacity
                style={[styles.dashboardShortcutCard, styles.dashboardShortcutCardAdmin]}
                onPress={onNavigateToAdminDashboard}
                activeOpacity={0.8}
              >
                <View style={styles.dashboardIconBoxAdmin}>
                  <Ionicons name="shield-checkmark" size={20} color={colors.light.primary} />
                </View>
                <View style={styles.dashboardCardContent}>
                  <View style={styles.dashboardCardTitleRow}>
                    <Text style={[styles.dashboardCardTitle, { color: colors.light.primary }]}>Cổng Quản trị Admin Portal</Text>
                    <Ionicons name="chevron-forward" size={16} color={colors.light.primary} />
                  </View>
                  <Text style={styles.dashboardCardDesc}>
                    Xử lý tranh chấp cọc, kiểm duyệt eKYC & giám sát hệ thống
                  </Text>
                </View>
              </TouchableOpacity>
            )}
          </View>
        )}

        {/* CÁC TAB ĐIỀU HƯỚNG */}
        <View style={styles.tabsRow}>
          <TouchableOpacity
            style={[styles.tabBtn, activeTab === 'info' && styles.tabBtnActive]}
            onPress={() => setActiveTab('info')}
          >
            <Ionicons
              name="person-outline"
              size={16}
              color={activeTab === 'info' ? '#38BDF8' : '#94A3B8'}
            />
            <Text style={[styles.tabBtnText, activeTab === 'info' && styles.tabBtnTextActive]}>
              Info
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.tabBtn, activeTab === 'address' && styles.tabBtnActive]}
            onPress={() => setActiveTab('address')}
          >
            <Ionicons
              name="location-outline"
              size={16}
              color={activeTab === 'address' ? '#38BDF8' : '#94A3B8'}
            />
            <Text style={[styles.tabBtnText, activeTab === 'address' && styles.tabBtnTextActive]}>
              Address
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.tabBtn, activeTab === 'activity' && styles.tabBtnActive]}
            onPress={() => setActiveTab('activity')}
          >
            <Ionicons
              name="time-outline"
              size={16}
              color={activeTab === 'activity' ? '#38BDF8' : '#94A3B8'}
            />
            <Text style={[styles.tabBtnText, activeTab === 'activity' && styles.tabBtnTextActive]}>
              Activity
            </Text>
          </TouchableOpacity>
        </View>

        {/* TAB 1: PERSONAL INFO */}
        {activeTab === 'info' && (
          <View style={styles.sectionCard}>
            <View style={styles.sectionHeaderRow}>
              <Text style={styles.sectionTitle}>Personal information</Text>
              <TouchableOpacity
                style={styles.editBtn}
                onPress={() => (isEditing ? handleSaveInfo() : setIsEditing(true))}
              >
                <Ionicons
                  name={isEditing ? 'checkmark-circle' : 'create-outline'}
                  size={16}
                  color="#38BDF8"
                />
                <Text style={styles.editBtnText}>{isEditing ? 'Save' : 'Edit'}</Text>
              </TouchableOpacity>
            </View>

            <View style={styles.fieldGroup}>
              <Text style={styles.fieldLabel}>Full name</Text>
              <TextInput
                style={[styles.fieldInput, !isEditing && styles.fieldInputDisabled]}
                value={name}
                onChangeText={setName}
                editable={isEditing}
              />
            </View>

            <View style={styles.fieldGroup}>
              <Text style={styles.fieldLabel}>Email</Text>
              <TextInput
                style={[styles.fieldInput, !isEditing && styles.fieldInputDisabled]}
                value={email}
                onChangeText={setEmail}
                editable={isEditing}
                keyboardType="email-address"
              />
            </View>

            <View style={styles.fieldGroup}>
              <Text style={styles.fieldLabel}>Phone number</Text>
              <TextInput
                style={[styles.fieldInput, !isEditing && styles.fieldInputDisabled]}
                value={phone}
                onChangeText={setPhone}
                editable={isEditing}
                keyboardType="phone-pad"
              />
            </View>

            <View style={styles.fieldGroup}>
              <Text style={styles.fieldLabel}>Bio</Text>
              <TextInput
                style={[styles.fieldInput, !isEditing && styles.fieldInputDisabled, { height: 64 }]}
                value={bio}
                onChangeText={setBio}
                editable={isEditing}
                multiline
              />
            </View>

            {isEditing && (
              <TouchableOpacity style={styles.saveBtn} onPress={handleSaveInfo}>
                <Text style={styles.saveBtnText}>SAVE CHANGES</Text>
              </TouchableOpacity>
            )}
          </View>
        )}

        {/* TAB 2: DEFAULT DEVICE PICKUP ADDRESS */}
        {activeTab === 'address' && (
          <View style={styles.sectionCard}>
            <View style={styles.sectionHeaderRow}>
              <Text style={styles.sectionTitle}>Default pickup address</Text>
              <View style={styles.activeTag}>
                <Text style={styles.activeTagText}>Default</Text>
              </View>
            </View>

            <View style={styles.addressDisplayBox}>
              <Ionicons name="map" size={24} color="#38BDF8" />
              <View style={{ flex: 1 }}>
                <Text style={styles.addressDisplayText}>
                  {street}, {ward}, {district}, {city}
                </Text>
                <Text style={styles.addressGps}>GPS: 10.7951° N, 106.7218° E</Text>
              </View>
            </View>

            <View style={styles.fieldGroup}>
              <Text style={styles.fieldLabel}>Street address</Text>
              <TextInput style={styles.fieldInput} value={street} onChangeText={setStreet} />
            </View>

            <View style={styles.fieldGroup}>
              <Text style={styles.fieldLabel}>Ward / Commune</Text>
              <TextInput style={styles.fieldInput} value={ward} onChangeText={setWard} />
            </View>

            <View style={styles.fieldGroup}>
              <Text style={styles.fieldLabel}>District</Text>
              <TextInput style={styles.fieldInput} value={district} onChangeText={setDistrict} />
            </View>

            <View style={styles.fieldGroup}>
              <Text style={styles.fieldLabel}>City / Province</Text>
              <TextInput style={styles.fieldInput} value={city} onChangeText={setCity} />
            </View>

            <TouchableOpacity style={styles.saveBtn} onPress={handleSaveAddress}>
              <Text style={styles.saveBtnText}>UPDATE ADDRESS</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* TAB 3: ACTIVITY & RECENT DEVICES */}
        {activeTab === 'activity' && (
          <View style={styles.sectionCard}>
            <Text style={styles.sectionTitle}>Rentals & my devices</Text>

            {/* Order 1 */}
            <View style={styles.activityCard}>
              <View style={styles.activityIconBox}>
                <Ionicons name="camera" size={24} color="#FFFFFF" />
              </View>
              <View style={{ flex: 1 }}>
                <View style={styles.activityStatusRow}>
                  <Text style={styles.activeStatusText}>Currently renting • 2 days left</Text>
                  <Text style={styles.activityPrice}>450k/day</Text>
                </View>
                <Text style={styles.activityName}>Sony Alpha A7 Mark IV</Text>
                <Text style={styles.activitySub}>Owner: Tran Hoang Vu • No deposit</Text>
              </View>
            </View>

            {/* Order 2 */}
            <View style={styles.activityCard}>
              <View style={[styles.activityIconBox, { backgroundColor: '#1E3A8A' }]}>
                <Ionicons name="laptop" size={24} color="#FFFFFF" />
              </View>
              <View style={{ flex: 1 }}>
                <View style={styles.activityStatusRow}>
                  <Text style={[styles.activeStatusText, { color: '#38BDF8' }]}>
                    My device • Available
                  </Text>
                  <Text style={styles.activityPrice}>650k/day</Text>
                </View>
                <Text style={styles.activityName}>MacBook Pro 16" M3 Max</Text>
                <Text style={styles.activitySub}>12 rentals • Rating 5.0 ★</Text>
              </View>
            </View>
          </View>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.light.background,
  },
  scrollContent: {
    width: '100%',
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 30,
  },
  toastBanner: {
    position: 'absolute',
    top: 10,
    left: 16,
    right: 16,
    backgroundColor: '#DCFCE7',
    borderWidth: 1,
    borderColor: colors.light.success,
    borderRadius: 8,
    padding: 10,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    zIndex: 999,
  },
  toastText: {
    color: colors.light.success,
    fontSize: 13,
    fontWeight: '600',
  },
  headerCard: {
    backgroundColor: colors.light.surface,
    borderRadius: 20,
    padding: 18,
    borderWidth: 1,
    borderColor: colors.light.border,
    marginBottom: 16,
  },
  dashboardSection: {
    marginBottom: 18,
    gap: 10,
  },
  dashboardSectionTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.light.textSecondary,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginLeft: 4,
    marginBottom: 2,
  },
  dashboardShortcutCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.light.surface,
    borderRadius: 14,
    padding: 14,
    borderWidth: 1,
    borderColor: colors.light.border,
    gap: 12,
  },
  dashboardShortcutCardAdmin: {
    borderColor: colors.light.border,
  },
  dashboardIconBoxOwner: {
    width: 42,
    height: 42,
    borderRadius: 10,
    backgroundColor: colors.light.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dashboardIconBoxAdmin: {
    width: 42,
    height: 42,
    borderRadius: 10,
    backgroundColor: colors.light.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dashboardCardContent: {
    flex: 1,
  },
  dashboardCardTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 3,
  },
  dashboardCardTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.light.primary,
  },
  dashboardCardDesc: {
    fontSize: 12,
    color: colors.light.textSecondary,
    lineHeight: 16,
  },
  topActionsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 14,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.light.textPrimary,
  },
  logoutBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#FEE2E2',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8,
  },
  logoutText: {
    fontSize: 12,
    color: colors.light.error,
    fontWeight: '600',
  },
  userMainRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    marginBottom: 16,
  },
  userMainRowCompact: {
    flexDirection: 'column',
    alignItems: 'flex-start',
  },
  avatarWrapper: {
    position: 'relative',
  },
  avatarImg: {
    width: 72,
    height: 72,
    borderRadius: 36,
    borderWidth: 2,
    borderColor: colors.light.primary,
  },
  avatarImgCompact: {
    width: 64,
    height: 64,
    borderRadius: 32,
  },
  cameraIconBtn: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    backgroundColor: colors.light.primary,
    width: 24,
    height: 24,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  userInfoCol: {
    flex: 1,
  },
  nameBadgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  userNameText: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.light.textPrimary,
  },
  userEmailText: {
    fontSize: 12,
    color: colors.light.textSecondary,
    marginTop: 2,
  },
  userPhoneText: {
    fontSize: 12,
    color: colors.light.textSecondary,
  },
  rolePill: {
    backgroundColor: colors.light.primaryLight,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    alignSelf: 'flex-start',
    marginTop: 6,
    borderWidth: 1,
    borderColor: colors.light.primary,
  },
  rolePillText: {
    color: colors.light.primary,
    fontSize: 11,
    fontWeight: '600',
  },
  trustScoreBox: {
    backgroundColor: colors.light.surface,
    borderRadius: 12,
    padding: 12,
    borderWidth: 1,
    borderColor: colors.light.border,
    marginBottom: 14,
  },
  trustHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  trustTitleGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  trustScoreTitle: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.light.textPrimary,
  },
  trustScoreValue: {
    fontSize: 14,
    fontWeight: '800',
    color: colors.light.warning,
  },
  progressBarBg: {
    height: 6,
    backgroundColor: colors.light.border,
    borderRadius: 3,
    overflow: 'hidden',
    marginVertical: 4,
  },
  progressBarFill: {
    height: '100%',
    backgroundColor: colors.light.warning,
  },
  trustBenefit: {
    fontSize: 11,
    color: colors.light.textSecondary,
    marginTop: 2,
  },
  statsRow: {
    flexDirection: 'row',
    backgroundColor: colors.light.surface,
    borderRadius: 12,
    paddingVertical: 10,
    borderWidth: 1,
    borderColor: colors.light.border,
  },
  listDeviceButton: {
    minHeight: 46,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    borderRadius: 12,
    backgroundColor: '#2563EB',
    marginTop: 14,
  },
  listDeviceButtonText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '800',
  },
  statItem: {
    flex: 1,
    alignItems: 'center',
  },
  statNum: {
    fontSize: 16,
    fontWeight: '800',
    color: colors.light.textPrimary,
  },
  statLabel: {
    fontSize: 10,
    color: colors.light.textSecondary,
    marginTop: 2,
  },
  statDivider: {
    width: 1,
    backgroundColor: colors.light.border,
  },
  tabsRow: {
    flexDirection: 'row',
    backgroundColor: colors.light.surface,
    borderRadius: 12,
    padding: 4,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: colors.light.border,
    gap: 4,
    flexWrap: 'wrap',
  },
  tabBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 9,
    borderRadius: 8,
  },
  tabBtnActive: {
    backgroundColor: colors.light.background,
    borderWidth: 1,
    borderColor: colors.light.primary,
  },
  tabBtnText: {
    fontSize: 12,
    color: colors.light.textSecondary,
    fontWeight: '600',
  },
  tabBtnTextActive: {
    color: colors.light.primary,
  },
  sectionCard: {
    backgroundColor: colors.light.surface,
    borderRadius: 20,
    padding: 18,
    borderWidth: 1,
    borderColor: colors.light.border,
  },
  sectionHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 14,
  },
  sectionTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: colors.light.textPrimary,
  },
  editBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  editBtnText: {
    fontSize: 13,
    color: colors.light.primary,
    fontWeight: '600',
  },
  fieldGroup: {
    marginBottom: 12,
  },
  fieldLabel: {
    fontSize: 12,
    color: colors.light.textSecondary,
    marginBottom: 6,
    fontWeight: '600',
  },
  fieldInput: {
    backgroundColor: colors.light.background,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: colors.light.border,
    color: colors.light.textPrimary,
    fontSize: 13,
    paddingHorizontal: 12,
    height: 44,
  },
  fieldInputDisabled: {
    backgroundColor: colors.light.surface,
    color: colors.light.textSecondary,
    borderColor: colors.light.border,
  },
  saveBtn: {
    backgroundColor: colors.light.primary,
    height: 44,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 10,
  },
  saveBtnText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '700',
  },
  activeTag: {
    backgroundColor: colors.light.primaryLight,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  activeTagText: {
    color: colors.light.primary,
    fontSize: 11,
    fontWeight: '600',
  },
  addressDisplayBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: colors.light.surface,
    borderRadius: 12,
    padding: 12,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: colors.light.border,
  },
  addressDisplayText: {
    color: colors.light.textPrimary,
    fontSize: 13,
    fontWeight: '600',
  },
  addressGps: {
    color: colors.light.primary,
    fontSize: 11,
    marginTop: 2,
  },
  activityCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: colors.light.surface,
    borderRadius: 12,
    padding: 12,
    marginTop: 10,
    borderWidth: 1,
    borderColor: colors.light.border,
  },
  activityIconBox: {
    width: 44,
    height: 44,
    borderRadius: 10,
    backgroundColor: colors.light.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  activityStatusRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  activeStatusText: {
    fontSize: 11,
    color: colors.light.success,
    fontWeight: '700',
  },
  activityPrice: {
    fontSize: 12,
    color: colors.light.primary,
    fontWeight: '700',
  },
  activityName: {
    fontSize: 13,
    color: colors.light.textPrimary,
    fontWeight: '700',
    marginTop: 2,
  },
  activitySub: {
    fontSize: 11,
    color: colors.light.textSecondary,
    marginTop: 2,
  },
});
