import React, { useState } from 'react';
import {
  StyleSheet,
  View,
  Text,
  TouchableOpacity,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { theme } from '../../../constants/theme';

export interface VoucherItem {
  id: string;
  code: string;
  discountType: 'percentage' | 'fixed';
  discountValue: number;
  minOrderValue: number;
  maxUsage: number;
  usageCount: number;
  validUntil: string;
  isActive: boolean;
  description: string;
}

export const INITIAL_VOUCHERS: VoucherItem[] = [
  {
    id: 'v1',
    code: 'TECHSHARE50',
    discountType: 'fixed',
    discountValue: 50000,
    minOrderValue: 200000,
    maxUsage: 100,
    usageCount: 42,
    validUntil: '2026-12-31',
    isActive: true,
    description: 'Giảm 50.000đ cho mọi đơn thuê thiết bị lần đầu trên hệ thống TechShare.',
  },
  {
    id: 'v2',
    code: 'PROCREATOR15',
    discountType: 'percentage',
    discountValue: 15,
    minOrderValue: 500000,
    maxUsage: 50,
    usageCount: 18,
    validUntil: '2026-10-31',
    isActive: true,
    description: 'Giảm 15% gói thuê máy ảnh Sony / Canon chuyên nghiệp từ 3 ngày trở lên.',
  },
  {
    id: 'v3',
    code: 'WEEKENDCAM',
    discountType: 'fixed',
    discountValue: 100000,
    minOrderValue: 800000,
    maxUsage: 30,
    usageCount: 30,
    validUntil: '2026-08-31',
    isActive: false,
    description: 'Khuyến mãi thuê máy quay & flycam dịp cuối tuần (Đã hết hạn/hết lượt).',
  },
  {
    id: 'v4',
    code: 'WELCOME2026',
    discountType: 'percentage',
    discountValue: 10,
    minOrderValue: 150000,
    maxUsage: 200,
    usageCount: 88,
    validUntil: '2026-12-31',
    isActive: true,
    description: 'Mã chào mừng thành viên mới đăng ký tài khoản và eKYC thành công.',
  },
];

export function VouchersTab() {
  const [vouchersList, setVouchersList] = useState(INITIAL_VOUCHERS as VoucherItem[]);

  const handleCreateVoucher = () => {
    Alert.prompt
      ? Alert.prompt('Tạo mã Voucher mới', 'Nhập mã code khuyến mãi (VD: SUMMER2026):', [
          { text: 'Hủy', style: 'cancel' },
          {
            text: 'Tạo',
            onPress: (text?: string) => {
              const code = text?.trim().toUpperCase();
              if (!code) return;
              const newV: VoucherItem = {
                id: 'v_' + Date.now(),
                code,
                discountType: 'percentage',
                discountValue: 10,
                minOrderValue: 200000,
                maxUsage: 50,
                usageCount: 0,
                validUntil: '2026-12-31',
                isActive: true,
                description: `Voucher ưu đãi ${code} do Quản trị viên kích hoạt.`,
              };
              setVouchersList((prev: VoucherItem[]) => [newV, ...prev]);
              Alert.alert('Thành công', `Đã tạo voucher ${code} thành công.`);
            },
          },
        ])
      : Alert.alert('Tạo mã Voucher', 'Đã thêm mã mới NEWYEAR2026 vào hệ thống!', [
          {
            text: 'OK',
            onPress: () => {
              const newV: VoucherItem = {
                id: 'v_' + Date.now(),
                code: 'NEWYEAR2026',
                discountType: 'fixed',
                discountValue: 100000,
                minOrderValue: 500000,
                maxUsage: 50,
                usageCount: 0,
                validUntil: '2026-12-31',
                isActive: true,
                description: 'Voucher ưu đãi đầu năm 2026 cho toàn bộ thiết bị.',
              };
              setVouchersList((prev: VoucherItem[]) => [newV, ...prev]);
            },
          },
        ]);
  };

  const handleToggleVoucher = (voucher: VoucherItem) => {
    setVouchersList((prev: VoucherItem[]) =>
      prev.map((v: VoucherItem) => (v.id === voucher.id ? { ...v, isActive: !v.isActive } : v))
    );
  };

  return (
    <View style={styles.sectionBlock}>
      <View style={styles.sectionTitleRow}>
        <View style={styles.sectionTitleLeft}>
          <Ionicons name="pricetags-outline" size={16} color={theme.colors.primary[600]} />
          <Text style={styles.sectionHeaderTitle}>Mã khuyến mãi toàn sàn</Text>
        </View>

        <TouchableOpacity
          style={styles.btnCreateVoucher}
          onPress={handleCreateVoucher}
          activeOpacity={0.8}
        >
          <Ionicons name="add" size={16} color={theme.colors.white} />
          <Text style={styles.btnCreateVoucherText}>Tạo mã</Text>
        </TouchableOpacity>
      </View>

      {vouchersList.map((v: VoucherItem) => (
        <View key={v.id} style={styles.voucherCard}>
          <View style={styles.cardHeader}>
            <View style={styles.codeRow}>
              <View style={styles.ticketIconBox}>
                <Ionicons name="ticket-outline" size={18} color={theme.colors.primary[600]} />
              </View>
              <Text style={styles.voucherCode}>{v.code}</Text>
            </View>

            <View
              style={[
                styles.statusBadge,
                {
                  backgroundColor: v.isActive
                    ? theme.colors.success[50]
                    : theme.colors.slate[100],
                },
              ]}
            >
              <Text
                style={[
                  styles.statusBadgeText,
                  {
                    color: v.isActive
                      ? theme.colors.success[600]
                      : theme.colors.slate[600],
                  },
                ]}
              >
                {v.isActive ? 'Đang kích hoạt' : 'Tạm dừng'}
              </Text>
            </View>
          </View>

          <Text style={styles.voucherDesc}>{v.description}</Text>

          {/* Specs Grid */}
          <View style={styles.specsRow}>
            <View style={styles.specItem}>
              <Text style={styles.specLabel}>Mức giảm giá:</Text>
              <Text style={styles.specValuePrimary}>
                {v.discountType === 'percentage'
                  ? `${v.discountValue}%`
                  : `${v.discountValue.toLocaleString('vi-VN')} đ`}
              </Text>
            </View>

            <View style={styles.specItem}>
              <Text style={styles.specLabel}>Đơn tối thiểu:</Text>
              <Text style={styles.specValue}>
                {v.minOrderValue.toLocaleString('vi-VN')} đ
              </Text>
            </View>

            <View style={styles.specItem}>
              <Text style={styles.specLabel}>Đã dùng:</Text>
              <Text style={styles.specValue}>
                {v.usageCount}/{v.maxUsage}
              </Text>
            </View>
          </View>

          {/* Footer */}
          <View style={styles.cardFooter}>
            <View style={styles.expiryRow}>
              <Ionicons name="calendar-outline" size={13} color={theme.textSecondary} />
              <Text style={styles.expiryText}>Hạn dùng: {v.validUntil}</Text>
            </View>

            <TouchableOpacity
              style={[
                styles.btnToggleStatus,
                {
                  backgroundColor: v.isActive
                    ? theme.colors.danger[50]
                    : theme.colors.primary[50],
                },
              ]}
              onPress={() => handleToggleVoucher(v)}
              activeOpacity={0.8}
            >
              <Text
                style={[
                  styles.btnToggleText,
                  {
                    color: v.isActive
                      ? theme.colors.danger[600]
                      : theme.colors.primary[600],
                  },
                ]}
              >
                {v.isActive ? 'Tạm dừng' : 'Kích hoạt lại'}
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  sectionBlock: {
    marginBottom: 4,
  },
  sectionTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 2,
  },
  sectionTitleLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  sectionHeaderTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: theme.textPrimary,
  },
  btnCreateVoucher: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: theme.colors.primary[600],
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: theme.radii.full,
    ...theme.shadows.subtle,
  },
  btnCreateVoucherText: {
    color: theme.colors.white,
    fontSize: 12,
    fontWeight: '700',
  },
  voucherCard: {
    backgroundColor: theme.colors.white,
    borderRadius: theme.radii.lg,
    padding: theme.spacing.md,
    marginBottom: 10,
    ...theme.shadows.card,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  codeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  ticketIconBox: {
    width: 32,
    height: 32,
    borderRadius: theme.radii.full,
    backgroundColor: theme.colors.primary[50],
    alignItems: 'center',
    justifyContent: 'center',
  },
  voucherCode: {
    fontSize: 15,
    fontWeight: '700',
    color: theme.colors.primary[600],
    letterSpacing: 0.5,
  },
  voucherDesc: {
    fontSize: 12,
    color: theme.textSecondary,
    lineHeight: 18,
    marginBottom: 10,
  },
  specsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    backgroundColor: theme.colors.slate[50],
    padding: 10,
    borderRadius: theme.radii.md,
    marginBottom: 10,
  },
  specItem: {
    alignItems: 'center',
  },
  specLabel: {
    fontSize: 10,
    color: theme.textSecondary,
    marginBottom: 2,
  },
  specValuePrimary: {
    fontSize: 12,
    fontWeight: '700',
    color: theme.colors.primary[600],
  },
  specValue: {
    fontSize: 12,
    fontWeight: '600',
    color: theme.textPrimary,
  },
  cardFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderTopWidth: 0.5,
    borderTopColor: theme.colors.slate[100],
    paddingTop: 8,
  },
  expiryRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  expiryText: {
    fontSize: 11,
    color: theme.textSecondary,
  },
  btnToggleStatus: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: theme.radii.full,
  },
  btnToggleText: {
    fontSize: 11,
    fontWeight: '600',
  },
});
