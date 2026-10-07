import React from 'react';
import {
  StyleSheet,
  View,
  Text,
  TouchableOpacity,
  Modal,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { theme, STRINGS, CONFIG } from '../../constants';

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
   * Tiêu đề của modal
   */
  title?: string;
  /**
   * Nội dung mô tả chi tiết của modal
   */
  subtitle?: string;
  /**
   * Chữ hiển thị trên nút xác nhận
   */
  confirmButtonText?: string;
  /**
   * Chữ hiển thị trên nút hủy
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
  title = STRINGS.LOGOUT_MODAL.DEFAULT_TITLE,
  subtitle = STRINGS.LOGOUT_MODAL.DEFAULT_SUBTITLE,
  confirmButtonText = STRINGS.LOGOUT_MODAL.DEFAULT_CONFIRM,
  cancelButtonText = STRINGS.LOGOUT_MODAL.DEFAULT_CANCEL,
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
          accessibilityLabel={STRINGS.LOGOUT_MODAL.CLOSE_ACCESSIBILITY}
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
              activeOpacity={CONFIG.ANIMATION.ACTIVE_OPACITY_BUTTON}
              accessibilityRole="button"
              accessibilityLabel={cancelButtonText}
            >
              <Text style={styles.modalCancelBtnText}>{cancelButtonText}</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.modalLogoutBtn}
              onPress={onConfirm}
              activeOpacity={CONFIG.ANIMATION.ACTIVE_OPACITY_BUTTON}
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
    backgroundColor: theme.overlay, // Soft dark backdrop
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: theme.spacing['2xl'],
  },
  modalBackdropTouch: {
    ...StyleSheet.absoluteFillObject,
  },
  modalCard: {
    width: '100%',
    maxWidth: 320,
    backgroundColor: theme.colors.white,
    borderRadius: theme.radii.xl,
    paddingTop: theme.spacing.xl + 8,
    paddingBottom: theme.spacing.lg + 6,
    paddingHorizontal: theme.spacing.lg + 6,
    alignItems: 'center',
    ...theme.shadows.card,
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
