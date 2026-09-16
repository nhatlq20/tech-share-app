import React, { useState } from 'react';
import {
  StyleSheet,
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  Image,
  StatusBar,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';

interface ProfileScreenProps {
  onLogout: () => void;
  onNavigateToLogin: () => void;
}

export function ProfileScreen({ onLogout }: ProfileScreenProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [activeTab, setActiveTab] = useState('info' as 'info' | 'address' | 'activity');
  const [toastMsg, setToastMsg] = useState('');

  // Thông tin user
  const [name, setName] = useState('Nguyễn Văn An');
  const [email, setEmail] = useState('an.creator@techshare.vn');
  const [phone, setPhone] = useState('0988 123 456');
  const [bio, setBio] = useState('Tech Reviewer & Content Creator. Đam mê máy ảnh Sony & Apple Flagships.');
  const [role, setRole] = useState('both' as 'both' | 'renter' | 'owner');

  // Địa chỉ
  const [street, setStreet] = useState('Tòa nhà Landmark 81, 720A Điện Biên Phủ');
  const [ward, setWard] = useState('Phường 22');
  const [district, setDistrict] = useState('Quận Bình Thạnh');
  const [city, setCity] = useState('TP. Hồ Chí Minh');

  // Avatar
  const [avatarUri, setAvatarUri] = useState(
    'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=400&auto=format&fit=crop&q=80'
  );

  const showToast = (msg: string) => {
    setToastMsg(msg);
    setTimeout(() => setToastMsg(''), 2500);
  };

  const handleSaveInfo = () => {
    setIsEditing(false);
    showToast('Đã lưu thông tin hồ sơ thành công!');
  };

  const handleSaveAddress = () => {
    showToast('Đã cập nhật địa chỉ nhận máy mặc định!');
  };

  const handleAvatarChange = () => {
    const avatars = [
      'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=400&auto=format&fit=crop&q=80',
      'https://images.unsplash.com/photo-1539571696357-5a69c17a67c6?w=400&auto=format&fit=crop&q=80',
      'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=400&auto=format&fit=crop&q=80',
    ];
    const next = (avatars.indexOf(avatarUri) + 1) % avatars.length;
    setAvatarUri(avatars[next]);
    showToast('Đã đổi ảnh đại diện mới!');
  };

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#0F172A" />

      {/* TOAST THÔNG BÁO */}
      {toastMsg ? (
        <View style={styles.toastBanner}>
          <Ionicons name="checkmark-circle" size={16} color="#10B981" />
          <Text style={styles.toastText}>{toastMsg}</Text>
        </View>
      ) : null}

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* HEADER HỒ SƠ */}
        <View style={styles.headerCard}>
          <View style={styles.topActionsRow}>
            <Text style={styles.headerTitle}>Hồ sơ cá nhân</Text>
            <TouchableOpacity style={styles.logoutBtn} onPress={onLogout}>
              <Ionicons name="log-out-outline" size={18} color="#EF4444" />
              <Text style={styles.logoutText}>Đăng xuất</Text>
            </TouchableOpacity>
          </View>

          {/* AVATAR + TÊN */}
          <View style={styles.userMainRow}>
            <View style={styles.avatarWrapper}>
              <Image source={{ uri: avatarUri }} style={styles.avatarImg} />
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
                  {role === 'both' ? 'Creator & Chủ máy' : role === 'owner' ? 'Chủ máy' : 'Người thuê'}
                </Text>
              </View>
            </View>
          </View>

          {/* TRUST SCORE (ĐIỂM TÍN NHIỆM) */}
          <View style={styles.trustScoreBox}>
            <View style={styles.trustHeaderRow}>
              <View style={styles.trustTitleGroup}>
                <Ionicons name="shield-checkmark" size={16} color="#F59E0B" />
                <Text style={styles.trustScoreTitle}>Điểm Tín Nhiệm (Trust Score)</Text>
              </View>
              <Text style={styles.trustScoreValue}>98/100</Text>
            </View>
            <View style={styles.progressBarBg}>
              <View style={[styles.progressBarFill, { width: '98%' }]} />
            </View>
            <Text style={styles.trustBenefit}>⭐ Hạng Vàng: Miễn 20% tiền cọc khi thuê máy</Text>
          </View>

          {/* THỐNG KÊ NHANH */}
          <View style={styles.statsRow}>
            <View style={styles.statItem}>
              <Text style={styles.statNum}>18</Text>
              <Text style={styles.statLabel}>Đã thuê</Text>
            </View>
            <View style={styles.statDivider} />
            <View style={styles.statItem}>
              <Text style={styles.statNum}>6</Text>
              <Text style={styles.statLabel}>Cho thuê</Text>
            </View>
            <View style={styles.statDivider} />
            <View style={styles.statItem}>
              <Text style={[styles.statNum, { color: '#F59E0B' }]}>4.9 ★</Text>
              <Text style={styles.statLabel}>32 đánh giá</Text>
            </View>
          </View>
        </View>

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
              Thông tin
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
              Địa chỉ
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
              Hoạt động
            </Text>
          </TouchableOpacity>
        </View>

        {/* TAB 1: THÔNG TIN CÁ NHÂN */}
        {activeTab === 'info' && (
          <View style={styles.sectionCard}>
            <View style={styles.sectionHeaderRow}>
              <Text style={styles.sectionTitle}>Thông tin cá nhân</Text>
              <TouchableOpacity
                style={styles.editBtn}
                onPress={() => (isEditing ? handleSaveInfo() : setIsEditing(true))}
              >
                <Ionicons
                  name={isEditing ? 'checkmark-circle' : 'create-outline'}
                  size={16}
                  color="#38BDF8"
                />
                <Text style={styles.editBtnText}>{isEditing ? 'Lưu' : 'Chỉnh sửa'}</Text>
              </TouchableOpacity>
            </View>

            <View style={styles.fieldGroup}>
              <Text style={styles.fieldLabel}>Họ và tên</Text>
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
              <Text style={styles.fieldLabel}>Số điện thoại</Text>
              <TextInput
                style={[styles.fieldInput, !isEditing && styles.fieldInputDisabled]}
                value={phone}
                onChangeText={setPhone}
                editable={isEditing}
                keyboardType="phone-pad"
              />
            </View>

            <View style={styles.fieldGroup}>
              <Text style={styles.fieldLabel}>Giới thiệu (Bio)</Text>
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
                <Text style={styles.saveBtnText}>LƯU THAY ĐỔI</Text>
              </TouchableOpacity>
            )}
          </View>
        )}

        {/* TAB 2: ĐỊA CHỈ GIAO NHẬN */}
        {activeTab === 'address' && (
          <View style={styles.sectionCard}>
            <View style={styles.sectionHeaderRow}>
              <Text style={styles.sectionTitle}>Địa chỉ nhận máy mặc định</Text>
              <View style={styles.activeTag}>
                <Text style={styles.activeTagText}>Mặc định</Text>
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
              <Text style={styles.fieldLabel}>Số nhà, tên đường</Text>
              <TextInput style={styles.fieldInput} value={street} onChangeText={setStreet} />
            </View>

            <View style={styles.fieldGroup}>
              <Text style={styles.fieldLabel}>Phường / Xã</Text>
              <TextInput style={styles.fieldInput} value={ward} onChangeText={setWard} />
            </View>

            <View style={styles.fieldGroup}>
              <Text style={styles.fieldLabel}>Quận / Huyện</Text>
              <TextInput style={styles.fieldInput} value={district} onChangeText={setDistrict} />
            </View>

            <View style={styles.fieldGroup}>
              <Text style={styles.fieldLabel}>Tỉnh / Thành phố</Text>
              <TextInput style={styles.fieldInput} value={city} onChangeText={setCity} />
            </View>

            <TouchableOpacity style={styles.saveBtn} onPress={handleSaveAddress}>
              <Text style={styles.saveBtnText}>CẬP NHẬT ĐỊA CHỈ</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* TAB 3: HOẠT ĐỘNG & THIẾT BỊ GẦN ĐÂY */}
        {activeTab === 'activity' && (
          <View style={styles.sectionCard}>
            <Text style={styles.sectionTitle}>Đơn thuê & Thiết bị của tôi</Text>

            {/* Đơn 1 */}
            <View style={styles.activityCard}>
              <View style={styles.activityIconBox}>
                <Ionicons name="camera" size={24} color="#FFFFFF" />
              </View>
              <View style={{ flex: 1 }}>
                <View style={styles.activityStatusRow}>
                  <Text style={styles.activeStatusText}>Đang thuê • Còn 2 ngày</Text>
                  <Text style={styles.activityPrice}>450k/ngày</Text>
                </View>
                <Text style={styles.activityName}>Sony Alpha A7 Mark IV</Text>
                <Text style={styles.activitySub}>Chủ máy: Trần Hoàng Vũ • Miễn cọc</Text>
              </View>
            </View>

            {/* Đơn 2 */}
            <View style={styles.activityCard}>
              <View style={[styles.activityIconBox, { backgroundColor: '#1E3A8A' }]}>
                <Ionicons name="laptop" size={24} color="#FFFFFF" />
              </View>
              <View style={{ flex: 1 }}>
                <View style={styles.activityStatusRow}>
                  <Text style={[styles.activeStatusText, { color: '#38BDF8' }]}>
                    Máy của tôi • Có sẵn
                  </Text>
                  <Text style={styles.activityPrice}>650k/ngày</Text>
                </View>
                <Text style={styles.activityName}>MacBook Pro 16" M3 Max</Text>
                <Text style={styles.activitySub}>12 lượt thuê • Đánh giá 5.0 ★</Text>
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
    backgroundColor: '#0B0F19',
  },
  scrollContent: {
    padding: 16,
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
