import React, { useState } from 'react';
import {
  StyleSheet,
  View,
  Text,
  Modal,
  TouchableOpacity,
  ScrollView,
  Image,
  TextInput,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../../theme/colors';
import { EkycItem } from '../../types';
import { adminService } from '../../services/adminService';

interface EkycReviewModalProps {
  visible: boolean;
  ekyc: EkycItem | null;
  onClose: () => void;
  onApproved: (requestId: string) => void;
  onRejected: (requestId: string, reason: string) => void;
}

export function EkycReviewModal({
  visible,
  ekyc,
  onClose,
  onApproved,
  onRejected,
}: EkycReviewModalProps) {
  const [rejecting, setRejecting] = useState(false);
  const [rejectReason, setRejectReason] = useState('');
  const [loading, setLoading] = useState(false);

  if (!ekyc) return null;

  const handleApprove = async () => {
    Alert.alert(
      ekyc.verificationPurpose === 'renter' ? 'Xác nhận danh tính người dùng' : 'Xác nhận cấp Tích xanh',
      ekyc.verificationPurpose === 'renter'
        ? `Phê duyệt hồ sơ CCCD của ${ekyc.userId?.name || 'người dùng'} để bật quyền thuê thiết bị?`
        : `Phê duyệt hồ sơ CCCD của ${ekyc.userId?.name || 'người dùng'} và cấp Tích xanh uy tín ngay bây giờ?`,
      [
        { text: 'Hủy', style: 'cancel' },
        {
          text: 'Phê duyệt',
          onPress: async () => {
            setLoading(true);
            try {
              const res = await adminService.approveEkyc(ekyc._id);
              if (res && res.success) {
                Alert.alert(
                  'Thành công! 🎉',
                  ekyc.verificationPurpose === 'renter'
                    ? 'Đã xác thực danh tính. Người dùng có thể thuê thiết bị.'
                    : 'Đã cấp Tích xanh uy tín cho người dùng.'
                );
                onApproved(ekyc._id);
                onClose();
              }
            } catch (err: any) {
              Alert.alert('Lỗi', err.message || 'Không thể phê duyệt eKYC.');
            } finally {
              setLoading(false);
            }
          },
        },
      ]
    );
  };

  const handleReject = async () => {
    if (!rejectReason.trim()) {
      Alert.alert('Chưa có lý do', 'Vui lòng nhập lý do từ chối để thông báo cho người dùng.');
      return;
    }

    setLoading(true);
    try {
      const res = await adminService.rejectEkyc(ekyc._id, rejectReason.trim());
      if (res && res.success) {
        Alert.alert('Đã từ chối', 'Đã từ chối hồ sơ và gửi thông báo cho người dùng.');
        onRejected(ekyc._id, rejectReason.trim());
        setRejecting(false);
        setRejectReason('');
        onClose();
      }
    } catch (err: any) {
      Alert.alert('Lỗi', err.message || 'Không thể từ chối eKYC.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <View style={styles.modalOverlay}>
        <View style={styles.modalContainer}>
          {/* Header */}
          <View style={styles.modalHeader}>
            <View style={styles.modalTitleRow}>
              <View style={styles.cardIconWrapper}>
                <Ionicons name="id-card-outline" size={20} color={colors.light.primary} />
              </View>
              <View>
                <Text style={styles.modalTitle}>
                  {ekyc.verificationPurpose === 'renter'
                    ? 'Xác thực người dùng thực'
                    : 'Kiểm Duyệt Hồ Sơ eKYC'}
                </Text>
                <Text style={styles.modalSubtitle}>{ekyc.userId?.name || 'Người dùng'}</Text>
              </View>
            </View>
            <TouchableOpacity onPress={onClose} style={styles.closeBtn} activeOpacity={0.7}>
              <Ionicons name="close" size={22} color={colors.light.textSecondary} />
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.modalScroll} showsVerticalScrollIndicator={false}>
            {/* Thông tin User tóm tắt */}
            <View style={styles.userInfoCard}>
              <Image
                source={{
                  uri:
                    ekyc.userId?.avatar ||
                    'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=400',
                }}
                style={styles.avatarImg}
              />
              <View style={styles.userMetaCol}>
                <Text style={styles.userName}>{ekyc.fullName || ekyc.userId?.name || 'Tên người dùng'}</Text>
                <Text style={styles.userSubText}>
                  {ekyc.email || ekyc.userId?.email || ''} • {ekyc.phone || ekyc.userId?.phone || ''}
                </Text>
                <View style={styles.trustScorePill}>
                  <Ionicons name="shield-checkmark" size={12} color={colors.light.primary} />
                  <Text style={styles.trustScoreText}>
                    Điểm uy tín hiện tại: {ekyc.userId?.trustScore || 100}/100
                  </Text>
                </View>
              </View>
            </View>

            {/* Bảng chi tiết thông tin cá nhân nộp duyệt */}
            <View style={styles.detailInfoCard}>
              <View style={styles.detailHeaderRow}>
                <Ionicons name="person-circle-outline" size={16} color={colors.light.primary} />
                <Text style={styles.detailCardTitle}>THÔNG TIN CÁ NHÂN ĐỐI CHIẾU</Text>
              </View>

              <View style={styles.infoRow}>
                <Text style={styles.infoLabel}>Họ và tên:</Text>
                <Text style={styles.infoValue}>{ekyc.fullName || ekyc.userId?.name || 'Chưa cung cấp'}</Text>
              </View>

              <View style={styles.infoRow}>
                <Text style={styles.infoLabel}>Số CCCD:</Text>
                <Text style={[styles.infoValue, styles.infoValueHighlight]}>
                  {ekyc.idCardNumber || 'Chưa cung cấp'}
                </Text>
              </View>

              <View style={styles.infoRow}>
                <Text style={styles.infoLabel}>Số điện thoại:</Text>
                <Text style={styles.infoValue}>{ekyc.phone || ekyc.userId?.phone || 'Chưa cung cấp'}</Text>
              </View>

              <View style={styles.infoRow}>
                <Text style={styles.infoLabel}>Email:</Text>
                <Text style={styles.infoValue}>{ekyc.email || ekyc.userId?.email || 'Chưa cung cấp'}</Text>
              </View>

              <View style={[styles.infoRow, { borderBottomWidth: 0, paddingBottom: 0 }]}>
                <Text style={styles.infoLabel}>Địa chỉ nhà:</Text>
                <Text style={[styles.infoValue, { flex: 1, textAlign: 'right' }]}>
                  {ekyc.address || ekyc.userId?.address || 'Chưa cung cấp'}
                </Text>
              </View>
            </View>

            {/* Thông báo duyệt thủ công */}
            <View style={styles.manualNoticeBox}>
              <Ionicons name="information-circle" size={16} color="#0284C7" />
              <Text style={styles.manualNoticeText}>
                Hồ sơ xét duyệt thủ công: Quản trị viên vui lòng đối chiếu Số CCCD, Họ tên, và Địa chỉ nhà với ảnh 2 mặt Căn cước công dân trước khi phê duyệt.
              </Text>
            </View>

            {/* Danh sách ảnh giấy tờ */}
            <Text style={styles.sectionHeading}>🪪 ẢNH GIẤY TỜ TÙY THÂN</Text>

            <View style={styles.docsList}>
              {/* Ảnh 1: CCCD Mặt trước */}
              <View style={styles.docItem}>
                <Text style={styles.docLabel}>1. Căn cước công dân (Mặt trước)</Text>
                <Image source={{ uri: ekyc.idCardFrontUrl }} style={styles.docImage} />
              </View>

              {/* Ảnh 2: CCCD Mặt sau */}
              <View style={styles.docItem}>
                <Text style={styles.docLabel}>2. Căn cước công dân (Mặt sau)</Text>
                <Image source={{ uri: ekyc.idCardBackUrl }} style={styles.docImage} />
              </View>

              {/* Ảnh 3: Chân dung Selfie (chỉ hiển thị nếu có) */}
              {ekyc.selfieUrl ? (
                <View style={styles.docItem}>
                  <Text style={styles.docLabel}>3. Ảnh chụp chân dung trực tiếp (Selfie)</Text>
                  <Image source={{ uri: ekyc.selfieUrl }} style={styles.docImage} />
                </View>
              ) : null}
            </View>

            {/* Khối nhập lý do từ chối nếu bấm Từ chối */}
            {rejecting && (
              <View style={styles.rejectInputBox}>
                <Text style={styles.rejectInputLabel}>Lý do từ chối hồ sơ (gửi tới người dùng):</Text>
                <TextInput
                  style={styles.rejectInput}
                  multiline
                  numberOfLines={2}
                  value={rejectReason}
                  onChangeText={setRejectReason}
                  placeholder="Ví dụ: Ảnh CCCD mặt trước bị mờ số căn cước, vui lòng chụp lại..."
                  placeholderTextColor={colors.light.textSecondary}
                />
                <TouchableOpacity
                  style={styles.btnConfirmReject}
                  onPress={handleReject}
                  disabled={loading}
                  activeOpacity={0.8}
                >
                  <Text style={styles.btnConfirmRejectText}>Xác nhận Từ Chối Hồ Sơ</Text>
                </TouchableOpacity>
              </View>
            )}
          </ScrollView>

          {/* Footer Buttons */}
          <View style={styles.modalFooter}>
            {!rejecting ? (
              <>
                <TouchableOpacity
                  style={styles.btnReject}
                  onPress={() => setRejecting(true)}
                  disabled={loading}
                  activeOpacity={0.8}
                >
                  <Ionicons name="close-circle-outline" size={16} color={colors.light.error} />
                  <Text style={styles.btnRejectText}>Từ chối</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.btnApprove}
                  onPress={handleApprove}
                  disabled={loading}
                  activeOpacity={0.8}
                >
                  {loading ? (
                    <ActivityIndicator color="#FFFFFF" size="small" />
                  ) : (
                    <>
                      <Ionicons name="checkmark-circle" size={18} color="#FFFFFF" />
                      <Text style={styles.btnApproveText}>Duyệt & Cấp Tích Xanh</Text>
                    </>
                  )}
                </TouchableOpacity>
              </>
            ) : (
              <TouchableOpacity
                style={styles.btnCancelReject}
                onPress={() => setRejecting(false)}
                activeOpacity={0.8}
              >
                <Text style={styles.btnCancelRejectText}>Quay lại</Text>
              </TouchableOpacity>
            )}
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.65)',
    justifyContent: 'flex-end',
  },
  modalContainer: {
    backgroundColor: colors.light.background,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: '90%',
    paddingBottom: 20,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: 18,
    paddingBottom: 14,
    borderBottomWidth: 1,
    borderBottomColor: colors.light.border,
  },
  modalTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flex: 1,
  },
  cardIconWrapper: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: colors.light.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.light.textPrimary,
  },
  modalSubtitle: {
    fontSize: 12,
    color: colors.light.textSecondary,
    marginTop: 2,
  },
  closeBtn: {
    padding: 6,
  },
  modalScroll: {
    paddingHorizontal: 20,
    paddingTop: 16,
  },
  userInfoCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.light.surface,
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.light.border,
    marginBottom: 12,
    gap: 12,
  },
  avatarImg: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: colors.light.border,
  },
  userMetaCol: {
    flex: 1,
  },
  userName: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.light.textPrimary,
  },
  userSubText: {
    fontSize: 11,
    color: colors.light.textSecondary,
    marginTop: 2,
  },
  trustScorePill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: colors.light.primaryLight,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    alignSelf: 'flex-start',
    marginTop: 6,
  },
  trustScoreText: {
    fontSize: 10,
    fontWeight: '600',
    color: colors.light.primary,
  },
  detailInfoCard: {
    backgroundColor: colors.light.surface,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.light.border,
    padding: 12,
    marginBottom: 14,
  },
  detailHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    borderBottomWidth: 1,
    borderBottomColor: colors.light.border,
    paddingBottom: 8,
    marginBottom: 8,
  },
  detailCardTitle: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.light.primary,
    letterSpacing: 0.5,
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 6,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  infoLabel: {
    fontSize: 12,
    color: colors.light.textSecondary,
    fontWeight: '500',
    marginRight: 8,
  },
  infoValue: {
    fontSize: 12,
    color: colors.light.textPrimary,
    fontWeight: '600',
  },
  infoValueHighlight: {
    color: colors.light.primary,
    fontWeight: '700',
    fontSize: 13,
  },
  manualNoticeBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#F0F9FF',
    borderRadius: 10,
    padding: 12,
    borderWidth: 1,
    borderColor: '#BAE6FD',
    marginBottom: 16,
  },
  manualNoticeText: {
    flex: 1,
    fontSize: 11,
    color: '#0369A1',
    lineHeight: 16,
    fontWeight: '500',
  },
  sectionHeading: {
    fontSize: 11,
    fontWeight: '700',
    color: colors.light.textSecondary,
    letterSpacing: 0.5,
    marginBottom: 10,
  },
  docsList: {
    gap: 14,
    marginBottom: 18,
  },
  docItem: {
    backgroundColor: colors.light.surface,
    padding: 10,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: colors.light.border,
  },
  docLabel: {
    fontSize: 11,
    fontWeight: '600',
    color: colors.light.textPrimary,
    marginBottom: 8,
  },
  docImage: {
    width: '100%',
    height: 150,
    borderRadius: 8,
    backgroundColor: colors.light.border,
  },
  rejectInputBox: {
    backgroundColor: '#FEF2F2',
    borderWidth: 1,
    borderColor: '#FEE2E2',
    padding: 12,
    borderRadius: 10,
    marginBottom: 16,
  },
  rejectInputLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: colors.light.error,
    marginBottom: 6,
  },
  rejectInput: {
    backgroundColor: colors.light.background,
    borderWidth: 1,
    borderColor: colors.light.border,
    borderRadius: 8,
    padding: 10,
    fontSize: 12,
    color: colors.light.textPrimary,
    minHeight: 50,
    textAlignVertical: 'top',
    marginBottom: 10,
  },
  btnConfirmReject: {
    backgroundColor: colors.light.error,
    paddingVertical: 10,
    borderRadius: 8,
    alignItems: 'center',
  },
  btnConfirmRejectText: {
    color: '#FFFFFF',
    fontWeight: '700',
    fontSize: 12,
  },
  modalFooter: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    paddingTop: 12,
    gap: 12,
    borderTopWidth: 1,
    borderTopColor: colors.light.border,
  },
  btnReject: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: colors.light.surface,
    borderWidth: 1,
    borderColor: colors.light.error,
    paddingVertical: 12,
    borderRadius: 10,
  },
  btnRejectText: {
    color: colors.light.error,
    fontSize: 13,
    fontWeight: '600',
  },
  btnApprove: {
    flex: 2,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: colors.light.primary,
    paddingVertical: 12,
    borderRadius: 10,
  },
  btnApproveText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '700',
  },
  btnCancelReject: {
    flex: 1,
    backgroundColor: colors.light.surface,
    borderWidth: 1,
    borderColor: colors.light.border,
    paddingVertical: 12,
    borderRadius: 10,
    alignItems: 'center',
  },
  btnCancelRejectText: {
    color: colors.light.textSecondary,
    fontSize: 13,
    fontWeight: '600',
  },
});
