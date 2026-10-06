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
import { CameraView, useCameraPermissions, BarcodeScanningResult } from 'expo-camera';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../../theme/colors';
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
        setScanError('Booking not found or invalid QR token. Please check the code.');
        setVerifiedBooking(null);
      } else {
        setVerifiedBooking(booking);
      }
    } catch (err: any) {
      const msg =
        err?.response?.data?.message ||
        'Unable to verify QR token. Please check and try again.';
      setScanError(msg);
      setVerifiedBooking(null);
    } finally {
      setIsVerifying(false);
    }
  };

  const handleBarcodeScanned = (result: BarcodeScanningResult) => {
    if (scannedData || isVerifying || verifiedBooking) return;
    const data = result.data;
    if (!data) return;

    setScannedData(data);
    parseAndVerifyToken(data);
  };

  const handleManualVerify = () => {
    if (!manualCode.trim()) {
      Alert.alert('Required', 'Please enter a booking code or QR verification token.');
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
        'Handover Successful! 🎉',
        `Booking #${verifiedBooking.bookingCode} is now ACTIVE. Rental timer has started.`,
        [
          {
            text: 'OK',
            onPress: () => {
              onHandoverSuccess?.(updated);
              onClose();
            },
          },
        ]
      );
    } catch (err: any) {
      const msg =
        err?.response?.data?.message || 'Failed to activate handover. Please try again.';
      Alert.alert('Handover Error', msg);
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
            <Ionicons name="close" size={24} color="#1E293B" />
          </TouchableOpacity>

          <View style={styles.headerTitleWrap}>
            <Text style={styles.headerTitle}>Scan Handover QR</Text>
            <Text style={styles.headerSubtitle}>Verify & activate device rental</Text>
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
                color={activeTab === 'camera' ? colors.light.primary : '#64748B'}
              />
              <Text
                style={[styles.tabBtnText, activeTab === 'camera' && styles.tabBtnTextActive]}
              >
                Camera Scanner
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
                color={activeTab === 'manual' ? colors.light.primary : '#64748B'}
              />
              <Text
                style={[styles.tabBtnText, activeTab === 'manual' && styles.tabBtnTextActive]}
              >
                Manual Input
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
                <Ionicons name="checkmark-circle" size={24} color="#059669" />
                <Text style={styles.successBadgeText}>Valid Handover QR Verified</Text>
              </View>

              {/* Order Info */}
              <View style={styles.orderHeadRow}>
                <View>
                  <Text style={styles.orderLabel}>Booking Code</Text>
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
                      'Tech Device'}
                  </Text>
                  <Text style={styles.deviceDays}>
                    Rental duration: {verifiedBooking.totalDays} days
                  </Text>
                  <Text style={styles.deviceAmount}>
                    Total: {(verifiedBooking.totalAmount || 0).toLocaleString('en-US')} VND
                  </Text>
                </View>
              </View>

              {/* Renter Details */}
              <View style={styles.renterBox}>
                <Text style={styles.sectionHeading}>Renter Information</Text>
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
                      {(verifiedBooking.renterId as any)?.name || 'Renter'}
                    </Text>
                    <Text style={styles.renterPhone}>
                      Phone: {(verifiedBooking.renterId as any)?.phone || 'Not provided'}
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
                    verifiedBooking.handoverPhotos?.beforeRental?.length ? '#059669' : '#D97706'
                  }
                />
                <View style={styles.photoCheckInfo}>
                  <Text style={styles.photoCheckTitle}>
                    Before-Rental Device Photos (4 angles)
                  </Text>
                  <Text style={styles.photoCheckDesc}>
                    {verifiedBooking.handoverPhotos?.beforeRental?.length
                      ? `Renter uploaded ${verifiedBooking.handoverPhotos.beforeRental.length}/4 condition verification photos.`
                      : 'No photos taken yet. Renter can take photos upon receipt.'}
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
                      <ActivityIndicator size="small" color="#FFFFFF" />
                    ) : (
                      <>
                        <Ionicons name="shield-checkmark" size={18} color="#FFFFFF" />
                        <Text style={styles.btnConfirmHandoverText}>
                          Confirm Handover & Activate
                        </Text>
                      </>
                    )}
                  </TouchableOpacity>
                ) : verifiedBooking.status === 'active' ? (
                  <View style={styles.alreadyActiveBanner}>
                    <Ionicons name="checkmark-circle" size={18} color="#0284C7" />
                    <Text style={styles.alreadyActiveText}>
                      This rental is ALREADY ACTIVE and in progress.
                    </Text>
                  </View>
                ) : (
                  <View style={styles.otherStatusBanner}>
                    <Ionicons name="information-circle" size={18} color="#64748B" />
                    <Text style={styles.otherStatusText}>
                      Current status: {verifiedBooking.status}. Handover is only available for
                      Approved orders.
                    </Text>
                  </View>
                )}

                <TouchableOpacity
                  style={styles.btnScanAnother}
                  onPress={handleScanAgain}
                  activeOpacity={0.7}
                >
                  <Ionicons name="scan-outline" size={16} color="#475569" />
                  <Text style={styles.btnScanAnotherText}>Scan Another Code</Text>
                </TouchableOpacity>
              </View>
            </View>
          ) : activeTab === 'camera' ? (
            /* STATE 2: LIVE CAMERA SCANNER */
            <View style={styles.cameraContainer}>
              {!permission?.granted ? (
                <View style={styles.permissionBox}>
                  <Ionicons name="camera-reverse-outline" size={48} color="#64748B" />
                  <Text style={styles.permissionTitle}>Camera Permission Required</Text>
                  <Text style={styles.permissionDesc}>
                    We need your permission to access the camera to scan handover QR codes.
                  </Text>
                  <TouchableOpacity
                    style={styles.permissionBtn}
                    onPress={requestPermission}
                    activeOpacity={0.85}
                  >
                    <Text style={styles.permissionBtnText}>Grant Camera Access</Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={[styles.permissionBtn, { backgroundColor: '#F1F5F9', marginTop: 12 }]}
                    onPress={() => setActiveTab('manual')}
                  >
                    <Text style={[styles.permissionBtnText, { color: '#334155' }]}>
                      Use Manual Input Instead
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
                              <ActivityIndicator size="large" color="#FFFFFF" />
                              <Text style={styles.verifyingText}>Verifying code...</Text>
                            </View>
                          )}
                        </View>
                        <View style={styles.overlaySide} />
                      </View>
                      <View style={styles.overlayBottom}>
                        <Text style={styles.targetPrompt}>
                          Align the renter's QR code within the frame
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
              <Text style={styles.manualTitle}>Enter Handover Code</Text>
              <Text style={styles.manualDesc}>
                Type the booking code (e.g. #TS123456) or the handover token provided on the
                renter's screen.
              </Text>

              <TextInput
                style={styles.manualInput}
                placeholder="e.g. TS123456 or TSQR-..."
                placeholderTextColor="#94A3B8"
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
                  <ActivityIndicator size="small" color="#FFFFFF" />
                ) : (
                  <>
                    <Ionicons name="search" size={18} color="#FFFFFF" />
                    <Text style={styles.btnVerifyManualText}>Verify & Inspect Booking</Text>
                  </>
                )}
              </TouchableOpacity>
            </View>
          )}

          {/* Error Banner */}
          {scanError && (
            <View style={styles.errorBox}>
              <Ionicons name="alert-circle" size={18} color="#EF4444" />
              <View style={{ flex: 1 }}>
                <Text style={styles.errorTitle}>Verification Failed</Text>
                <Text style={styles.errorText}>{scanError}</Text>
              </View>
              <TouchableOpacity onPress={handleScanAgain}>
                <Ionicons name="refresh" size={18} color="#EF4444" />
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
      return { backgroundColor: '#E0F2FE' };
    case 'active':
      return { backgroundColor: '#DCFCE7' };
    default:
      return { backgroundColor: '#F1F5F9' };
  }
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8FAFC',
    paddingTop: Platform.OS === 'android' ? 36 : 48,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
    backgroundColor: '#FFFFFF',
  },
  closeBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#F1F5F9',
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitleWrap: {
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: '#0F172A',
  },
  headerSubtitle: {
    fontSize: 12,
    color: '#64748B',
    marginTop: 2,
  },
  tabBar: {
    flexDirection: 'row',
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
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
    backgroundColor: '#F8FAFC',
    gap: 8,
  },
  tabBtnActive: {
    backgroundColor: colors.light.primaryLight || '#EEF2FF',
  },
  tabBtnText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#64748B',
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
    backgroundColor: '#000000',
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
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '500',
    textAlign: 'center',
    paddingHorizontal: 20,
  },
  reticleCorner: {
    position: 'absolute',
    width: 24,
    height: 24,
    borderColor: '#3B82F6',
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
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '600',
  },
  permissionBox: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 24,
    alignItems: 'center',
    width: '100%',
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowRadius: 10,
    elevation: 2,
  },
  permissionTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: '#0F172A',
    marginTop: 12,
  },
  permissionDesc: {
    fontSize: 13,
    color: '#64748B',
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
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
  },
  manualCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 24,
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowRadius: 10,
    elevation: 2,
  },
  manualIconWrap: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: colors.light.primaryLight || '#EEF2FF',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  manualTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: '#0F172A',
  },
  manualDesc: {
    fontSize: 13,
    color: '#64748B',
    marginTop: 4,
    lineHeight: 18,
  },
  manualInput: {
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 15,
    fontWeight: '600',
    color: '#0F172A',
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
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
  },
  verifiedCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 18,
    shadowColor: '#000',
    shadowOpacity: 0.06,
    shadowRadius: 12,
    elevation: 3,
  },
  successBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#DCFCE7',
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 10,
    gap: 8,
    marginBottom: 16,
  },
  successBadgeText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#059669',
  },
  orderHeadRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  orderLabel: {
    fontSize: 11,
    color: '#64748B',
    fontWeight: '500',
  },
  orderCode: {
    fontSize: 17,
    fontWeight: '800',
    color: '#0F172A',
  },
  statusPill: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
  },
  statusPillText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#0284C7',
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
    backgroundColor: '#F1F5F9',
  },
  deviceMeta: {
    flex: 1,
    justifyContent: 'center',
  },
  deviceName: {
    fontSize: 14,
    fontWeight: '700',
    color: '#0F172A',
  },
  deviceDays: {
    fontSize: 12,
    color: '#64748B',
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
    borderTopColor: '#F1F5F9',
  },
  sectionHeading: {
    fontSize: 12,
    fontWeight: '700',
    color: '#64748B',
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
    backgroundColor: '#F1F5F9',
  },
  renterInfo: {
    flex: 1,
  },
  renterName: {
    fontSize: 14,
    fontWeight: '700',
    color: '#0F172A',
  },
  renterPhone: {
    fontSize: 12,
    color: '#64748B',
    marginTop: 2,
  },
  photoCheckCard: {
    flexDirection: 'row',
    backgroundColor: '#F8FAFC',
    borderRadius: 12,
    padding: 12,
    marginTop: 14,
    gap: 10,
    alignItems: 'flex-start',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  photoCheckInfo: {
    flex: 1,
  },
  photoCheckTitle: {
    fontSize: 12,
    fontWeight: '700',
    color: '#1E293B',
  },
  photoCheckDesc: {
    fontSize: 11,
    color: '#64748B',
    marginTop: 2,
    lineHeight: 15,
  },
  actionButtonsCol: {
    marginTop: 18,
    gap: 10,
  },
  btnConfirmHandover: {
    backgroundColor: '#059669',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    borderRadius: 12,
    gap: 8,
  },
  btnConfirmHandoverText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '700',
  },
  btnScanAnother: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    borderRadius: 12,
    backgroundColor: '#F1F5F9',
    gap: 6,
  },
  btnScanAnotherText: {
    color: '#475569',
    fontSize: 13,
    fontWeight: '600',
  },
  alreadyActiveBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#E0F2FE',
    padding: 12,
    borderRadius: 10,
    gap: 8,
  },
  alreadyActiveText: {
    flex: 1,
    fontSize: 12,
    color: '#0369A1',
    fontWeight: '600',
  },
  otherStatusBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F1F5F9',
    padding: 12,
    borderRadius: 10,
    gap: 8,
  },
  otherStatusText: {
    flex: 1,
    fontSize: 12,
    color: '#475569',
  },
  errorBox: {
    flexDirection: 'row',
    backgroundColor: '#FEF2F2',
    borderWidth: 1,
    borderColor: '#FCA5A5',
    borderRadius: 12,
    padding: 12,
    marginTop: 16,
    gap: 10,
    alignItems: 'center',
  },
  errorTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: '#B91C1C',
  },
  errorText: {
    fontSize: 12,
    color: '#991B1B',
    marginTop: 2,
  },
});
