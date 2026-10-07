import React, { useState, useEffect } from 'react';
import {
  StyleSheet,
  View,
  Text,
  Modal,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
  Alert,
  Image,
  ScrollView,
  Platform,
} from 'react-native';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../../theme/colors';
import { STRINGS } from '../../constants/strings';
import { bookingService, Booking } from '../../services/bookingService';

export interface OwnerQrScannerModalProps {
  visible: boolean;
  onClose: () => void;
  onHandoverSuccess?: (booking: Booking) => void;
}

export function OwnerQrScannerModal({
  visible,
  onClose,
  onHandoverSuccess,
}: OwnerQrScannerModalProps) {
  const CameraViewComponent: any = CameraView;
  const [permission, requestPermission] = useCameraPermissions();
  const [activeTab, setActiveTab] = useState('camera' as 'camera' | 'manual');
  const [manualCode, setManualCode] = useState('');
  const [isVerifying, setIsVerifying] = useState(false);
  const [isHandingOver, setIsHandingOver] = useState(false);
  const [scannedData, setScannedData] = useState(null as string | null);
  const [verifiedBooking, setVerifiedBooking] = useState(null as Booking | null);
  const [scanError, setScanError] = useState(null as string | null);

  // Reset states when opened or closed
  useEffect(() => {
    if (visible) {
      setScannedData(null);
      setVerifiedBooking(null);
      setScanError(null);
      setManualCode('');
    }
  }, [visible]);

  // Request camera permission on mount if needed
  useEffect(() => {
    if (visible && !permission?.granted && permission?.canAskAgain) {
      requestPermission();
    }
  }, [visible, permission, requestPermission]);

  const parseAndVerifyToken = async (rawString: string) => {
    try {
      setIsVerifying(true);
      setScanError(null);

      const trimmed = rawString.trim();
      let tokenToVerify = trimmed;
      let bookingCodeParam: string | undefined;
      let bookingIdParam: string | undefined;

      // Check if rawString is a JSON payload from HandoverQrModal
      if (trimmed.startsWith('{') && trimmed.endsWith('}')) {
        try {
          const parsed = JSON.parse(trimmed);
          if (parsed.qrToken) tokenToVerify = parsed.qrToken;
          if (parsed.bookingCode) bookingCodeParam = String(parsed.bookingCode);
          if (parsed.bookingId) bookingIdParam = String(parsed.bookingId);
        } catch {
          // not valid JSON, proceed with raw string
        }
      }

      const cleanCode = (bookingCodeParam || tokenToVerify).replace(/^TSQR-/, '').replace(/^#/, '').trim();

      const booking = await bookingService.verifyHandoverQr({
        qrToken: tokenToVerify,
        bookingCode: cleanCode,
        bookingId: bookingIdParam,
      });

      if (!booking || !booking._id) {
        setScanError(STRINGS.OWNER_QR_SCANNER.ERR_INVALID_TOKEN);
        setVerifiedBooking(null);
      } else {
        setVerifiedBooking(booking);
      }
    } catch (err: any) {
      const msg =
        err?.response?.data?.message ||
        STRINGS.OWNER_QR_SCANNER.ERR_VERIFY_DEFAULT;
      setScanError(msg);
      setVerifiedBooking(null);
    } finally {
      setIsVerifying(false);
    }
  };

  const handleBarcodeScanned = (result: { data?: string }) => {
    if (scannedData || isVerifying || verifiedBooking) return;
    const data = result.data;
    if (!data) return;

    setScannedData(data);
    parseAndVerifyToken(data);
  };

  const handleManualVerify = () => {
    if (!manualCode.trim()) {
      Alert.alert(STRINGS.OWNER_QR_SCANNER.ALERT_REQUIRED_TITLE, STRINGS.OWNER_QR_SCANNER.ALERT_REQUIRED_MSG);
      return;
    }
    parseAndVerifyToken(manualCode.trim());
  };

  const handleConfirmHandover = async () => {
    if (!verifiedBooking) return;

    try {
      setIsHandingOver(true);
      const updated = await bookingService.handoverBooking(verifiedBooking._id);
      Alert.alert(
        STRINGS.OWNER_QR_SCANNER.SUCCESS_TITLE,
        STRINGS.OWNER_QR_SCANNER.SUCCESS_MSG(verifiedBooking.bookingCode),
        [
          {
            text: STRINGS.COMMON.OK,
            onPress: () => {
              onHandoverSuccess?.(updated);
              onClose();
            },
          },
        ]
      );
    } catch (err: any) {
      const msg =
        err?.response?.data?.message || STRINGS.OWNER_QR_SCANNER.ERR_HANDOVER_DEFAULT;
      Alert.alert(STRINGS.OWNER_QR_SCANNER.ERR_HANDOVER_TITLE, msg);
    } finally {
      setIsHandingOver(false);
    }
  };

  const handleScanAgain = () => {
    setScannedData(null);
    setVerifiedBooking(null);
    setScanError(null);
  };

  if (!visible) return null;

  return (
    <Modal visible={visible} animationType="slide" transparent={false} onRequestClose={onClose}>
      <View style={styles.container}>
        {/* Header Bar */}
        <View style={styles.header}>
          <TouchableOpacity style={styles.closeBtn} onPress={onClose} activeOpacity={0.7}>
            <Ionicons name="close" size={24} color={colors.light.textPrimary} />
          </TouchableOpacity>

          <View style={styles.headerTitleWrap}>
            <Text style={styles.headerTitle}>{STRINGS.OWNER_QR_SCANNER.HEADER_TITLE}</Text>
            <Text style={styles.headerSubtitle}>{STRINGS.OWNER_QR_SCANNER.HEADER_SUBTITLE}</Text>
          </View>

          <View style={{ width: 40 }} />
        </View>

        {/* Mode Switcher Tabs */}
        {!verifiedBooking && (
          <View style={styles.tabBar}>
            <TouchableOpacity
              style={[styles.tabBtn, activeTab === 'camera' && styles.tabBtnActive]}
              onPress={() => {
                setActiveTab('camera');
                setScanError(null);
              }}
            >
              <Ionicons
                name="camera-outline"
                size={18}
                color={activeTab === 'camera' ? colors.light.primary : colors.light.textSecondary}
              />
              <Text
                style={[styles.tabBtnText, activeTab === 'camera' && styles.tabBtnTextActive]}
              >
                {STRINGS.OWNER_QR_SCANNER.TAB_CAMERA}
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.tabBtn, activeTab === 'manual' && styles.tabBtnActive]}
              onPress={() => {
                setActiveTab('manual');
                setScanError(null);
              }}
            >
              <Ionicons
                name="keypad-outline"
                size={18}
                color={activeTab === 'manual' ? colors.light.primary : colors.light.textSecondary}
              />
              <Text
                style={[styles.tabBtnText, activeTab === 'manual' && styles.tabBtnTextActive]}
              >
                {STRINGS.OWNER_QR_SCANNER.TAB_MANUAL}
              </Text>
            </TouchableOpacity>
          </View>
        )}

        {/* Content Area */}
        <ScrollView
          style={styles.contentScroll}
          contentContainerStyle={styles.contentScrollInner}
          keyboardShouldPersistTaps="handled"
        >
          {/* STATE 1: VERIFIED BOOKING PREVIEW CARD */}
          {verifiedBooking ? (
            <View style={styles.verifiedCard}>
              <View style={styles.successBadge}>
                <Ionicons name="checkmark-circle" size={24} color={colors.light.success} />
                <Text style={styles.successBadgeText}>{STRINGS.OWNER_QR_SCANNER.BADGE_VALID_QR}</Text>
              </View>

              {/* Order Info */}
              <View style={styles.orderHeadRow}>
                <View>
                  <Text style={styles.orderLabel}>{STRINGS.OWNER_QR_SCANNER.LABEL_BOOKING_CODE}</Text>
                  <Text style={styles.orderCode}>#{verifiedBooking.bookingCode}</Text>
                </View>
                <View style={[styles.statusPill, getStatusPillStyle(verifiedBooking.status)]}>
                  <Text style={styles.statusPillText}>
                    {verifiedBooking.status.toUpperCase()}
                  </Text>
                </View>
              </View>

              {/* Device Details */}
              <View style={styles.deviceRow}>
                <Image
                  source={{
                    uri:
                      (verifiedBooking.deviceId as any)?.images?.[0] ||
                      'https://images.unsplash.com/photo-1516035069371-29a1b244cc32?w=400',
                  }}
                  style={styles.deviceThumb}
                />
                <View style={styles.deviceMeta}>
                  <Text style={styles.deviceName} numberOfLines={2}>
                    {(verifiedBooking.deviceId as any)?.name ||
                      (verifiedBooking.deviceId as any)?.title ||
                      STRINGS.OWNER_QR_SCANNER.DEFAULT_DEVICE}
                  </Text>
                  <Text style={styles.deviceDays}>
                    {STRINGS.OWNER_QR_SCANNER.RENTAL_DURATION(verifiedBooking.totalDays)}
                  </Text>
                  <Text style={styles.deviceAmount}>
                    {STRINGS.OWNER_QR_SCANNER.TOTAL_LABEL((verifiedBooking.totalAmount || 0).toLocaleString('en-US'))}
                  </Text>
                </View>
              </View>

              {/* Renter Details */}
              <View style={styles.renterBox}>
                <Text style={styles.sectionHeading}>{STRINGS.OWNER_QR_SCANNER.SECTION_RENTER_INFO}</Text>
                <View style={styles.renterRow}>
                  <Image
                    source={{
                      uri:
                        (verifiedBooking.renterId as any)?.avatar ||
                        'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=200',
                    }}
                    style={styles.renterAvatar}
                  />
                  <View style={styles.renterInfo}>
                    <Text style={styles.renterName}>
                      {(verifiedBooking.renterId as any)?.name || STRINGS.OWNER_QR_SCANNER.DEFAULT_RENTER_NAME}
                    </Text>
                    <Text style={styles.renterPhone}>
                      {STRINGS.OWNER_QR_SCANNER.PHONE_LABEL}{(verifiedBooking.renterId as any)?.phone || STRINGS.OWNER_QR_SCANNER.NOT_PROVIDED}
                    </Text>
                  </View>
                </View>
              </View>

              {/* Handover Inspection Photos Status */}
              <View style={styles.photoCheckCard}>
                <Ionicons
                  name={
                    verifiedBooking.handoverPhotos?.beforeRental?.length
                      ? 'camera'
                      : 'alert-circle-outline'
                  }
                  size={20}
                  color={
                    verifiedBooking.handoverPhotos?.beforeRental?.length ? colors.light.success : colors.light.warning
                  }
                />
                <View style={styles.photoCheckInfo}>
                  <Text style={styles.photoCheckTitle}>
                    {STRINGS.OWNER_QR_SCANNER.PHOTOS_TITLE}
                  </Text>
                  <Text style={styles.photoCheckDesc}>
                    {verifiedBooking.handoverPhotos?.beforeRental?.length
                      ? STRINGS.OWNER_QR_SCANNER.PHOTOS_DESC_UPLOADED(verifiedBooking.handoverPhotos.beforeRental.length)
                      : STRINGS.OWNER_QR_SCANNER.PHOTOS_DESC_NONE}
                  </Text>
                </View>
              </View>

              {/* Action Buttons */}
              <View style={styles.actionButtonsCol}>
                {verifiedBooking.status === 'approved' ? (
                  <TouchableOpacity
                    style={styles.btnConfirmHandover}
                    onPress={handleConfirmHandover}
                    disabled={isHandingOver}
                    activeOpacity={0.85}
                  >
                    {isHandingOver ? (
                      <ActivityIndicator size="small" color={colors.light.white} />
                    ) : (
                      <>
                        <Ionicons name="shield-checkmark" size={18} color={colors.light.white} />
                        <Text style={styles.btnConfirmHandoverText}>
                          {STRINGS.OWNER_QR_SCANNER.BTN_CONFIRM_HANDOVER}
                        </Text>
                      </>
                    )}
                  </TouchableOpacity>
                ) : verifiedBooking.status === 'active' ? (
                  <View style={styles.alreadyActiveBanner}>
                    <Ionicons name="checkmark-circle" size={18} color={colors.light.primary} />
                    <Text style={styles.alreadyActiveText}>
                      {STRINGS.OWNER_QR_SCANNER.ALREADY_ACTIVE_TEXT}
                    </Text>
                  </View>
                ) : (
                  <View style={styles.otherStatusBanner}>
                    <Ionicons name="information-circle" size={18} color={colors.light.textSecondary} />
                    <Text style={styles.otherStatusText}>
                      {STRINGS.OWNER_QR_SCANNER.OTHER_STATUS_TEXT(verifiedBooking.status)}
                    </Text>
                  </View>
                )}

                <TouchableOpacity
                  style={styles.btnScanAnother}
                  onPress={handleScanAgain}
                  activeOpacity={0.7}
                >
                  <Ionicons name="scan-outline" size={16} color={colors.light.textSecondary} />
                  <Text style={styles.btnScanAnotherText}>{STRINGS.OWNER_QR_SCANNER.BTN_SCAN_ANOTHER}</Text>
                </TouchableOpacity>
              </View>
            </View>
          ) : activeTab === 'camera' ? (
            /* STATE 2: LIVE CAMERA SCANNER */
            <View style={styles.cameraContainer}>
              {!permission?.granted ? (
                <View style={styles.permissionBox}>
                  <Ionicons name="camera-reverse-outline" size={48} color={colors.light.textSecondary} />
                  <Text style={styles.permissionTitle}>{STRINGS.OWNER_QR_SCANNER.PERMISSION_TITLE}</Text>
                  <Text style={styles.permissionDesc}>
                    {STRINGS.OWNER_QR_SCANNER.PERMISSION_DESC}
                  </Text>
                  <TouchableOpacity
                    style={styles.permissionBtn}
                    onPress={requestPermission}
                    activeOpacity={0.85}
                  >
                    <Text style={styles.permissionBtnText}>{STRINGS.OWNER_QR_SCANNER.BTN_GRANT_CAMERA}</Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={[styles.permissionBtn, { backgroundColor: colors.light.border, marginTop: 12 }]}
                    onPress={() => setActiveTab('manual')}
                  >
                    <Text style={[styles.permissionBtnText, { color: colors.light.textPrimary }]}>
                      {STRINGS.OWNER_QR_SCANNER.BTN_USE_MANUAL}
                    </Text>
                  </TouchableOpacity>
                </View>
              ) : (
                <View style={styles.cameraWrapper}>
                  <CameraViewComponent
                    style={styles.cameraView}
                    facing="back"
                    barcodeScannerSettings={{
                      barcodeTypes: ['qr'],
                    }}
                    onBarcodeScanned={scannedData ? undefined : handleBarcodeScanned}
                  >
                    {/* Viewfinder Target Overlay */}
                    <View style={styles.overlay}>
                      <View style={styles.overlayTop} />
                      <View style={styles.overlayMiddle}>
                        <View style={styles.overlaySide} />
                        <View style={styles.scanTarget}>
                          {/* Corner Reticles */}
                          <View style={[styles.reticleCorner, styles.reticleTL]} />
                          <View style={[styles.reticleCorner, styles.reticleTR]} />
                          <View style={[styles.reticleCorner, styles.reticleBL]} />
                          <View style={[styles.reticleCorner, styles.reticleBR]} />

                          {isVerifying && (
                            <View style={styles.verifyingOverlay}>
                              <ActivityIndicator size="large" color={colors.light.white} />
                              <Text style={styles.verifyingText}>{STRINGS.OWNER_QR_SCANNER.VERIFYING_TEXT}</Text>
                            </View>
                          )}
                        </View>
                        <View style={styles.overlaySide} />
                      </View>
                      <View style={styles.overlayBottom}>
                        <Text style={styles.targetPrompt}>
                          {STRINGS.OWNER_QR_SCANNER.TARGET_PROMPT}
                        </Text>
                      </View>
                    </View>
                  </CameraViewComponent>
                </View>
              )}
            </View>
          ) : (
            /* STATE 3: MANUAL INPUT FALLBACK */
            <View style={styles.manualCard}>
              <View style={styles.manualIconWrap}>
                <Ionicons name="keypad" size={28} color={colors.light.primary} />
              </View>
              <Text style={styles.manualTitle}>{STRINGS.OWNER_QR_SCANNER.MANUAL_TITLE}</Text>
              <Text style={styles.manualDesc}>
                {STRINGS.OWNER_QR_SCANNER.MANUAL_DESC}
              </Text>

              <TextInput
                style={styles.manualInput}
                placeholder={STRINGS.OWNER_QR_SCANNER.MANUAL_PLACEHOLDER}
                placeholderTextColor={colors.light.textMuted}
                value={manualCode}
                onChangeText={setManualCode}
                autoCapitalize="characters"
                autoCorrect={false}
              />

              <TouchableOpacity
                style={styles.btnVerifyManual}
                onPress={handleManualVerify}
                disabled={isVerifying}
                activeOpacity={0.85}
              >
                {isVerifying ? (
                  <ActivityIndicator size="small" color={colors.light.white} />
                ) : (
                  <>
                    <Ionicons name="search" size={18} color={colors.light.white} />
                    <Text style={styles.btnVerifyManualText}>{STRINGS.OWNER_QR_SCANNER.BTN_VERIFY_MANUAL}</Text>
                  </>
                )}
              </TouchableOpacity>
            </View>
          )}

          {/* Error Banner */}
          {scanError && (
            <View style={styles.errorBox}>
              <Ionicons name="alert-circle" size={18} color={colors.light.error} />
              <View style={{ flex: 1 }}>
                <Text style={styles.errorTitle}>{STRINGS.OWNER_QR_SCANNER.ERR_VERIFICATION_FAILED}</Text>
                <Text style={styles.errorText}>{scanError}</Text>
              </View>
              <TouchableOpacity onPress={handleScanAgain}>
                <Ionicons name="refresh" size={18} color={colors.light.error} />
              </TouchableOpacity>
            </View>
          )}
        </ScrollView>
      </View>
    </Modal>
  );
}

function getStatusPillStyle(status: string) {
  switch (status) {
    case 'approved':
      return { backgroundColor: colors.light.primaryLight };
    case 'active':
      return { backgroundColor: colors.light.successLight };
    default:
      return { backgroundColor: colors.light.borderSubtle };
  }
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.light.background,
    paddingTop: Platform.OS === 'android' ? 36 : 48,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: colors.light.borderDefault,
    backgroundColor: colors.light.surface,
  },
  closeBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.light.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitleWrap: {
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: colors.light.textPrimary,
  },
  headerSubtitle: {
    fontSize: 12,
    color: colors.light.textSecondary,
    marginTop: 2,
  },
  tabBar: {
    flexDirection: 'row',
    backgroundColor: colors.light.surface,
    borderBottomWidth: 1,
    borderBottomColor: colors.light.borderDefault,
    paddingHorizontal: 16,
    paddingVertical: 8,
    gap: 12,
  },
  tabBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    borderRadius: 10,
    backgroundColor: colors.light.background,
    gap: 8,
  },
  tabBtnActive: {
    backgroundColor: colors.light.primaryLight,
  },
  tabBtnText: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.light.textSecondary,
  },
  tabBtnTextActive: {
    color: colors.light.primary,
  },
  contentScroll: {
    flex: 1,
  },
  contentScrollInner: {
    padding: 16,
    paddingBottom: 40,
  },
  cameraContainer: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  cameraWrapper: {
    width: '100%',
    height: 420,
    borderRadius: 20,
    overflow: 'hidden',
    backgroundColor: colors.light.black,
  },
  cameraView: {
    flex: 1,
  },
  overlay: {
    flex: 1,
  },
  overlayTop: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.55)',
  },
  overlayMiddle: {
    flexDirection: 'row',
    height: 250,
  },
  overlaySide: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.55)',
  },
  scanTarget: {
    width: 250,
    height: 250,
    position: 'relative',
    backgroundColor: 'transparent',
  },
  overlayBottom: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.55)',
    alignItems: 'center',
    paddingTop: 20,
  },
  targetPrompt: {
    color: colors.light.white,
    fontSize: 13,
    fontWeight: '500',
    textAlign: 'center',
    paddingHorizontal: 20,
  },
  reticleCorner: {
    position: 'absolute',
    width: 24,
    height: 24,
    borderColor: colors.light.primary,
  },
  reticleTL: {
    top: 0,
    left: 0,
    borderTopWidth: 4,
    borderLeftWidth: 4,
  },
  reticleTR: {
    top: 0,
    right: 0,
    borderTopWidth: 4,
    borderRightWidth: 4,
  },
  reticleBL: {
    bottom: 0,
    left: 0,
    borderBottomWidth: 4,
    borderLeftWidth: 4,
  },
  reticleBR: {
    bottom: 0,
    right: 0,
    borderBottomWidth: 4,
    borderRightWidth: 4,
  },
  verifyingOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.6)',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  verifyingText: {
    color: colors.light.white,
    fontSize: 13,
    fontWeight: '600',
  },
  permissionBox: {
    backgroundColor: colors.light.surface,
    borderRadius: 16,
    padding: 24,
    alignItems: 'center',
    width: '100%',
    shadowColor: colors.light.shadow,
    shadowOpacity: 0.05,
    shadowRadius: 10,
    elevation: 2,
  },
  permissionTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: colors.light.textPrimary,
    marginTop: 12,
  },
  permissionDesc: {
    fontSize: 13,
    color: colors.light.textSecondary,
    textAlign: 'center',
    marginTop: 6,
    lineHeight: 19,
  },
  permissionBtn: {
    marginTop: 20,
    backgroundColor: colors.light.primary,
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 12,
    width: '100%',
    alignItems: 'center',
  },
  permissionBtnText: {
    color: colors.light.white,
    fontSize: 14,
    fontWeight: '600',
  },
  manualCard: {
    backgroundColor: colors.light.surface,
    borderRadius: 16,
    padding: 24,
    shadowColor: colors.light.shadow,
    shadowOpacity: 0.05,
    shadowRadius: 10,
    elevation: 2,
  },
  manualIconWrap: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: colors.light.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  manualTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: colors.light.textPrimary,
  },
  manualDesc: {
    fontSize: 13,
    color: colors.light.textSecondary,
    marginTop: 4,
    lineHeight: 18,
  },
  manualInput: {
    backgroundColor: colors.light.background,
    borderWidth: 1,
    borderColor: colors.light.borderDefault,
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 15,
    fontWeight: '600',
    color: colors.light.textPrimary,
    marginTop: 16,
  },
  btnVerifyManual: {
    backgroundColor: colors.light.primary,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    borderRadius: 12,
    gap: 8,
    marginTop: 16,
  },
  btnVerifyManualText: {
    color: colors.light.white,
    fontSize: 14,
    fontWeight: '600',
  },
  verifiedCard: {
    backgroundColor: colors.light.surface,
    borderRadius: 16,
    padding: 18,
    shadowColor: colors.light.shadow,
    shadowOpacity: 0.06,
    shadowRadius: 12,
    elevation: 3,
  },
  successBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.light.successLight,
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 10,
    gap: 8,
    marginBottom: 16,
  },
  successBadgeText: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.light.success,
  },
  orderHeadRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: colors.light.border,
  },
  orderLabel: {
    fontSize: 11,
    color: colors.light.textSecondary,
    fontWeight: '500',
  },
  orderCode: {
    fontSize: 17,
    fontWeight: '800',
    color: colors.light.textPrimary,
  },
  statusPill: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
  },
  statusPillText: {
    fontSize: 11,
    fontWeight: '700',
    color: colors.light.primary,
  },
  deviceRow: {
    flexDirection: 'row',
    marginTop: 14,
    gap: 12,
  },
  deviceThumb: {
    width: 72,
    height: 72,
    borderRadius: 12,
    backgroundColor: colors.light.border,
  },
  deviceMeta: {
    flex: 1,
    justifyContent: 'center',
  },
  deviceName: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.light.textPrimary,
  },
  deviceDays: {
    fontSize: 12,
    color: colors.light.textSecondary,
    marginTop: 3,
  },
  deviceAmount: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.light.primary,
    marginTop: 4,
  },
  renterBox: {
    marginTop: 16,
    paddingTop: 14,
    borderTopWidth: 1,
    borderTopColor: colors.light.border,
  },
  sectionHeading: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.light.textSecondary,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  renterRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 10,
    gap: 10,
  },
  renterAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.light.border,
  },
  renterInfo: {
    flex: 1,
  },
  renterName: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.light.textPrimary,
  },
  renterPhone: {
    fontSize: 12,
    color: colors.light.textSecondary,
    marginTop: 2,
  },
  photoCheckCard: {
    flexDirection: 'row',
    backgroundColor: colors.light.background,
    borderRadius: 12,
    padding: 12,
    marginTop: 14,
    gap: 10,
    alignItems: 'flex-start',
    borderWidth: 1,
    borderColor: colors.light.borderDefault,
  },
  photoCheckInfo: {
    flex: 1,
  },
  photoCheckTitle: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.light.textPrimary,
  },
  photoCheckDesc: {
    fontSize: 11,
    color: colors.light.textSecondary,
    marginTop: 2,
    lineHeight: 15,
  },
  actionButtonsCol: {
    marginTop: 18,
    gap: 10,
  },
  btnConfirmHandover: {
    backgroundColor: colors.light.success,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    borderRadius: 12,
    gap: 8,
  },
  btnConfirmHandoverText: {
    color: colors.light.white,
    fontSize: 15,
    fontWeight: '700',
  },
  btnScanAnother: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    borderRadius: 12,
    backgroundColor: colors.light.border,
    gap: 6,
  },
  btnScanAnotherText: {
    color: colors.light.textSecondary,
    fontSize: 13,
    fontWeight: '600',
  },
  alreadyActiveBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.light.primaryLight,
    padding: 12,
    borderRadius: 10,
    gap: 8,
  },
  alreadyActiveText: {
    flex: 1,
    fontSize: 12,
    color: colors.light.primaryDark,
    fontWeight: '600',
  },
  otherStatusBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.light.border,
    padding: 12,
    borderRadius: 10,
    gap: 8,
  },
  otherStatusText: {
    flex: 1,
    fontSize: 12,
    color: colors.light.textSecondary,
  },
  errorBox: {
    flexDirection: 'row',
    backgroundColor: colors.light.dangerLight,
    borderWidth: 1,
    borderColor: colors.light.error,
    borderRadius: 12,
    padding: 12,
    marginTop: 16,
    gap: 10,
    alignItems: 'center',
  },
  errorTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.light.error,
  },
  errorText: {
    fontSize: 12,
    color: colors.light.error,
    marginTop: 2,
  },
});
