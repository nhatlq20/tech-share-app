import React, { useCallback, useEffect, useState } from 'react';
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
  Platform,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useDispatch, useSelector } from 'react-redux';
import { useFocusEffect } from '@react-navigation/native';
import { RootState } from '../../store';
import { updateUser, UserRole } from '../../store/slices/authSlice';
import { apiClient } from '../../config/api';
import { colors } from '../../theme/colors';
import { STRINGS } from '../../constants/strings';
import { pickAvatar } from '../../services/cloudinaryService';
import { EkycItem } from '../../types';
import { ekycService } from '../../services/ekycService';
import { EkycSubmitModal } from '../../components/user/EkycSubmitModal';

interface ProfileScreenProps {
  onLogout: () => void;
  onNavigateToLogin?: () => void;
  onNavigateToPostDevice?: () => void;
  onNavigateToMyDevices: () => void;
  onNavigateToWishlist?: () => void;
  onNavigateToOwnerDashboard?: () => void;
  onNavigateToAdminDashboard?: () => void;
}

export function ProfileScreen({
  onLogout,
  onNavigateToLogin,
  onNavigateToPostDevice,
  onNavigateToMyDevices,
  onNavigateToWishlist,
  onNavigateToOwnerDashboard,
  onNavigateToAdminDashboard,
}: ProfileScreenProps) {
  const dispatch = useDispatch();
  const user = useSelector((state: RootState) => state.auth.user);
  const token = useSelector((state: RootState) => state.auth.token);
  const [isEditing, setIsEditing] = useState(false);
  const [activeTab, setActiveTab] = useState('info' as 'info' | 'address');
  const [toastMsg, setToastMsg] = useState('');
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const [ekyc, setEkyc] = useState(null as EkycItem | null);
  const [showEkycModal, setShowEkycModal] = useState(false);
  const { width } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const topInset = Math.max(
    insets.top,
    Platform.OS === 'android' ? StatusBar.currentHeight || 24 : 20
  );
  const compact = width < 360;
  const isWide = width >= 768;

  const isEkycApproved = Boolean((user?.isVerified && ekyc?.status === 'approved') || (user?.role === 'admin' && user?.isVerified));
  const verificationPurpose = user?.role === 'renter' ? 'renter' : 'owner';

  // User info
  const [name, setName] = useState(user?.name || 'John Nguyen');
  const [email, setEmail] = useState(user?.email || 'an.creator@techshare.vn');
  const [phone, setPhone] = useState(user?.phone || '0988 123 456');
  const [bio, setBio] = useState('Tech Reviewer & Content Creator. Đam mê máy ảnh Sony & Apple Flagships.');
  const [role, setRole] = useState((user?.role || 'renter') as UserRole);

  // Address
  const [street, setStreet] = useState('');
  const [ward, setWard] = useState('');
  const [district, setDistrict] = useState('');
  const [city, setCity] = useState('');

  // Avatar
  const [avatarUri, setAvatarUri] = useState(
    user?.avatar ||
      "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=400&auto=format&fit=crop&q=80",
  );

  useEffect(() => {
    if (user) {
      const addressParts = (user.address || '').split(',').map((part) => part.trim()).filter(Boolean);
      setName(user.name || '');
      setEmail(user.email || '');
      setPhone(user.phone || '');
      setStreet(addressParts[0] || '');
      setWard(addressParts[1] || '');
      setDistrict(addressParts[2] || '');
      setCity(addressParts[3] || '');
      setAvatarUri(user.avatar || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=400&auto=format&fit=crop&q=80');
      setRole(user.role || 'renter');
    }
  }, [user]);

  useFocusEffect(
    useCallback(() => {
      let isMounted = true;

      const loadProfile = async () => {
        if (!token) return;

        try {
          const ekycData = await ekycService.getMyEkyc();
          if (isMounted) setEkyc(ekycData);
        } catch (error: unknown) {
          const status = (error as { response?: { status?: number } })?.response
            ?.status;
          if (isMounted && status === 401) {
            onLogout();
          } else {
            console.warn("Error fetching eKYC status:", error);
          }
        }
      };

      void loadProfile();

      return () => {
        isMounted = false;
      };
    }, [token, onLogout]),
  );

  const showToast = (msg: string) => {
    setToastMsg(msg);
    setTimeout(() => setToastMsg(""), 2500);
  };

  const hasAddress = Boolean(street?.trim() && ward?.trim() && district?.trim() && city?.trim());

  const handleEkycAction = () => {
    if (!hasAddress) {
      showToast(STRINGS.PROFILE.TOAST_ADDRESS_REQUIRED_FOR_EKYC);
      setActiveTab('address');
      return;
    }

    setShowEkycModal(true);
  };

  const handleSaveInfo = async () => {
    try {
      const response = await apiClient.patch(
        "/profile/me",
        { name, phone },
        { headers: { Authorization: `Bearer ${token}` } },
      );
      dispatch(updateUser(response.data.user));
      setIsEditing(false);
      showToast(STRINGS.PROFILE.TOAST_SAVE_INFO_SUCCESS);
    } catch (error) {
      showToast(STRINGS.PROFILE.TOAST_SAVE_INFO_ERROR);
    }
  };

  const handleSaveAddress = async () => {
    try {
      const response = await apiClient.patch(
        "/profile/me",
        { address: [street, ward, district, city].filter(Boolean).join(", ") },
        { headers: { Authorization: `Bearer ${token}` } },
      );
      dispatch(updateUser(response.data.user));
      showToast(STRINGS.PROFILE.TOAST_UPDATE_ADDRESS_SUCCESS);
    } catch (error) {
      showToast(STRINGS.PROFILE.TOAST_UPDATE_ADDRESS_ERROR);
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
      formData.append("avatar", {
        uri: avatar.uri,
        name: avatar.name,
        type: avatar.type,
      } as unknown as Blob);
      const response = await apiClient.post("/profile/me/avatar", formData, {
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "multipart/form-data",
        },
      });
      setAvatarUri(response.data.user.avatar);
      dispatch(updateUser(response.data.user));
      showToast(STRINGS.PROFILE.TOAST_AVATAR_SUCCESS);
    } catch (error: any) {
      showToast(
        error?.response?.data?.message || STRINGS.PROFILE.TOAST_AVATAR_ERROR,
      );
    } finally {
      setUploadingAvatar(false);
    }
  };

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor={colors.light.textPrimary} />

      {/* TOAST THÔNG BÁO */}
      {toastMsg ? (
        <View style={[styles.toastBanner, { top: 12 + insets.top }]}>
          <Ionicons name="checkmark-circle" size={16} color={colors.light.success} />
          <Text style={styles.toastText}>{toastMsg}</Text>
        </View>
      ) : null}

      <ScrollView
        contentContainerStyle={[
          styles.scrollContent,
          { maxWidth: isWide ? 720 : 560, paddingTop: topInset + 12 },
        ]}
        showsVerticalScrollIndicator={false}
      >
        {/* PROFILE HEADER */}
        <View style={styles.headerCard}>
          <View style={styles.topActionsRow}>
            <Text style={styles.headerTitle}>{STRINGS.PROFILE.TITLE}</Text>
            <TouchableOpacity style={styles.logoutBtn} onPress={onLogout}>
              <Ionicons name="log-out-outline" size={18} color={colors.light.danger} />
              <Text style={styles.logoutText}>{STRINGS.PROFILE.LOGOUT}</Text>
            </TouchableOpacity>
          </View>

          {/* AVATAR + TÊN */}
          <View
            style={[styles.userMainRow, compact && styles.userMainRowCompact]}
          >
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
                  <ActivityIndicator size="small" color={colors.light.white} />
                ) : (
                  <Ionicons name="camera" size={14} color={colors.light.white} />
                )}
              </TouchableOpacity>
            </View>

            <View style={styles.userInfoCol}>
              <View style={styles.nameBadgeRow}>
                <Text style={styles.userNameText}>{name}</Text>
                {isEkycApproved ? (
                  <Ionicons name="checkmark-circle" size={18} color={colors.light.primary} />
                ) : null}
              </View>
              <Text style={styles.userEmailText}>{email}</Text>
              <Text style={styles.userPhoneText}>{phone}</Text>

              <View style={[styles.rolePill, isEkycApproved && styles.rolePillVerified]}>
                <Text style={[styles.rolePillText, isEkycApproved && styles.rolePillTextVerified]}>
                  {role === 'admin' ? STRINGS.PROFILE.ROLE_ADMIN : role === 'owner' ? STRINGS.PROFILE.ROLE_OWNER : STRINGS.PROFILE.ROLE_RENTER}
                </Text>
                {isEkycApproved ? (
                  <Ionicons name="shield-checkmark" size={12} color={colors.light.primary} style={{ marginLeft: 4 }} />
                ) : null}
              </View>
            </View>
          </View>

          {/* TRUST SCORE */}
          <View style={styles.trustScoreBox}>
            <View style={styles.trustHeaderRow}>
              <View style={styles.trustTitleGroup}>
                <Ionicons
                  name="shield-checkmark"
                  size={16}
                  color={colors.light.warning}
                />
                <Text style={styles.trustScoreTitle}>
                  {STRINGS.PROFILE.TRUST_SCORE_TITLE}
                </Text>
              </View>
              <Text style={styles.trustScoreValue}>{user?.trustScore ?? 100}/100</Text>
            </View>
            <View style={styles.progressBarBg}>
              <View
                style={[
                  styles.progressBarFill,
                  { width: `${Math.min(100, Math.max(0, user?.trustScore ?? 100))}%` },
                ]}
              />
            </View>
            <Text style={styles.trustBenefit}>
              {(user?.trustScore ?? 100) >= 90
                ? STRINGS.PROFILE.TRUST_BENEFIT_GOLD
                : (user?.trustScore ?? 100) >= 70
                ? STRINGS.PROFILE.TRUST_BENEFIT_SILVER
                : STRINGS.PROFILE.TRUST_BENEFIT_STANDARD}
            </Text>
          </View>

          {/* QUICK STATS - HIỂN THỊ CÁC TRƯỜNG ĐIỂM UY TÍN TỪ DATABASE */}
          <View style={styles.statsRow}>
            <View style={styles.statItem}>
              <Text style={[styles.statNum, { color: colors.light.ratingStar }]}>
                {user?.rating !== undefined ? Number(user.rating).toFixed(1) : '5.0'} ★
              </Text>
              <Text style={styles.statLabel}>{STRINGS.PROFILE.STAT_DEVICE_RATING}</Text>
            </View>
            <View style={styles.statDivider} />
            <View style={styles.statItem}>
              <Text style={[styles.statNum, { color: colors.light.primary }]}>
                {user?.ownerRating !== undefined ? Number(user.ownerRating).toFixed(1) : '5.0'} ★
              </Text>
              <Text style={styles.statLabel}>{STRINGS.PROFILE.STAT_OWNER_RATING}</Text>
            </View>
            <View style={styles.statDivider} />
            <View style={styles.statItem}>
              <Text style={styles.statNum}>
                {user?.totalReviews ?? user?.totalReview ?? 0}
              </Text>
              <Text style={styles.statLabel}>{STRINGS.PROFILE.STAT_TOTAL_REVIEWS}</Text>
            </View>
          </View>

          <TouchableOpacity
            style={styles.listDeviceButton}
            onPress={onNavigateToPostDevice}
            activeOpacity={0.8}
          >
            <Ionicons name="add-circle-outline" size={19} color={colors.light.white} />
            <Text style={styles.listDeviceButtonText}>{STRINGS.PROFILE.LIST_DEVICE_BTN}</Text>
            <Ionicons name="arrow-forward" size={16} color={colors.light.white} />
          </TouchableOpacity>
        </View>

        {/* ĐỊNH DANH ĐIỆN TỬ (eKYC) */}
        <View style={styles.dashboardSection}>
          <Text style={styles.dashboardSectionTitle}>{STRINGS.PROFILE.IDENTITY_SECTION_TITLE}</Text>

          {isEkycApproved ? (
            <View style={styles.ekycSuccessCard}>
              <View style={styles.ekycSuccessIconWrap}>
                <Ionicons name="shield-checkmark" size={24} color={colors.light.primary} />
              </View>
              <View style={{ flex: 1 }}>
                <View style={styles.ekycSuccessTitleRow}>
                  <Text style={styles.ekycSuccessTitle}>
                    {verificationPurpose === 'renter' ? STRINGS.PROFILE.EKYC.VERIFIED_REAL_USER : STRINGS.PROFILE.EKYC.VERIFIED_OWNER_ID}
                  </Text>
                  <Ionicons name="checkmark-circle" size={16} color={colors.light.primary} />
                </View>
                <Text style={styles.ekycSuccessDesc}>
                  {verificationPurpose === 'renter'
                    ? STRINGS.PROFILE.EKYC.DESC_RENTER_VERIFIED
                    : STRINGS.PROFILE.EKYC.DESC_OWNER_VERIFIED}
                </Text>
                {ekyc?.idCardNumber ? (
                  <Text style={styles.ekycCardNumberText}>
                    {STRINGS.PROFILE.EKYC.ID_NUMBER_PREFIX}<Text style={{ fontWeight: '700' }}>{ekyc.idCardNumber.slice(0, 4)}****{ekyc.idCardNumber.slice(-4)}</Text>
                  </Text>
                ) : null}
              </View>
            </View>
          ) : ekyc?.status === 'pending' ? (
            <View style={styles.ekycPendingCard}>
              <View style={styles.ekycPendingIconWrap}>
                <Ionicons name="time" size={24} color={colors.light.warning} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.ekycPendingTitle}>{STRINGS.PROFILE.EKYC.PENDING_TITLE}</Text>
                <Text style={styles.ekycPendingDesc}>
                  {STRINGS.PROFILE.EKYC.PENDING_DESC}
                </Text>
                {ekyc?.idCardNumber ? (
                  <Text style={styles.ekycPendingCardNumber}>
                    {STRINGS.PROFILE.EKYC.ID_NUMBER_PREFIX}{ekyc.idCardNumber}
                  </Text>
                ) : null}
              </View>
            </View>
          ) : ekyc?.status === 'rejected' ? (
            <View style={styles.ekycRejectedCard}>
              <View style={styles.ekycRejectedIconWrap}>
                <Ionicons name="alert-circle" size={24} color={colors.light.error} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.ekycRejectedTitle}>{STRINGS.PROFILE.EKYC.REJECTED_TITLE}</Text>
                <Text style={styles.ekycRejectedDesc}>
                  {STRINGS.PROFILE.EKYC.REJECTED_REASON_PREFIX}{ekyc.rejectReason || STRINGS.PROFILE.EKYC.REJECTED_REASON_DEFAULT}{STRINGS.PROFILE.EKYC.REJECTED_HINT}
                </Text>
                <TouchableOpacity
                  style={styles.btnResubmitEkyc}
                  onPress={handleEkycAction}
                  activeOpacity={0.8}
                >
                  <Ionicons name="refresh-outline" size={15} color={colors.light.white} />
                  <Text style={styles.btnResubmitEkycText}>{STRINGS.PROFILE.EKYC.RESUBMIT_BTN}</Text>
                </TouchableOpacity>
              </View>
            </View>
          ) : (
            <TouchableOpacity
              style={styles.ekycActionCard}
              onPress={handleEkycAction}
              activeOpacity={0.85}
            >
              <View style={styles.ekycActionIconWrap}>
                <Ionicons name="id-card-outline" size={24} color={colors.light.primary} />
              </View>
              <View style={{ flex: 1 }}>
                <View style={styles.ekycActionHeaderRow}>
                  <Text style={styles.ekycActionTitle}>
                    {verificationPurpose === 'renter' ? STRINGS.PROFILE.EKYC.UNVERIFIED_RENTER_TITLE : STRINGS.PROFILE.EKYC.UNVERIFIED_OWNER_TITLE}
                  </Text>
                  <View style={styles.ekycBadgeNotVerified}>
                    <Text style={styles.ekycBadgeNotVerifiedText}>{STRINGS.PROFILE.EKYC.BADGE_UNVERIFIED}</Text>
                  </View>
                </View>
                <Text style={styles.ekycActionDesc}>
                  {verificationPurpose === 'renter'
                    ? STRINGS.PROFILE.EKYC.UNVERIFIED_RENTER_DESC
                    : STRINGS.PROFILE.EKYC.UNVERIFIED_OWNER_DESC}
                </Text>
                <View style={styles.ekycCtaRow}>
                  <Text style={styles.ekycCtaText}>{STRINGS.PROFILE.EKYC.TAP_TO_VERIFY}</Text>
                  <Ionicons name="arrow-forward" size={14} color={colors.light.primary} />
                </View>
              </View>
            </TouchableOpacity>
          )}
        </View>

        <View style={styles.dashboardSection}>
          <Text style={styles.dashboardSectionTitle}>{STRINGS.PROFILE.MY_ACCOUNT_SECTION_TITLE}</Text>
          <TouchableOpacity
            style={styles.dashboardShortcutCard}
            onPress={onNavigateToMyDevices}
            activeOpacity={0.8}
            accessibilityRole="button"
            accessibilityLabel={STRINGS.PROFILE.MY_DEVICES}
          >
            <View style={styles.dashboardIconBoxOwner}>
              <Ionicons name="cube-outline" size={20} color={colors.light.primary} />
            </View>
            <View style={styles.dashboardCardContent}>
              <Text style={styles.dashboardCardTitle}>{STRINGS.PROFILE.MY_DEVICES}</Text>
            </View>
            <Ionicons name="chevron-forward" size={18} color={colors.light.primary} />
          </TouchableOpacity>

          {onNavigateToWishlist && (
            <TouchableOpacity
              style={styles.dashboardShortcutCard}
              onPress={onNavigateToWishlist}
              activeOpacity={0.8}
              accessibilityRole="button"
              accessibilityLabel={STRINGS.PROFILE.WISHLIST}
            >
              <View style={[styles.dashboardIconBoxOwner, { backgroundColor: colors.light.dangerLight }]}>
                <Ionicons name="heart" size={20} color={colors.light.danger} />
              </View>
              <View style={styles.dashboardCardContent}>
                <Text style={styles.dashboardCardTitle}>{STRINGS.PROFILE.WISHLIST}</Text>
              </View>
              <Ionicons name="chevron-forward" size={18} color={colors.light.primary} />
            </TouchableOpacity>
          )}
        </View>

        {/* DEDICATED MANAGEMENT PORTALS */}
        {(role === "owner" || role === "admin") && (
          <View style={styles.dashboardSection}>
            <Text style={styles.dashboardSectionTitle}>{STRINGS.PROFILE.MANAGEMENT_PORTALS_TITLE}</Text>
            
            {role === 'owner' && onNavigateToOwnerDashboard && (
              <TouchableOpacity
                style={styles.dashboardShortcutCard}
                onPress={onNavigateToOwnerDashboard}
                activeOpacity={0.8}
              >
                <View style={styles.dashboardIconBoxOwner}>
                  <Ionicons
                    name="briefcase"
                    size={20}
                    color={colors.light.primary}
                  />
                </View>
                <View style={styles.dashboardCardContent}>
                  <View style={styles.dashboardCardTitleRow}>
                    <Text style={styles.dashboardCardTitle}>
                      {STRINGS.PROFILE.OWNER_DASHBOARD_TITLE}
                    </Text>
                    <Ionicons
                      name="chevron-forward"
                      size={16}
                      color={colors.light.primary}
                    />
                  </View>
                  <Text style={styles.dashboardCardDesc}>
                    {STRINGS.PROFILE.OWNER_DASHBOARD_DESC}
                  </Text>
                </View>
              </TouchableOpacity>
            )}

            {role === "admin" && onNavigateToAdminDashboard && (
              <TouchableOpacity
                style={[
                  styles.dashboardShortcutCard,
                  styles.dashboardShortcutCardAdmin,
                ]}
                onPress={onNavigateToAdminDashboard}
                activeOpacity={0.8}
              >
                <View style={styles.dashboardIconBoxAdmin}>
                  <Ionicons
                    name="shield-checkmark"
                    size={20}
                    color={colors.light.primary}
                  />
                </View>
                <View style={styles.dashboardCardContent}>
                  <View style={styles.dashboardCardTitleRow}>
                    <Text
                      style={[
                        styles.dashboardCardTitle,
                        { color: colors.light.primary },
                      ]}
                    >
                      {STRINGS.PROFILE.ADMIN_PORTAL_TITLE}
                    </Text>
                    <Ionicons
                      name="chevron-forward"
                      size={16}
                      color={colors.light.primary}
                    />
                  </View>
                  <Text style={styles.dashboardCardDesc}>
                    {STRINGS.PROFILE.ADMIN_PORTAL_DESC}
                  </Text>
                </View>
              </TouchableOpacity>
            )}
          </View>
        )}

        {/* CÁC TAB ĐIỀU HƯỚNG */}
        <View style={styles.tabsRow}>
          <TouchableOpacity
            style={[styles.tabBtn, activeTab === "info" && styles.tabBtnActive]}
            onPress={() => setActiveTab("info")}
          >
            <Ionicons
              name="person-outline"
              size={16}
              color={activeTab === "info" ? colors.light.primary : colors.light.textMuted}
            />
            <Text
              style={[
                styles.tabBtnText,
                activeTab === "info" && styles.tabBtnTextActive,
              ]}
            >
              {STRINGS.PROFILE.TAB_INFO}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[
              styles.tabBtn,
              activeTab === "address" && styles.tabBtnActive,
            ]}
            onPress={() => setActiveTab("address")}
          >
            <Ionicons
              name="location-outline"
              size={16}
              color={activeTab === "address" ? colors.light.primary : colors.light.textMuted}
            />
            <Text
              style={[
                styles.tabBtnText,
                activeTab === "address" && styles.tabBtnTextActive,
              ]}
            >
              {STRINGS.PROFILE.TAB_ADDRESS}
            </Text>
          </TouchableOpacity>

        </View>

        {/* TAB 1: PERSONAL INFO */}
        {activeTab === "info" && (
          <View style={styles.sectionCard}>
            <View style={styles.sectionHeaderRow}>
              <Text style={styles.sectionTitle}>{STRINGS.PROFILE.PERSONAL_INFO_TITLE}</Text>
              <TouchableOpacity
                style={styles.editBtn}
                onPress={() =>
                  isEditing ? handleSaveInfo() : setIsEditing(true)
                }
              >
                <Ionicons
                  name={isEditing ? "checkmark-circle" : "create-outline"}
                  size={16}
                  color={colors.light.primary}
                />
                <Text style={styles.editBtnText}>
                  {isEditing ? STRINGS.PROFILE.SAVE : STRINGS.PROFILE.EDIT}
                </Text>
              </TouchableOpacity>
            </View>

            <View style={styles.fieldGroup}>
              <Text style={styles.fieldLabel}>{STRINGS.PROFILE.FULL_NAME}</Text>
              <TextInput
                style={[
                  styles.fieldInput,
                  !isEditing && styles.fieldInputDisabled,
                ]}
                value={name}
                onChangeText={setName}
                editable={isEditing}
              />
            </View>

            <View style={styles.fieldGroup}>
              <Text style={styles.fieldLabel}>{STRINGS.PROFILE.EMAIL}</Text>
              <TextInput
                style={[
                  styles.fieldInput,
                  !isEditing && styles.fieldInputDisabled,
                ]}
                value={email}
                onChangeText={setEmail}
                editable={isEditing}
                keyboardType="email-address"
              />
            </View>

            <View style={styles.fieldGroup}>
              <Text style={styles.fieldLabel}>{STRINGS.PROFILE.PHONE_NUMBER}</Text>
              <TextInput
                style={[
                  styles.fieldInput,
                  !isEditing && styles.fieldInputDisabled,
                ]}
                value={phone}
                onChangeText={setPhone}
                editable={isEditing}
                keyboardType="phone-pad"
              />
            </View>

            <View style={styles.fieldGroup}>
              <Text style={styles.fieldLabel}>{STRINGS.PROFILE.BIO}</Text>
              <TextInput
                style={[
                  styles.fieldInput,
                  !isEditing && styles.fieldInputDisabled,
                  { height: 64 },
                ]}
                value={bio}
                onChangeText={setBio}
                editable={isEditing}
                multiline
              />
            </View>

            {isEditing && (
              <TouchableOpacity style={styles.saveBtn} onPress={handleSaveInfo}>
                <Text style={styles.saveBtnText}>{STRINGS.PROFILE.SAVE_CHANGES}</Text>
              </TouchableOpacity>
            )}
          </View>
        )}

        {/* TAB 2: DEFAULT DEVICE PICKUP ADDRESS */}
        {activeTab === "address" && (
          <View style={styles.sectionCard}>
            <View style={styles.sectionHeaderRow}>
              <Text style={styles.sectionTitle}>{STRINGS.PROFILE.PICKUP_ADDRESS_TITLE}</Text>
            </View>

            <View style={styles.fieldGroup}>
              <Text style={styles.fieldLabel}>{STRINGS.PROFILE.STREET_ADDRESS}</Text>
              <TextInput
                style={styles.fieldInput}
                value={street}
                onChangeText={setStreet}
                placeholder={STRINGS.PROFILE.PLACEHOLDER_STREET}
                placeholderTextColor={colors.light.textSecondary}
              />
            </View>

            <View style={styles.fieldGroup}>
              <Text style={styles.fieldLabel}>{STRINGS.PROFILE.WARD}</Text>
              <TextInput
                style={styles.fieldInput}
                value={ward}
                onChangeText={setWard}
                placeholder={STRINGS.PROFILE.PLACEHOLDER_WARD}
                placeholderTextColor={colors.light.textSecondary}
              />
            </View>

            <View style={styles.fieldGroup}>
              <Text style={styles.fieldLabel}>{STRINGS.PROFILE.DISTRICT}</Text>
              <TextInput
                style={styles.fieldInput}
                value={district}
                onChangeText={setDistrict}
                placeholder={STRINGS.PROFILE.PLACEHOLDER_DISTRICT}
                placeholderTextColor={colors.light.textSecondary}
              />
            </View>

            <View style={styles.fieldGroup}>
              <Text style={styles.fieldLabel}>{STRINGS.PROFILE.CITY}</Text>
              <TextInput
                style={styles.fieldInput}
                value={city}
                onChangeText={setCity}
                placeholder={STRINGS.PROFILE.PLACEHOLDER_CITY}
                placeholderTextColor={colors.light.textSecondary}
              />
            </View>

            <TouchableOpacity
              style={styles.saveBtn}
              onPress={handleSaveAddress}
            >
              <Text style={styles.saveBtnText}>{STRINGS.PROFILE.UPDATE_ADDRESS}</Text>
            </TouchableOpacity>
          </View>
        )}

      </ScrollView>

      {/* MODAL GỬI HỒ SƠ eKYC */}
      <EkycSubmitModal
        visible={showEkycModal}
        onClose={() => setShowEkycModal(false)}
        currentEkyc={ekyc}
        user={user}
        verificationPurpose={verificationPurpose}
        onSuccess={(updatedEkyc) => {
          setEkyc(updatedEkyc);
          showToast(STRINGS.PROFILE.TOAST_EKYC_SUBMIT_SUCCESS);
        }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.light.background,
  },
  scrollContent: {
    width: "100%",
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 30,
  },
  toastBanner: {
    position: "absolute",
    top: 10,
    left: 16,
    right: 16,
    backgroundColor: colors.light.successLight,
    borderWidth: 1,
    borderColor: colors.light.success,
    borderRadius: 8,
    padding: 10,
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    zIndex: 999,
  },
  toastText: {
    color: colors.light.success,
    fontSize: 13,
    fontWeight: "600",
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
    fontWeight: "700",
    color: colors.light.textSecondary,
    textTransform: "uppercase",
    letterSpacing: 0.5,
    marginLeft: 4,
    marginBottom: 2,
  },
  dashboardShortcutCard: {
    flexDirection: "row",
    alignItems: "center",
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
    alignItems: "center",
    justifyContent: "center",
  },
  dashboardIconBoxAdmin: {
    width: 42,
    height: 42,
    borderRadius: 10,
    backgroundColor: colors.light.primaryLight,
    alignItems: "center",
    justifyContent: "center",
  },
  dashboardCardContent: {
    flex: 1,
  },
  dashboardCardTitleRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 3,
  },
  dashboardCardTitle: {
    fontSize: 14,
    fontWeight: "700",
    color: colors.light.primary,
  },
  dashboardCardDesc: {
    fontSize: 12,
    color: colors.light.textSecondary,
    lineHeight: 16,
  },
  topActionsRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    flexWrap: "wrap",
    gap: 8,
    marginBottom: 14,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: colors.light.textPrimary,
  },
  logoutBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: colors.light.dangerLight,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8,
  },
  logoutText: {
    fontSize: 12,
    color: colors.light.error,
    fontWeight: "600",
  },
  userMainRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
    marginBottom: 16,
  },
  userMainRowCompact: {
    flexDirection: "column",
    alignItems: "flex-start",
  },
  avatarWrapper: {
    position: "relative",
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
    position: "absolute",
    bottom: 0,
    right: 0,
    backgroundColor: colors.light.primary,
    width: 24,
    height: 24,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  userInfoCol: {
    flex: 1,
  },
  nameBadgeRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  userNameText: {
    fontSize: 18,
    fontWeight: "700",
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
    alignSelf: "flex-start",
    marginTop: 6,
    borderWidth: 1,
    borderColor: colors.light.primary,
  },
  rolePillText: {
    color: colors.light.primary,
    fontSize: 11,
    fontWeight: "600",
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
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 6,
  },
  trustTitleGroup: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  trustScoreTitle: {
    fontSize: 12,
    fontWeight: "700",
    color: colors.light.textPrimary,
  },
  trustScoreValue: {
    fontSize: 14,
    fontWeight: "800",
    color: colors.light.warning,
  },
  progressBarBg: {
    height: 6,
    backgroundColor: colors.light.border,
    borderRadius: 3,
    overflow: "hidden",
    marginVertical: 4,
  },
  progressBarFill: {
    height: "100%",
    backgroundColor: colors.light.warning,
  },
  trustBenefit: {
    fontSize: 11,
    color: colors.light.textSecondary,
    marginTop: 2,
  },
  statsRow: {
    flexDirection: "row",
    backgroundColor: colors.light.surface,
    borderRadius: 12,
    paddingVertical: 10,
    borderWidth: 1,
    borderColor: colors.light.border,
  },
  listDeviceButton: {
    minHeight: 46,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    borderRadius: 12,
    backgroundColor: colors.light.primary,
    marginTop: 14,
  },
  listDeviceButtonText: {
    color: colors.light.white,
    fontSize: 13,
    fontWeight: "800",
  },
  statItem: {
    flex: 1,
    alignItems: "center",
  },
  statNum: {
    fontSize: 16,
    fontWeight: "800",
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
    flexDirection: "row",
    backgroundColor: colors.light.surface,
    borderRadius: 12,
    padding: 4,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: colors.light.border,
    gap: 4,
    flexWrap: "wrap",
  },
  tabBtn: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
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
    fontWeight: "600",
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
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 14,
  },
  sectionTitle: {
    fontSize: 15,
    fontWeight: "700",
    color: colors.light.textPrimary,
  },
  editBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  editBtnText: {
    fontSize: 13,
    color: colors.light.primary,
    fontWeight: "600",
  },
  fieldGroup: {
    marginBottom: 12,
  },
  fieldLabel: {
    fontSize: 12,
    color: colors.light.textSecondary,
    marginBottom: 6,
    fontWeight: "600",
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
    alignItems: "center",
    justifyContent: "center",
    marginTop: 10,
  },
  saveBtnText: {
    color: colors.light.white,
    fontSize: 13,
    fontWeight: "700",
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
    fontWeight: "600",
  },
  addressDisplayBox: {
    flexDirection: "row",
    alignItems: "center",
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
    fontWeight: "600",
  },
  addressGps: {
    color: colors.light.primary,
    fontSize: 11,
    marginTop: 2,
  },
  rolePillVerified: {
    borderColor: colors.light.primaryLight,
    backgroundColor: colors.light.primaryLight,
  },
  rolePillTextVerified: {
    color: colors.light.primary,
  },
  ekycSuccessCard: {
    flexDirection: 'row',
    gap: 12,
    backgroundColor: colors.light.successLight,
    borderWidth: 1,
    borderColor: colors.light.success,
    borderRadius: 14,
    padding: 14,
  },
  ekycSuccessIconWrap: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: colors.light.primaryLight,
    alignItems: "center",
    justifyContent: "center",
  },
  ekycSuccessTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 4,
  },
  ekycSuccessTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.light.success,
  },
  ekycSuccessDesc: {
    fontSize: 12,
    color: colors.light.success,
    lineHeight: 17,
  },
  ekycCardNumberText: {
    fontSize: 11,
    color: colors.light.success,
    marginTop: 6,
  },
  ekycPendingCard: {
    flexDirection: 'row',
    gap: 12,
    backgroundColor: colors.light.warningLight,
    borderWidth: 1,
    borderColor: colors.light.warning,
    borderRadius: 14,
    padding: 14,
  },
  ekycPendingIconWrap: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: colors.light.warningLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  ekycPendingTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.light.warning,
    marginBottom: 4,
  },
  ekycPendingDesc: {
    fontSize: 12,
    color: colors.light.warning,
    lineHeight: 17,
  },
  ekycPendingCardNumber: {
    fontSize: 11,
    fontWeight: '600',
    color: colors.light.warning,
    marginTop: 6,
  },
  ekycRejectedCard: {
    flexDirection: 'row',
    gap: 12,
    backgroundColor: colors.light.dangerLight,
    borderWidth: 1,
    borderColor: colors.light.error,
    borderRadius: 14,
    padding: 14,
  },
  ekycRejectedIconWrap: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: colors.light.dangerLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  ekycRejectedTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.light.error,
    marginBottom: 4,
  },
  ekycRejectedDesc: {
    fontSize: 12,
    color: colors.light.error,
    lineHeight: 17,
    marginBottom: 10,
  },
  btnResubmitEkyc: {
    backgroundColor: colors.light.error,
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
  },
  btnResubmitEkycText: {
    color: colors.light.white,
    fontSize: 12,
    fontWeight: '600',
  },
  ekycActionCard: {
    flexDirection: 'row',
    gap: 12,
    backgroundColor: colors.light.primaryLight,
    borderWidth: 1,
    borderColor: colors.light.borderDefault,
    borderRadius: 14,
    padding: 14,
  },
  ekycActionIconWrap: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: colors.light.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  ekycActionHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  ekycActionTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.light.primary,
  },
  ekycBadgeNotVerified: {
    backgroundColor: colors.light.warningLight,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
  },
  ekycBadgeNotVerifiedText: {
    fontSize: 10,
    fontWeight: '600',
    color: colors.light.warning,
  },
  ekycActionDesc: {
    fontSize: 12,
    color: colors.light.primaryDark,
    lineHeight: 17,
    marginBottom: 8,
  },
  ekycCtaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  ekycCtaText: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.light.primary,
  },
});
