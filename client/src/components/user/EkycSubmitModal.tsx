import React, { useState } from 'react';
import {
  StyleSheet,
  View,
  Text,
  Modal,
  TouchableOpacity,
  ScrollView,
  TextInput,
  Image,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../../theme/colors';
import { pickIdCardImage, ekycService } from '../../services/ekycService';
import { EkycItem } from '../../types';

interface EkycSubmitModalProps {
  visible: boolean;
  onClose: () => void;
  onSuccess: (ekyc: EkycItem) => void;
  currentEkyc?: EkycItem | null;
}

export function EkycSubmitModal({
  visible,
  onClose,
  onSuccess,
  currentEkyc,
}: EkycSubmitModalProps) {
  const [idCardNumber, setIdCardNumber] = useState(currentEkyc?.idCardNumber || '');
  const [frontUrl, setFrontUrl] = useState(currentEkyc?.idCardFrontUrl || '');
  const [backUrl, setBackUrl] = useState(currentEkyc?.idCardBackUrl || '');
  const [uploadingFront, setUploadingFront] = useState(false);
  const [uploadingBack, setUploadingBack] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  const handlePickFront = async () => {
    try {
      setErrorMsg('');
      const picked = await pickIdCardImage();
      if (!picked) return;

      setUploadingFront(true);
      const uploadedUrl = await ekycService.uploadImage(picked);
      setFrontUrl(uploadedUrl);
    } catch (err: any) {
      setErrorMsg(err.message || 'Không thể tải lên ảnh mặt trước CCCD.');
    } finally {
      setUploadingFront(false);
    }
  };

  const handlePickBack = async () => {
    try {
      setErrorMsg('');
      const picked = await pickIdCardImage();
      if (!picked) return;

      setUploadingBack(true);
      const uploadedUrl = await ekycService.uploadImage(picked);
      setBackUrl(uploadedUrl);
    } catch (err: any) {
      setErrorMsg(err.message || 'Không thể tải lên ảnh mặt sau CCCD.');
    } finally {
      setUploadingBack(false);
    }
  };

  const handleSubmit = async () => {
    const trimmedNumber = idCardNumber.trim();
    if (!trimmedNumber) {
      setErrorMsg('Vui lòng nhập số Căn cước công dân (CCCD).');
      return;
    }

    if (trimmedNumber.length < 9 || trimmedNumber.length > 12) {
      setErrorMsg('Số CCCD phải có từ 9 đến 12 chữ số.');
      return;
    }

    if (!frontUrl) {
      setErrorMsg('Vui lòng tải lên ảnh mặt trước CCCD.');
      return;
    }

    if (!backUrl) {
      setErrorMsg('Vui lòng tải lên ảnh mặt sau CCCD.');
      return;
    }

    try {
      setSubmitting(true);
      setErrorMsg('');

      const res = await ekycService.submitEkyc({
        idCardNumber: trimmedNumber,
        idCardFrontUrl: frontUrl,
        idCardBackUrl: backUrl,
      });

      if (res && res.success) {
        Alert.alert(
          'Gửi đơn eKYC thành công! 🎉',
          'Đơn định danh của bạn đã được gửi tới quản trị viên. Khi được duyệt, tài khoản sẽ được cấp Tích Xanh Uy Tín và nâng cấp lên quyền Chủ máy (Owner).'
        );
        onSuccess(res.ekyc);
        onClose();
      }
    } catch (err: any) {
      setErrorMsg(
        err?.response?.data?.message || err.message || 'Không thể gửi đơn eKYC. Vui lòng thử lại.'
      );
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <View style={styles.modalOverlay}>
        <View style={styles.modalContainer}>
          {/* Header */}
          <View style={styles.modalHeader}>
            <View style={styles.headerLeft}>
              <View style={styles.headerIconWrapper}>
                <Ionicons name="id-card" size={20} color={colors.light.primary} />
              </View>
              <View>
                <Text style={styles.modalTitle}>Định Danh Điện Tử (eKYC)</Text>
                <Text style={styles.modalSubtitle}>Nâng cấp Chủ máy & Nhận Tích Xanh</Text>
              </View>
            </View>
            <TouchableOpacity onPress={onClose} style={styles.closeBtn} activeOpacity={0.7}>
              <Ionicons name="close" size={22} color={colors.light.textSecondary} />
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.modalScroll} showsVerticalScrollIndicator={false}>
            {/* Cảnh báo nếu trước đó bị từ chối */}
            {currentEkyc?.status === 'rejected' && currentEkyc?.rejectReason ? (
              <View style={styles.rejectBanner}>
                <Ionicons name="alert-circle" size={18} color={colors.light.error} />
                <View style={{ flex: 1 }}>
                  <Text style={styles.rejectBannerTitle}>Hồ sơ trước đó bị từ chối</Text>
                  <Text style={styles.rejectBannerReason}>
                    Lý do: {currentEkyc.rejectReason}. Vui lòng chụp lại ảnh rõ nét và gửi lại.
                  </Text>
                </View>
              </View>
            ) : null}

            {/* Error banner */}
            {errorMsg ? (
              <View style={styles.errorBanner}>
                <Ionicons name="alert-circle" size={18} color={colors.light.error} />
                <Text style={styles.errorText}>{errorMsg}</Text>
              </View>
            ) : null}

            {/* Input Số CCCD */}
            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Số Căn cước công dân (CCCD) *</Text>
              <View style={styles.inputWrap}>
                <View style={styles.inputIconBox}>
                  <Ionicons name="card-outline" size={18} color={colors.light.textSecondary} />
                </View>
                <TextInput
                  style={styles.textInput}
                  placeholder="Nhập 12 số CCCD (VD: 079204001234)"
                  placeholderTextColor={colors.light.textSecondary}
                  keyboardType="numeric"
                  maxLength={12}
                  value={idCardNumber}
                  onChangeText={(val: string) => {
                    setIdCardNumber(val.replace(/\D/g, ''));
                    if (errorMsg) setErrorMsg('');
                  }}
                />
              </View>
            </View>

            {/* Upload Ảnh Mặt Trước CCCD */}
            <View style={styles.uploadSection}>
              <View style={styles.uploadHeaderRow}>
                <Text style={styles.uploadLabel}>1. Ảnh CCCD Mặt Trước *</Text>
                {frontUrl ? (
                  <View style={styles.verifiedChip}>
                    <Ionicons name="checkmark-circle" size={12} color={colors.light.success} />
                    <Text style={styles.verifiedChipText}>Đã tải lên</Text>
                  </View>
                ) : null}
              </View>
              <Text style={styles.uploadHelper}>
                Chụp rõ số CCCD, họ tên, ngày sinh, quốc huy và ảnh chân dung.
              </Text>

              {frontUrl ? (
                <View style={styles.previewBox}>
                  <Image source={{ uri: frontUrl }} style={styles.previewImage} />
                  <TouchableOpacity
                    style={styles.btnChangeImage}
                    onPress={handlePickFront}
                    disabled={uploadingFront}
                  >
                    <Ionicons name="camera-reverse" size={14} color="#FFFFFF" />
                    <Text style={styles.btnChangeImageText}>Thay ảnh khác</Text>
                  </TouchableOpacity>
                </View>
              ) : (
                <TouchableOpacity
                  style={[styles.uploadBox, uploadingFront && styles.uploadBoxLoading]}
                  onPress={handlePickFront}
                  disabled={uploadingFront}
                  activeOpacity={0.8}
                >
                  {uploadingFront ? (
                    <View style={styles.uploadLoadingCol}>
                      <ActivityIndicator size="small" color={colors.light.primary} />
                      <Text style={styles.uploadLoadingText}>Đang tải ảnh lên...</Text>
                    </View>
                  ) : (
                    <View style={styles.uploadPlaceholderCol}>
                      <View style={styles.uploadIconCircle}>
                        <Ionicons name="camera" size={24} color={colors.light.primary} />
                      </View>
                      <Text style={styles.uploadBtnText}>Chụp hoặc chọn ảnh CCCD Mặt Trước</Text>
                      <Text style={styles.uploadBtnSubText}>Định dạng JPG, PNG (tối đa 10MB)</Text>
                    </View>
                  )}
                </TouchableOpacity>
              )}
            </View>

            {/* Upload Ảnh Mặt Sau CCCD */}
            <View style={styles.uploadSection}>
              <View style={styles.uploadHeaderRow}>
                <Text style={styles.uploadLabel}>2. Ảnh CCCD Mặt Sau *</Text>
                {backUrl ? (
                  <View style={styles.verifiedChip}>
                    <Ionicons name="checkmark-circle" size={12} color={colors.light.success} />
                    <Text style={styles.verifiedChipText}>Đã tải lên</Text>
                  </View>
                ) : null}
              </View>
              <Text style={styles.uploadHelper}>
                Chụp rõ vân tay, đặc điểm nhân dạng, ngày cấp và mã vạch MRZ.
              </Text>

              {backUrl ? (
                <View style={styles.previewBox}>
                  <Image source={{ uri: backUrl }} style={styles.previewImage} />
                  <TouchableOpacity
                    style={styles.btnChangeImage}
                    onPress={handlePickBack}
                    disabled={uploadingBack}
                  >
                    <Ionicons name="camera-reverse" size={14} color="#FFFFFF" />
                    <Text style={styles.btnChangeImageText}>Thay ảnh khác</Text>
                  </TouchableOpacity>
                </View>
              ) : (
                <TouchableOpacity
                  style={[styles.uploadBox, uploadingBack && styles.uploadBoxLoading]}
                  onPress={handlePickBack}
                  disabled={uploadingBack}
                  activeOpacity={0.8}
                >
                  {uploadingBack ? (
                    <View style={styles.uploadLoadingCol}>
                      <ActivityIndicator size="small" color={colors.light.primary} />
                      <Text style={styles.uploadLoadingText}>Đang tải ảnh lên...</Text>
                    </View>
                  ) : (
                    <View style={styles.uploadPlaceholderCol}>
                      <View style={styles.uploadIconCircle}>
                        <Ionicons name="camera" size={24} color={colors.light.primary} />
                      </View>
                      <Text style={styles.uploadBtnText}>Chụp hoặc chọn ảnh CCCD Mặt Sau</Text>
                      <Text style={styles.uploadBtnSubText}>Định dạng JPG, PNG (tối đa 10MB)</Text>
                    </View>
                  )}
                </TouchableOpacity>
              )}
            </View>

            {/* Notice card */}
            <View style={styles.policyNoticeBox}>
              <View style={styles.policyHeaderRow}>
                <Ionicons name="shield-checkmark" size={16} color={colors.light.primary} />
                <Text style={styles.policyTitle}>Quyền lợi & Cam kết Bảo mật:</Text>
              </View>
              <Text style={styles.policyText}>
                • Sau khi Admin phê duyệt, tài khoản của bạn sẽ nhận được{' '}
                <Text style={{ fontWeight: '700', color: colors.light.primary }}>Tích Xanh Uy Tín</Text>{' '}
                và tự động được nâng cấp lên vai trò{' '}
                <Text style={{ fontWeight: '700', color: colors.light.primary }}>Chủ máy (Owner)</Text>{' '}
                để đăng thiết bị cho thuê.
              </Text>
              <Text style={[styles.policyText, { marginTop: 4 }]}>
                • TechShare cam kết dữ liệu CCCD chỉ được dùng nội bộ cho quy trình xác thực sinh trắc học và bảo vệ tiền cọc.
              </Text>
            </View>
          </ScrollView>

          {/* Footer Submit Button */}
          <View style={styles.modalFooter}>
            <TouchableOpacity
              style={[
                styles.btnSubmit,
                (!idCardNumber.trim() || !frontUrl || !backUrl || submitting || uploadingFront || uploadingBack) &&
                  styles.btnSubmitDisabled,
              ]}
              onPress={handleSubmit}
              disabled={
                !idCardNumber.trim() ||
                !frontUrl ||
                !backUrl ||
                submitting ||
                uploadingFront ||
                uploadingBack
              }
              activeOpacity={0.85}
            >
              {submitting ? (
                <ActivityIndicator size="small" color="#FFFFFF" />
              ) : (
                <View style={styles.btnContentRow}>
                  <Ionicons name="paper-plane" size={18} color="#FFFFFF" style={{ marginRight: 6 }} />
                  <Text style={styles.btnSubmitText}>GỬI ĐƠN XÁC MINH eKYC</Text>
                </View>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.7)',
    justifyContent: 'flex-end',
  },
  modalContainer: {
    backgroundColor: colors.light.background,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: '92%',
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
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flex: 1,
  },
  headerIconWrapper: {
    width: 40,
    height: 40,
    borderRadius: 12,
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
  rejectBanner: {
    flexDirection: 'row',
    gap: 10,
    backgroundColor: '#FEF2F2',
    borderWidth: 1,
    borderColor: '#FEE2E2',
    borderRadius: 12,
    padding: 12,
    marginBottom: 16,
  },
  rejectBannerTitle: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.light.error,
  },
  rejectBannerReason: {
    fontSize: 11,
    color: '#991B1B',
    marginTop: 2,
    lineHeight: 16,
  },
  errorBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#FEE2E2',
    padding: 12,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: colors.light.error,
    marginBottom: 16,
  },
  errorText: {
    flex: 1,
    color: colors.light.error,
    fontSize: 12,
    fontWeight: '500',
  },
  inputGroup: {
    marginBottom: 18,
  },
  inputLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.light.textPrimary,
    marginBottom: 6,
  },
  inputWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.light.surface,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: colors.light.border,
    paddingHorizontal: 12,
    height: 48,
  },
  inputIconBox: {
    marginRight: 8,
  },
  textInput: {
    flex: 1,
    fontSize: 14,
    color: colors.light.textPrimary,
  },
  uploadSection: {
    marginBottom: 18,
  },
  uploadHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  uploadLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.light.textPrimary,
  },
  verifiedChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#DCFCE7',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 12,
  },
  verifiedChipText: {
    fontSize: 10,
    fontWeight: '600',
    color: colors.light.success,
  },
  uploadHelper: {
    fontSize: 11,
    color: colors.light.textSecondary,
    marginBottom: 10,
    lineHeight: 15,
  },
  uploadBox: {
    borderWidth: 1.5,
    borderStyle: 'dashed',
    borderColor: colors.light.primary,
    backgroundColor: '#F8FAFC',
    borderRadius: 12,
    paddingVertical: 22,
    alignItems: 'center',
    justifyContent: 'center',
  },
  uploadBoxLoading: {
    opacity: 0.7,
  },
  uploadPlaceholderCol: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  uploadIconCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: colors.light.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  uploadBtnText: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.light.primary,
  },
  uploadBtnSubText: {
    fontSize: 11,
    color: colors.light.textSecondary,
    marginTop: 2,
  },
  uploadLoadingCol: {
    alignItems: 'center',
    gap: 8,
  },
  uploadLoadingText: {
    fontSize: 12,
    color: colors.light.textSecondary,
  },
  previewBox: {
    position: 'relative',
    borderRadius: 12,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: colors.light.border,
  },
  previewImage: {
    width: '100%',
    height: 160,
    backgroundColor: colors.light.surface,
  },
  btnChangeImage: {
    position: 'absolute',
    bottom: 10,
    right: 10,
    backgroundColor: 'rgba(15, 23, 42, 0.75)',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
  },
  btnChangeImageText: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: '600',
  },
  policyNoticeBox: {
    backgroundColor: '#EFF6FF',
    borderWidth: 1,
    borderColor: '#BFDBFE',
    borderRadius: 12,
    padding: 12,
    marginBottom: 20,
  },
  policyHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 6,
  },
  policyTitle: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.light.primary,
  },
  policyText: {
    fontSize: 11,
    color: '#1E40AF',
    lineHeight: 16,
  },
  modalFooter: {
    paddingHorizontal: 20,
    paddingTop: 12,
  },
  btnSubmit: {
    backgroundColor: colors.light.primary,
    height: 48,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 2,
    shadowColor: colors.light.primary,
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.25,
    shadowRadius: 5,
  },
  btnSubmitDisabled: {
    backgroundColor: '#93C5FD',
    elevation: 0,
    shadowOpacity: 0,
  },
  btnContentRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  btnSubmitText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
});
