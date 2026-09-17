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
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useDispatch, useSelector } from 'react-redux';
import { RootState } from '../../store';
import { updateUser } from '../../store/slices/authSlice';
import { apiClient } from '../../config/api';

interface ProfileScreenProps {
  onLogout: () => void;
  onNavigateToLogin: () => void;
  onNavigateToPostDevice: () => void;
}

export function ProfileScreen({ onLogout, onNavigateToPostDevice }: ProfileScreenProps) {
  const dispatch = useDispatch();
  const user = useSelector((state: RootState) => state.auth.user);
  const token = useSelector((state: RootState) => state.auth.token);
  const [isEditing, setIsEditing] = useState(false);
  const [activeTab, setActiveTab] = useState('info' as 'info' | 'address' | 'activity');
  const [toastMsg, setToastMsg] = useState('');
  const { width } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const compact = width < 360;
  const isWide = width >= 768;

  // User info
  const [name, setName] = useState(user?.name || 'John Nguyen');
  const [email, setEmail] = useState(user?.email || 'an.creator@techshare.vn');
  const [phone, setPhone] = useState(user?.phone || '+1 202 555 0147');
  const [bio, setBio] = useState('Tech reviewer & creator. Passionate about Sony cameras and premium Apple devices.');
  const [role, setRole] = useState((user?.role as 'admin' | 'owner' | 'rental') || 'rental');

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
    const avatars = [
      'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=400&auto=format&fit=crop&q=80',
      'https://images.unsplash.com/photo-1539571696357-5a69c17a67c6?w=400&auto=format&fit=crop&q=80',
      'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=400&auto=format&fit=crop&q=80',
    ];
    const next = (avatars.indexOf(avatarUri) + 1) % avatars.length;
    try {
      const response = await apiClient.patch(
        '/profile/me',
        { avatar: avatars[next] },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setAvatarUri(response.data.user.avatar);
      dispatch(updateUser(response.data.user));
      showToast('Profile photo updated!');
    } catch (error) {
      showToast('Unable to update profile photo.');
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
              <TouchableOpacity style={styles.cameraIconBtn} onPress={handleAvatarChange}>
                <Ionicons name="camera" size={14} color="#FFFFFF" />
              </TouchableOpacity>
            </View>

            <View style={styles.userInfoCol}>
              <View style={styles.nameBadgeRow}>
                <Text style={styles.userNameText}>{name}</Text>
                <Ionicons name="checkmark-circle" size={18} color="#10B981" />
              </View>
              <Text style={styles.userEmailText}>{email}</Text>
              <Text style={styles.userPhoneText}>{phone}</Text>

              <View style={styles.rolePill}>
                <Text style={styles.rolePillText}>
                  {role === 'admin' ? 'Admin' : role === 'owner' ? 'Owner' : 'Rental'}
                </Text>
              </View>
            </View>
          </View>

          {/* TRUST SCORE */}
          <View style={styles.trustScoreBox}>
            <View style={styles.trustHeaderRow}>
              <View style={styles.trustTitleGroup}>
                <Ionicons name="shield-checkmark" size={16} color="#F59E0B" />
                <Text style={styles.trustScoreTitle}>Trust Score</Text>
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
              <Text style={[styles.statNum, { color: '#F59E0B' }]}>4.9 ★</Text>
              <Text style={styles.statLabel}>32 reviews</Text>
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

        {/* NAV TABS */}
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
    width: '100%',
    backgroundColor: '#0B0F19',
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
    backgroundColor: 'rgba(16, 185, 129, 0.2)',
    borderWidth: 1,
    borderColor: '#10B981',
    borderRadius: 8,
    padding: 10,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    zIndex: 999,
  },
  toastText: {
    color: '#10B981',
    fontSize: 13,
    fontWeight: '600',
  },
  headerCard: {
    backgroundColor: '#1E293B',
    borderRadius: 20,
    padding: 18,
    borderWidth: 1,
    borderColor: '#334155',
    marginBottom: 16,
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
    color: '#FFFFFF',
  },
  logoutBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(239, 68, 68, 0.1)',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8,
  },
  logoutText: {
    fontSize: 12,
    color: '#EF4444',
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
    borderColor: '#2563EB',
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
    backgroundColor: '#2563EB',
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
    color: '#FFFFFF',
  },
  userEmailText: {
    fontSize: 12,
    color: '#94A3B8',
    marginTop: 2,
  },
  userPhoneText: {
    fontSize: 12,
    color: '#94A3B8',
  },
  rolePill: {
    backgroundColor: 'rgba(37, 99, 235, 0.2)',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    alignSelf: 'flex-start',
    marginTop: 6,
    borderWidth: 1,
    borderColor: '#2563EB',
  },
  rolePillText: {
    color: '#38BDF8',
    fontSize: 11,
    fontWeight: '600',
  },
  trustScoreBox: {
    backgroundColor: '#0F172A',
    borderRadius: 12,
    padding: 12,
    borderWidth: 1,
    borderColor: 'rgba(245, 158, 11, 0.3)',
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
    color: '#FFFFFF',
  },
  trustScoreValue: {
    fontSize: 14,
    fontWeight: '800',
    color: '#F59E0B',
  },
  progressBarBg: {
    height: 6,
    backgroundColor: '#334155',
    borderRadius: 3,
    overflow: 'hidden',
    marginVertical: 4,
  },
  progressBarFill: {
    height: '100%',
    backgroundColor: '#F59E0B',
  },
  trustBenefit: {
    fontSize: 11,
    color: '#CBD5E1',
    marginTop: 2,
  },
  statsRow: {
    flexDirection: 'row',
    backgroundColor: '#0F172A',
    borderRadius: 12,
    paddingVertical: 10,
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
    color: '#FFFFFF',
  },
  statLabel: {
    fontSize: 10,
    color: '#94A3B8',
    marginTop: 2,
  },
  statDivider: {
    width: 1,
    backgroundColor: '#334155',
  },
  tabsRow: {
    flexDirection: 'row',
    backgroundColor: '#1E293B',
    borderRadius: 12,
    padding: 4,
    marginBottom: 16,
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
    backgroundColor: '#0F172A',
    borderWidth: 1,
    borderColor: '#38BDF8',
  },
  tabBtnText: {
    fontSize: 12,
    color: '#94A3B8',
    fontWeight: '600',
  },
  tabBtnTextActive: {
    color: '#38BDF8',
  },
  sectionCard: {
    backgroundColor: '#1E293B',
    borderRadius: 20,
    padding: 18,
    borderWidth: 1,
    borderColor: '#334155',
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
    color: '#FFFFFF',
  },
  editBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  editBtnText: {
    fontSize: 13,
    color: '#38BDF8',
    fontWeight: '600',
  },
  fieldGroup: {
    marginBottom: 12,
  },
  fieldLabel: {
    fontSize: 12,
    color: '#94A3B8',
    marginBottom: 6,
    fontWeight: '600',
  },
  fieldInput: {
    backgroundColor: '#0F172A',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#334155',
    color: '#FFFFFF',
    fontSize: 13,
    paddingHorizontal: 12,
    height: 44,
  },
  fieldInputDisabled: {
    backgroundColor: '#162032',
    color: '#CBD5E1',
    borderColor: '#243248',
  },
  saveBtn: {
    backgroundColor: '#2563EB',
    height: 44,
    borderRadius: 10,
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
    backgroundColor: 'rgba(16, 185, 129, 0.15)',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  activeTagText: {
    color: '#10B981',
    fontSize: 11,
    fontWeight: '600',
  },
  addressDisplayBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: '#0F172A',
    borderRadius: 12,
    padding: 12,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: '#334155',
  },
  addressDisplayText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '600',
  },
  addressGps: {
    color: '#38BDF8',
    fontSize: 11,
    marginTop: 2,
  },
  activityCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: '#0F172A',
    borderRadius: 12,
    padding: 12,
    marginTop: 10,
    borderWidth: 1,
    borderColor: '#334155',
  },
  activityIconBox: {
    width: 44,
    height: 44,
    borderRadius: 10,
    backgroundColor: '#374151',
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
    color: '#10B981',
    fontWeight: '700',
  },
  activityPrice: {
    fontSize: 12,
    color: '#FFFFFF',
    fontWeight: '700',
  },
  activityName: {
    fontSize: 13,
    color: '#FFFFFF',
    fontWeight: '700',
    marginTop: 2,
  },
  activitySub: {
    fontSize: 11,
    color: '#94A3B8',
    marginTop: 2,
  },
});
