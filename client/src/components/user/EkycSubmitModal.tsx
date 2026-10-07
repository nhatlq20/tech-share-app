import React, { useState, useEffect } from 'react';
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
import { useSelector } from 'react-redux';
import { RootState } from '../../store';
import { colors } from '../../theme/colors';
import { pickIdCardImage, ekycService } from '../../services/ekycService';
import { EkycItem } from '../../types';

interface EkycSubmitModalProps {
  visible: boolean;
  onClose: () => void;
  onSuccess: (ekyc: EkycItem) => void;
  currentEkyc?: EkycItem | null;
  user?: any;
  verificationPurpose?: 'owner' | 'renter';
}

export function EkycSubmitModal({
  visible,
  onClose,
  onSuccess,
  currentEkyc,
  user: userProp,
  verificationPurpose = 'owner',
}: EkycSubmitModalProps) {
  const authUser = useSelector((state: RootState) => state.auth.user);
  const currentUser = userProp || authUser;

  const [idCardNumber, setIdCardNumber] = useState(currentEkyc?.idCardNumber || '');
  const [address, setAddress] = useState(
    currentEkyc?.address || currentUser?.address || ''
  );
  const [frontUrl, setFrontUrl] = useState(currentEkyc?.idCardFrontUrl || '');
  const [backUrl, setBackUrl] = useState(currentEkyc?.idCardBackUrl || '');
  const [uploadingFront, setUploadingFront] = useState(false);
  const [uploadingBack, setUploadingBack] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  useEffect(() => {
    if (visible) {
      if (currentEkyc?.idCardNumber) {
        setIdCardNumber(currentEkyc.idCardNumber);
      }
      if (currentEkyc?.address) {
        setAddress(currentEkyc.address);
      } else if (currentUser?.address) {
        setAddress(currentUser.address);
      }
      if (currentEkyc?.idCardFrontUrl) {
        setFrontUrl(currentEkyc.idCardFrontUrl);
      }
      if (currentEkyc?.idCardBackUrl) {
        setBackUrl(currentEkyc.idCardBackUrl);
      }
      setErrorMsg('');
    }
  }, [visible, currentEkyc, currentUser]);

  const handlePickFront = async () => {
    try {
      setErrorMsg('');
      const picked = await pickIdCardImage();
      if (!picked) return;

      setUploadingFront(true);
      const uploadedUrl = await ekycService.uploadImage(picked);
      setFrontUrl(uploadedUrl);
    } catch (err: any) {
      setErrorMsg(err.message || 'Unable to upload front ID card photo.');
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
      setErrorMsg(err.message || 'Unable to upload back ID card photo.');
    } finally {
      setUploadingBack(false);
    }
  };

  const handleSubmit = async () => {
    const trimmedNumber = idCardNumber.trim();
    if (!trimmedNumber) {
      setErrorMsg('Please enter your Citizen ID Card (CCCD) number.');
      return;
    }

    if (trimmedNumber.length < 9 || trimmedNumber.length > 12) {
      setErrorMsg('ID Card number must be between 9 and 12 digits.');
      return;
    }

    const trimmedAddress = address.trim();
    if (!trimmedAddress) {
      setErrorMsg('Please enter your residential address.');
      return;
    }

    if (trimmedAddress.length < 5) {
      setErrorMsg('Address is too short. Please provide detailed street, ward, and district.');
      return;
    }

    if (!frontUrl) {
      setErrorMsg('Please upload the front photo of your ID card.');
      return;
    }

    if (!backUrl) {
      setErrorMsg('Please upload the back photo of your ID card.');
      return;
    }

    try {
      setSubmitting(true);
      setErrorMsg('');

      const res = await ekycService.submitEkyc({
        idCardNumber: trimmedNumber,
        address: trimmedAddress,
        idCardFrontUrl: frontUrl,
        idCardBackUrl: backUrl,
      });

      if (res && res.success) {
        Alert.alert(
          'eKYC Submitted Successfully! 🎉',
          verificationPurpose === 'renter'
            ? 'Your identity verification request has been submitted to admins for manual review. Once approved, you will be able to rent devices.'
            : 'Your identity verification request has been submitted for review. Once approved, your account will receive a Verified Badge and unlock Owner privileges.'
        );
        onSuccess(res.ekyc);
        onClose();
      }
    } catch (err: any) {
      setErrorMsg(
        err?.response?.data?.message || err.message || 'Failed to submit eKYC. Please try again.'
      );
    } finally {
      setSubmitting(false);
    }
  };

  const isFormValid =
    idCardNumber.trim().length >= 9 &&
    address.trim().length >= 5 &&
    Boolean(frontUrl) &&
    Boolean(backUrl) &&
    !submitting &&
    !uploadingFront &&
    !uploadingBack;

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
                <Text style={styles.modalTitle}>Digital Identity Verification (eKYC)</Text>
                <Text style={styles.modalSubtitle}>
                  {verificationPurpose === 'renter'
                    ? 'Verify real identity to rent equipment'
                    : 'Upgrade to Owner & Get Verified Badge'}
                </Text>
              </View>
            </View>
            <TouchableOpacity onPress={onClose} style={styles.closeBtn} activeOpacity={0.7}>
              <Ionicons name="close" size={22} color={colors.light.textSecondary} />
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.modalScroll} showsVerticalScrollIndicator={false}>
            {/* Warning if previously rejected */}
            {currentEkyc?.status === 'rejected' && currentEkyc?.rejectReason ? (
              <View style={styles.rejectBanner}>
                <Ionicons name="alert-circle" size={18} color={colors.light.error} />
                <View style={{ flex: 1 }}>
                  <Text style={styles.rejectBannerTitle}>Previous submission was rejected</Text>
                  <Text style={styles.rejectBannerReason}>
                    Reason: {currentEkyc.rejectReason}. Please retake clear photos and resubmit.
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

            {/* ======================================================== */}
            {/* PART 1: AUTO-SYNCED USER PROFILE DETAILS (READ-ONLY) */}
            {/* ======================================================== */}
            <View style={styles.sectionCard}>
              <View style={styles.sectionHeaderRow}>
                <Ionicons name="lock-closed" size={14} color={colors.light.primary} />
                <Text style={styles.sectionHeadingTitle}>
                  ACCOUNT INFORMATION (AUTO-SYNCED)
                </Text>
              </View>
              <Text style={styles.sectionSubDesc}>
                System automatically syncs details from your account and prevents edits here for verification integrity.
              </Text>

              {/* Full name */}
              <View style={styles.inputGroup}>
                <View style={styles.labelRow}>
                  <Text style={styles.inputLabel}>Full Name</Text>
                  <View style={styles.readOnlyBadge}>
                    <Ionicons name="lock-closed" size={10} color={colors.light.textSecondary} />
                    <Text style={styles.readOnlyBadgeText}>Fixed</Text>
                  </View>
                </View>
                <View style={[styles.inputWrap, styles.inputWrapDisabled]}>
                  <View style={styles.inputIconBox}>
                    <Ionicons name="person-outline" size={18} color={colors.light.textSecondary} />
                  </View>
                  <TextInput
                    style={[styles.textInput, styles.textInputDisabled]}
                    value={currentUser?.name || 'Name not updated'}
                    editable={false}
                  />
                </View>
              </View>

              {/* Email */}
              <View style={styles.inputGroup}>
                <View style={styles.labelRow}>
                  <Text style={styles.inputLabel}>Email Address</Text>
                  <View style={styles.readOnlyBadge}>
                    <Ionicons name="lock-closed" size={10} color={colors.light.textSecondary} />
                    <Text style={styles.readOnlyBadgeText}>Fixed</Text>
                  </View>
                </View>
                <View style={[styles.inputWrap, styles.inputWrapDisabled]}>
                  <View style={styles.inputIconBox}>
                    <Ionicons name="mail-outline" size={18} color={colors.light.textSecondary} />
                  </View>
                  <TextInput
                    style={[styles.textInput, styles.textInputDisabled]}
                    value={currentUser?.email || 'Email not updated'}
                    editable={false}
                  />
                </View>
              </View>

              {/* Phone number */}
              <View style={[styles.inputGroup, { marginBottom: 4 }]}>
                <View style={styles.labelRow}>
                  <Text style={styles.inputLabel}>Phone Number</Text>
                  <View style={styles.readOnlyBadge}>
                    <Ionicons name="lock-closed" size={10} color={colors.light.textSecondary} />
                    <Text style={styles.readOnlyBadgeText}>Fixed</Text>
                  </View>
                </View>
                <View style={[styles.inputWrap, styles.inputWrapDisabled]}>
                  <View style={styles.inputIconBox}>
                    <Ionicons name="call-outline" size={18} color={colors.light.textSecondary} />
                  </View>
                  <TextInput
                    style={[styles.textInput, styles.textInputDisabled]}
                    value={currentUser?.phone || 'Phone not updated'}
                    editable={false}
                  />
                </View>
              </View>
            </View>

            {/* ======================================================== */}
            {/* PART 2: ADDITIONAL IDENTIFICATION DETAILS */}
            {/* ======================================================== */}
            <View style={[styles.sectionCard, { marginTop: 14 }]}>
              <View style={styles.sectionHeaderRow}>
                <Ionicons name="create-outline" size={15} color={colors.light.primary} />
                <Text style={styles.sectionHeadingTitle}>ADDITIONAL IDENTIFICATION DETAILS</Text>
              </View>
              <Text style={styles.sectionSubDesc}>
                Please enter your ID card number and current residential address accurately.
              </Text>

              {/* ID Card Number */}
              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>National ID / CCCD Number *</Text>
                <View style={styles.inputWrap}>
                  <View style={styles.inputIconBox}>
                    <Ionicons name="card-outline" size={18} color={colors.light.textSecondary} />
                  </View>
                  <TextInput
                    style={styles.textInput}
                    placeholder="Enter 9-12 digit ID number (e.g. 079204001234)"
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

              {/* Residential Address */}
              <View style={[styles.inputGroup, { marginBottom: 4 }]}>
                <Text style={styles.inputLabel}>Residential Address (Permanent / Current) *</Text>
                <View style={[styles.inputWrap, styles.inputWrapMultiline]}>
                  <View style={[styles.inputIconBox, { marginTop: 4 }]}>
                    <Ionicons name="home-outline" size={18} color={colors.light.textSecondary} />
                  </View>
                  <TextInput
                    style={[styles.textInput, styles.textInputMultiline]}
                    placeholder="e.g. 123 Nguyen Hue St, Ben Nghe Ward, District 1, Ho Chi Minh City"
                    placeholderTextColor={colors.light.textSecondary}
                    value={address}
                    multiline
                    numberOfLines={2}
                    onChangeText={(val: string) => {
                      setAddress(val);
                      if (errorMsg) setErrorMsg('');
                    }}
                  />
                </View>
              </View>
            </View>

            {/* ======================================================== */}
            {/* PART 3: ID CARD PHOTO UPLOAD */}
            {/* ======================================================== */}
            <View style={{ marginTop: 14 }}>
              {/* Upload Front Photo */}
              <View style={styles.uploadSection}>
                <View style={styles.uploadHeaderRow}>
                  <Text style={styles.uploadLabel}>1. ID Card Front Photo *</Text>
                  {frontUrl ? (
                    <View style={styles.verifiedChip}>
                      <Ionicons name="checkmark-circle" size={12} color={colors.light.success} />
                      <Text style={styles.verifiedChipText}>Uploaded</Text>
                    </View>
                  ) : null}
                </View>
                <Text style={styles.uploadHelper}>
                  Clearly capture ID number, full name, date of birth, emblem, and portrait photo.
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
                      <Text style={styles.btnChangeImageText}>Change photo</Text>
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
                        <Text style={styles.uploadLoadingText}>Uploading photo...</Text>
                      </View>
                    ) : (
                      <View style={styles.uploadPlaceholderCol}>
                        <View style={styles.uploadIconCircle}>
                          <Ionicons name="camera" size={24} color={colors.light.primary} />
                        </View>
                        <Text style={styles.uploadBtnText}>Capture or select Front ID Photo</Text>
                        <Text style={styles.uploadBtnSubText}>JPG, PNG format (max 10MB)</Text>
                      </View>
                    )}
                  </TouchableOpacity>
                )}
              </View>

              {/* Upload Back Photo */}
              <View style={styles.uploadSection}>
                <View style={styles.uploadHeaderRow}>
                  <Text style={styles.uploadLabel}>2. ID Card Back Photo *</Text>
                  {backUrl ? (
                    <View style={styles.verifiedChip}>
                      <Ionicons name="checkmark-circle" size={12} color={colors.light.success} />
                      <Text style={styles.verifiedChipText}>Uploaded</Text>
                    </View>
                  ) : null}
                </View>
                <Text style={styles.uploadHelper}>
                  Clearly capture fingerprints, identifying features, issue date, and MRZ code.
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
                      <Text style={styles.btnChangeImageText}>Change photo</Text>
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
                        <Text style={styles.uploadLoadingText}>Uploading photo...</Text>
                      </View>
                    ) : (
                      <View style={styles.uploadPlaceholderCol}>
                        <View style={styles.uploadIconCircle}>
                          <Ionicons name="camera" size={24} color={colors.light.primary} />
                        </View>
                        <Text style={styles.uploadBtnText}>Capture or select Back ID Photo</Text>
                        <Text style={styles.uploadBtnSubText}>JPG, PNG format (max 10MB)</Text>
                      </View>
                    )}
                  </TouchableOpacity>
                )}
              </View>
            </View>

            {/* Notice card */}
            <View style={styles.policyNoticeBox}>
              <View style={styles.policyHeaderRow}>
                <Ionicons name="shield-checkmark" size={16} color={colors.light.primary} />
                <Text style={styles.policyTitle}>Review & Privacy Policy:</Text>
              </View>
              <Text style={styles.policyText}>
                • Your eKYC submission will be manually reviewed and matched against official records by TechShare admins.
              </Text>
              <Text style={[styles.policyText, { marginTop: 4 }]}>
                • Upon successful approval, your account receives a{' '}
                <Text style={{ fontWeight: '700', color: colors.light.primary }}>Verified Badge</Text>{' '}
                and unlocks{' '}
                <Text style={{ fontWeight: '700', color: colors.light.primary }}>Owner</Text>{' '}
                capabilities to list equipment.
              </Text>
              <Text style={[styles.policyText, { marginTop: 4 }]}>
                • ID number and photos are strictly encrypted and used solely for identity verification.
              </Text>
            </View>
          </ScrollView>

          {/* Footer Submit Button */}
          <View style={styles.modalFooter}>
            <TouchableOpacity
              style={[styles.btnSubmit, !isFormValid && styles.btnSubmitDisabled]}
              onPress={handleSubmit}
              disabled={!isFormValid}
              activeOpacity={0.85}
            >
              {submitting ? (
                <ActivityIndicator size="small" color="#FFFFFF" />
              ) : (
                <View style={styles.btnContentRow}>
                  <Ionicons name="paper-plane" size={18} color="#FFFFFF" style={{ marginRight: 6 }} />
                  <Text style={styles.btnSubmitText}>SUBMIT eKYC VERIFICATION</Text>
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
  sectionCard: {
    backgroundColor: colors.light.surface,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: colors.light.border,
    padding: 14,
  },
  sectionHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 4,
  },
  sectionHeadingTitle: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.light.primary,
    letterSpacing: 0.5,
  },
  sectionSubDesc: {
    fontSize: 11,
    color: colors.light.textSecondary,
    lineHeight: 16,
    marginBottom: 12,
  },
  inputGroup: {
    marginBottom: 12,
  },
  labelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  inputLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.light.textPrimary,
  },
  readOnlyBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    backgroundColor: '#F1F5F9',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  readOnlyBadgeText: {
    fontSize: 9,
    fontWeight: '600',
    color: colors.light.textSecondary,
  },
  inputWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.light.background,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: colors.light.border,
    paddingHorizontal: 12,
    height: 46,
  },
  inputWrapDisabled: {
    backgroundColor: '#F8FAFC',
    borderColor: '#E2E8F0',
  },
  inputWrapMultiline: {
    height: 72,
    alignItems: 'flex-start',
    paddingVertical: 8,
  },
  inputIconBox: {
    marginRight: 8,
  },
  textInput: {
    flex: 1,
    fontSize: 13,
    color: colors.light.textPrimary,
  },
  textInputDisabled: {
    color: '#64748B',
  },
  textInputMultiline: {
    textAlignVertical: 'top',
    height: '100%',
  },
  uploadSection: {
    marginBottom: 16,
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
    marginBottom: 8,
    lineHeight: 15,
  },
  uploadBox: {
    borderWidth: 1.5,
    borderStyle: 'dashed',
    borderColor: colors.light.primary,
    backgroundColor: '#F8FAFC',
    borderRadius: 12,
    paddingVertical: 20,
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
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: colors.light.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 6,
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
    color: colors.light.white,
    fontSize: 11,
    fontWeight: '600',
  },
  policyNoticeBox: {
    backgroundColor: colors.light.primaryLight,
    borderWidth: 1,
    borderColor: colors.light.borderDefault,
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
    color: colors.light.primaryDark,
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
    backgroundColor: colors.light.borderDefault,
    elevation: 0,
    shadowOpacity: 0,
  },
  btnContentRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  btnSubmitText: {
    color: colors.light.white,
    fontSize: 14,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
});
