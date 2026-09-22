import React from 'react';
import {
  StyleSheet,
  View,
  Text,
  TouchableOpacity,
  Modal,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { theme } from '../../constants/theme';

export interface LogoutConfirmModalProps {
  /**
   * Trạng thái hiển thị modal
   */
  visible: boolean;
  /**
   * Callback khi người dùng hủy bỏ hoặc đóng modal
   */
  onClose: () => void;
  /**
   * Callback khi người dùng xác nhận đăng xuất
   */
  onConfirm: () => void;
  /**
   * Tiêu đề của modal (Mặc định: 'Xác nhận đăng xuất')
   */
  title?: string;
  /**
   * Nội dung mô tả chi tiết của modal
   */
  subtitle?: string;
  /**
   * Chữ hiển thị trên nút xác nhận (Mặc định: 'Đăng xuất')
   */
  confirmButtonText?: string;
  /**
   * Chữ hiển thị trên nút hủy (Mặc định: 'Hủy')
   */
  cancelButtonText?: string;
  /**
   * Icon hiển thị ở huy hiệu trên cùng (Mặc định: 'log-out-outline')
   */
  iconName?: keyof typeof Ionicons.glyphMap;
}

/**
 * Component Modal Xác nhận Đăng xuất phong cách Soft UI 2026.
 * Có thể tái sử dụng cho Admin, Khách thuê (Renter), Chủ máy (Owner) hoặc Profile.
 */
export function LogoutConfirmModal({
  visible,
  onClose,
  onConfirm,
  title = 'Xác nhận đăng xuất',
  subtitle = 'Bạn có chắc chắn muốn kết thúc phiên làm việc và đăng xuất khỏi tài khoản?',
  confirmButtonText = 'Đăng xuất',
  cancelButtonText = 'Hủy',
  iconName = 'log-out-outline',
}: LogoutConfirmModalProps) {
  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      statusBarTranslucent
      onRequestClose={onClose}
    >
      <View style={styles.modalOverlay}>
        {/* Lớp nền mờ, chạm để đóng */}
        <TouchableOpacity
          style={styles.modalBackdropTouch}
          activeOpacity={1}
          onPress={onClose}
          accessibilityLabel="Đóng modal"
        />

        {/* Card nội dung chính bo tròn mềm */}
        <View style={styles.modalCard}>
          {/* Huy hiệu Icon Pastel */}
          <View style={styles.modalIconBox}>
            <Ionicons name={iconName} size={28} color={theme.colors.danger[600]} />
          </View>

          {/* Tiêu đề & Nội dung mô tả */}
          <Text style={styles.modalTitle}>{title}</Text>
          <Text style={styles.modalSubtitle}>{subtitle}</Text>

          {/* Hai nút hành động dạng Pill */}
          <View style={styles.modalActionRow}>
            <TouchableOpacity
              style={styles.modalCancelBtn}
              onPress={onClose}
              activeOpacity={0.7}
              accessibilityRole="button"
              accessibilityLabel={cancelButtonText}
            >
              <Text style={styles.modalCancelBtnText}>{cancelButtonText}</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.modalLogoutBtn}
              onPress={onConfirm}
              activeOpacity={0.8}
              accessibilityRole="button"
              accessibilityLabel={confirmButtonText}
            >
              <Ionicons name="log-out" size={16} color={theme.colors.white} />
              <Text style={styles.modalLogoutBtnText}>{confirmButtonText}</Text>
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
    backgroundColor: 'rgba(15, 23, 42, 0.55)', // Soft dark backdrop
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 24,
  },
  modalBackdropTouch: {
    ...StyleSheet.absoluteFillObject,
  },
  modalCard: {
    width: '100%',
    maxWidth: 320,
    backgroundColor: theme.colors.white,
    borderRadius: 24,
    paddingTop: 28,
    paddingBottom: 22,
    paddingHorizontal: 22,
    alignItems: 'center',
    ...theme.shadows.card,
    elevation: 20,
  },
  modalIconBox: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: theme.colors.danger[50],
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: theme.textPrimary,
    marginBottom: 8,
    textAlign: 'center',
  },
  modalSubtitle: {
    fontSize: 13,
    color: theme.textSecondary,
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 24,
    paddingHorizontal: 8,
  },
  modalActionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    width: '100%',
  },
  modalCancelBtn: {
    flex: 1,
    height: 44,
    borderRadius: theme.radii.full,
    backgroundColor: theme.colors.slate[100],
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalCancelBtnText: {
    fontSize: 14,
    fontWeight: '600',
    color: theme.textPrimary,
  },
  modalLogoutBtn: {
    flex: 1,
    height: 44,
    borderRadius: theme.radii.full,
    backgroundColor: theme.colors.danger[600],
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: 6,
    ...theme.shadows.subtle,
  },
  modalLogoutBtnText: {
    fontSize: 14,
    fontWeight: '700',
    color: theme.colors.white,
  },
});
