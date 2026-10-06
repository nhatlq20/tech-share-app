import React from 'react';
import {
  StyleSheet,
  View,
  Text,
  Modal,
  TouchableOpacity,
  Pressable,
  Platform,
  Alert,
} from 'react-native';
import QRCode from 'react-native-qrcode-svg';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../../theme/colors';
import { Booking } from '../../services/bookingService';

interface HandoverQrModalProps {
  visible: boolean;
  booking: Booking | null;
  onClose: () => void;
}

export function HandoverQrModal({ visible, booking, onClose }: HandoverQrModalProps) {
  if (!booking) return null;

  const device = booking.deviceId || {};
  const deviceName = device.name || device.title || 'Thiết bị';
  const qrCodeValue = JSON.stringify({
    type: 'TECHSHARE_HANDOVER',
    bookingId: booking._id,
    bookingCode: booking.bookingCode,
    qrToken: booking.qrToken || `TSQR-${booking.bookingCode}`,
  });

  const handleCopyCode = () => {
    Alert.alert('Mã đơn thuê', `#${booking.bookingCode}\n\nMã xác thực: ${booking.qrToken || 'Chưa có'}`);
  };

  const QRCodeComponent: any = QRCode;

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <Pressable style={styles.backdrop} onPress={onClose}>
        <Pressable style={styles.modalCard} onPress={(e: any) => e.stopPropagation()}>
          {/* Header */}
          <View style={styles.headerRow}>
            <View style={styles.iconCircle}>
              <Ionicons name="qr-code" size={20} color={colors.light.primary} />
            </View>
            <View style={styles.headerTextWrap}>
              <Text style={styles.modalTitle}>Mã QR Bàn giao</Text>
              <Text style={styles.modalSubtitle}>Xuất trình khi nhận máy</Text>
            </View>
            <TouchableOpacity style={styles.closeBtn} onPress={onClose}>
              <Ionicons name="close" size={20} color="#64748B" />
            </TouchableOpacity>
          </View>

          {/* Badge trạng thái */}
          <View style={styles.statusBadge}>
            <View style={styles.statusDot} />
            <Text style={styles.statusText}>Sẵn sàng đối soát bàn giao</Text>
          </View>

          {/* QR Code Frame */}
          <View style={styles.qrContainer}>
            <View style={styles.qrInnerBox}>
              <QRCodeComponent
                value={qrCodeValue}
                size={210}
                color="#0F172A"
                backgroundColor="#FFFFFF"
              />
            </View>
          </View>

          {/* Booking Info Box */}
          <View style={styles.infoBox}>
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Mã đơn thuê:</Text>
              <TouchableOpacity onPress={handleCopyCode} style={styles.copyRow}>
                <Text style={styles.bookingCodeText}>#{booking.bookingCode}</Text>
                <Ionicons name="copy-outline" size={14} color={colors.light.primary} />
              </TouchableOpacity>
            </View>

            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Thiết bị:</Text>
              <Text style={styles.infoValue} numberOfLines={1}>
                {deviceName}
              </Text>
            </View>

            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Thời gian:</Text>
              <Text style={styles.infoValue}>
                {booking.totalDays} ngày thuê
              </Text>
            </View>
          </View>

          {/* Hướng dẫn an toàn */}
          <View style={styles.hintBox}>
            <Ionicons name="shield-checkmark-outline" size={16} color="#059669" />
            <Text style={styles.hintText}>
              Đưa mã QR này cho Chủ máy quét xác nhận khi hai bên gặp mặt trực tiếp để nhận thiết bị.
            </Text>
          </View>

          {/* Nút đóng */}
          <TouchableOpacity style={styles.doneBtn} onPress={onClose} activeOpacity={0.85}>
            <Text style={styles.doneBtnText}>Đóng</Text>
          </TouchableOpacity>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.65)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalCard: {
    width: '100%',
    maxWidth: 380,
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    padding: 22,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.15,
    shadowRadius: 20,
    elevation: 8,
  },
  headerRow: {
    width: '100%',
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 14,
  },
  iconCircle: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#EFF6FF',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  headerTextWrap: {
    flex: 1,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#0F172A',
  },
  modalSubtitle: {
    fontSize: 12,
    color: '#64748B',
    marginTop: 2,
  },
  closeBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#F1F5F9',
    alignItems: 'center',
    justifyContent: 'center',
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#ECFDF5',
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 20,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#A7F3D0',
  },
  statusDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#059669',
  },
  statusText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#047857',
  },
  qrContainer: {
    backgroundColor: '#F8FAFC',
    padding: 16,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
    marginBottom: 16,
  },
  qrInnerBox: {
    padding: 10,
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
  },
  infoBox: {
    width: '100%',
    backgroundColor: '#F8FAFC',
    borderRadius: 14,
    padding: 12,
    borderWidth: 1,
    borderColor: '#F1F5F9',
    gap: 8,
    marginBottom: 12,
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  infoLabel: {
    fontSize: 13,
    color: '#64748B',
  },
  copyRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  bookingCodeText: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.light.primary,
  },
  infoValue: {
    fontSize: 13,
    fontWeight: '600',
    color: '#0F172A',
    maxWidth: '65%',
  },
  hintBox: {
    width: '100%',
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
    backgroundColor: '#F0FDF4',
    padding: 10,
    borderRadius: 12,
    marginBottom: 16,
  },
  hintText: {
    flex: 1,
    fontSize: 12,
    color: '#166534',
    lineHeight: 17,
  },
  doneBtn: {
    width: '100%',
    backgroundColor: colors.light.primary,
    paddingVertical: 12,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  doneBtnText: {
    fontSize: 15,
    fontWeight: '700',
    color: '#FFFFFF',
  },
});
