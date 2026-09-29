import React, { useState, useEffect, useCallback } from 'react';
import {
  StyleSheet,
  View,
  Text,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  Modal,
  TextInput,
  ScrollView,
  Switch,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { theme } from '../../../constants/theme';
import { adminService } from '../../../services/adminService';

export interface VoucherItem {
  _id: string;
  code: string;
  type: 'fixed' | 'percent';
  value: number;
  minDays: number;
  maxDiscount?: number;
  expiryDate?: string;
  usageLimit?: number;
  usedCount: number;
  perUserLimit: number;
  isActive: boolean;
}

const EMPTY_FORM = {
  code: '',
  type: 'percent' as 'fixed' | 'percent',
  value: '',
  minDays: '1',
  maxDiscount: '',
  expiryDate: '',
  usageLimit: '',
  perUserLimit: '1',
  isActive: true,
};

export function VouchersTab() {
  const [vouchers, setVouchers] = useState([] as VoucherItem[]);
  const [loading, setLoading] = useState(true);
  const [modalVisible, setModalVisible] = useState(false);
  const [editingVoucher, setEditingVoucher] = useState(null as VoucherItem | null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [saving, setSaving] = useState(false);

  const loadVouchers = useCallback(async () => {
    try {
      setLoading(true);
      const data = await adminService.getVouchers();
      setVouchers(data || []);
    } catch (err) {
      console.warn('Lỗi tải voucher:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadVouchers();
  }, [loadVouchers]);

  const openCreateModal = () => {
    setEditingVoucher(null);
    setForm(EMPTY_FORM);
    setModalVisible(true);
  };

  const openEditModal = (v: VoucherItem) => {
    setEditingVoucher(v);
    setForm({
      code: v.code,
      type: v.type,
      value: String(v.value),
      minDays: String(v.minDays || 0),
      maxDiscount: v.maxDiscount ? String(v.maxDiscount) : '',
      expiryDate: v.expiryDate ? v.expiryDate.split('T')[0] : '',
      usageLimit: v.usageLimit ? String(v.usageLimit) : '',
      perUserLimit: String(v.perUserLimit || 1),
      isActive: v.isActive,
    });
    setModalVisible(true);
  };

  const handleSave = async () => {
    if (!form.code.trim()) {
      Alert.alert('Lỗi', 'Vui lòng nhập mã voucher');
      return;
    }
    if (!form.value || Number(form.value) <= 0) {
      Alert.alert('Lỗi', 'Vui lòng nhập giá trị giảm giá hợp lệ');
      return;
    }

    const payload: any = {
      code: form.code.trim().toUpperCase(),
      type: form.type,
      value: Number(form.value),
      minDays: Number(form.minDays) || 0,
      perUserLimit: Number(form.perUserLimit) || 1,
      isActive: form.isActive,
    };
    if (form.maxDiscount) payload.maxDiscount = Number(form.maxDiscount);
    if (form.expiryDate) payload.expiryDate = new Date(form.expiryDate);
    if (form.usageLimit) payload.usageLimit = Number(form.usageLimit);

    try {
      setSaving(true);
      if (editingVoucher) {
        await adminService.updateVoucher(editingVoucher._id, payload);
        Alert.alert('Thành công', 'Cập nhật voucher thành công');
      } else {
        await adminService.createVoucher(payload);
        Alert.alert('Thành công', 'Tạo voucher mới thành công');
      }
      setModalVisible(false);
      loadVouchers();
    } catch (err: any) {
      Alert.alert('Lỗi', err?.response?.data?.message || 'Không thể lưu voucher');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = (v: VoucherItem) => {
    Alert.alert(
      'Xác nhận xóa',
      `Bạn có chắc muốn xóa voucher "${v.code}"?`,
      [
        { text: 'Hủy', style: 'cancel' },
        {
          text: 'Xóa',
          style: 'destructive',
          onPress: async () => {
            try {
              await adminService.deleteVoucher(v._id);
              Alert.alert('Thành công', `Đã xóa voucher "${v.code}"`);
              loadVouchers();
            } catch (err: any) {
              Alert.alert('Lỗi', 'Không thể xóa voucher');
            }
          },
        },
      ]
    );
  };

  const handleToggleActive = async (v: VoucherItem) => {
    try {
      await adminService.updateVoucher(v._id, { isActive: !v.isActive });
      setVouchers((prev: VoucherItem[]) =>
        prev.map((item: VoucherItem) =>
          item._id === v._id ? { ...item, isActive: !item.isActive } : item
        )
      );
    } catch (err) {
      Alert.alert('Lỗi', 'Không thể cập nhật trạng thái voucher');
    }
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={theme.colors.primary[600]} />
        <Text style={styles.loadingText}>Đang tải danh sách voucher...</Text>
      </View>
    );
  }

  return (
    <View style={styles.sectionBlock}>
      <View style={styles.sectionTitleRow}>
        <View style={styles.sectionTitleLeft}>
          <Ionicons name="pricetags-outline" size={16} color={theme.colors.primary[600]} />
          <Text style={styles.sectionHeaderTitle}>Mã khuyến mãi ({vouchers.length})</Text>
        </View>

        <TouchableOpacity
          style={styles.btnCreateVoucher}
          onPress={openCreateModal}
          activeOpacity={0.8}
        >
          <Ionicons name="add" size={16} color={theme.colors.white} />
          <Text style={styles.btnCreateVoucherText}>Tạo mã</Text>
        </TouchableOpacity>
      </View>

      {vouchers.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Ionicons name="ticket-outline" size={48} color={theme.colors.slate[400]} />
          <Text style={styles.emptyText}>Chưa có voucher nào</Text>
          <Text style={styles.emptySubtext}>Bấm "Tạo mã" để thêm voucher mới</Text>
        </View>
      ) : (
        vouchers.map((v: VoucherItem) => (
          <View key={v._id} style={styles.voucherCard}>
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

            {/* Specs Grid */}
            <View style={styles.specsRow}>
              <View style={styles.specItem}>
                <Text style={styles.specLabel}>Mức giảm:</Text>
                <Text style={styles.specValuePrimary}>
                  {v.type === 'percent'
                    ? `${v.value}%`
                    : `${v.value.toLocaleString('vi-VN')} đ`}
                </Text>
              </View>

              <View style={styles.specItem}>
                <Text style={styles.specLabel}>Thuê tối thiểu:</Text>
                <Text style={styles.specValue}>{v.minDays} ngày</Text>
              </View>

              <View style={styles.specItem}>
                <Text style={styles.specLabel}>Đã dùng:</Text>
                <Text style={styles.specValue}>
                  {v.usedCount}/{v.usageLimit || '∞'}
                </Text>
              </View>
            </View>

            {v.maxDiscount && v.type === 'percent' && (
              <Text style={styles.maxDiscountNote}>
                Giảm tối đa: {v.maxDiscount.toLocaleString('vi-VN')} đ
              </Text>
            )}

            {/* Footer */}
            <View style={styles.cardFooter}>
              {v.expiryDate && (
                <View style={styles.expiryRow}>
                  <Ionicons name="calendar-outline" size={13} color={theme.textSecondary} />
                  <Text style={styles.expiryText}>
                    Hạn: {new Date(v.expiryDate).toLocaleDateString('vi-VN')}
                  </Text>
                </View>
              )}
              {!v.expiryDate && <View />}

              <View style={styles.actionButtons}>
                <TouchableOpacity
                  style={styles.btnEdit}
                  onPress={() => openEditModal(v)}
                  activeOpacity={0.8}
                >
                  <Ionicons name="create-outline" size={14} color={theme.colors.primary[600]} />
                </TouchableOpacity>

                <TouchableOpacity
                  style={[
                    styles.btnToggleStatus,
                    {
                      backgroundColor: v.isActive
                        ? theme.colors.danger[50]
                        : theme.colors.primary[50],
                    },
                  ]}
                  onPress={() => handleToggleActive(v)}
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
                    {v.isActive ? 'Tạm dừng' : 'Kích hoạt'}
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.btnDelete}
                  onPress={() => handleDelete(v)}
                  activeOpacity={0.8}
                >
                  <Ionicons name="trash-outline" size={14} color={theme.colors.danger[600]} />
                </TouchableOpacity>
              </View>
            </View>
          </View>
        ))
      )}

      {/* Modal Tạo/Sửa Voucher */}
      <Modal visible={modalVisible} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <ScrollView showsVerticalScrollIndicator={false}>
              <Text style={styles.modalTitle}>
                {editingVoucher ? 'Sửa Voucher' : 'Tạo Voucher mới'}
              </Text>

              <Text style={styles.inputLabel}>Mã Voucher *</Text>
              <TextInput
                style={styles.input}
                value={form.code}
                onChangeText={(t: string) => setForm({ ...form, code: t.toUpperCase() })}
                placeholder="VD: SUMMER2026"
                autoCapitalize="characters"
              />

              <Text style={styles.inputLabel}>Loại giảm giá *</Text>
              <View style={styles.typeRow}>
                <TouchableOpacity
                  style={[
                    styles.typeBtn,
                    form.type === 'percent' && styles.typeBtnActive,
                  ]}
                  onPress={() => setForm({ ...form, type: 'percent' })}
                >
                  <Text
                    style={[
                      styles.typeBtnText,
                      form.type === 'percent' && styles.typeBtnTextActive,
                    ]}
                  >
                    Phần trăm (%)
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[
                    styles.typeBtn,
                    form.type === 'fixed' && styles.typeBtnActive,
                  ]}
                  onPress={() => setForm({ ...form, type: 'fixed' })}
                >
                  <Text
                    style={[
                      styles.typeBtnText,
                      form.type === 'fixed' && styles.typeBtnTextActive,
                    ]}
                  >
                    Cố định (VNĐ)
                  </Text>
                </TouchableOpacity>
              </View>

              <Text style={styles.inputLabel}>
                Giá trị giảm {form.type === 'percent' ? '(%)' : '(VNĐ)'} *
              </Text>
              <TextInput
                style={styles.input}
                value={form.value}
                onChangeText={(t: string) => setForm({ ...form, value: t })}
                placeholder={form.type === 'percent' ? 'VD: 10' : 'VD: 50000'}
                keyboardType="numeric"
              />

              {form.type === 'percent' && (
                <>
                  <Text style={styles.inputLabel}>Giảm tối đa (VNĐ)</Text>
                  <TextInput
                    style={styles.input}
                    value={form.maxDiscount}
                    onChangeText={(t: string) => setForm({ ...form, maxDiscount: t })}
                    placeholder="VD: 100000"
                    keyboardType="numeric"
                  />
                </>
              )}

              <Text style={styles.inputLabel}>Thuê tối thiểu (ngày)</Text>
              <TextInput
                style={styles.input}
                value={form.minDays}
                onChangeText={(t: string) => setForm({ ...form, minDays: t })}
                placeholder="VD: 1"
                keyboardType="numeric"
              />

              <Text style={styles.inputLabel}>Giới hạn lượt dùng</Text>
              <TextInput
                style={styles.input}
                value={form.usageLimit}
                onChangeText={(t: string) => setForm({ ...form, usageLimit: t })}
                placeholder="Để trống = không giới hạn"
                keyboardType="numeric"
              />

              <Text style={styles.inputLabel}>Giới hạn mỗi người</Text>
              <TextInput
                style={styles.input}
                value={form.perUserLimit}
                onChangeText={(t: string) => setForm({ ...form, perUserLimit: t })}
                placeholder="VD: 1"
                keyboardType="numeric"
              />

              <Text style={styles.inputLabel}>Ngày hết hạn (YYYY-MM-DD)</Text>
              <TextInput
                style={styles.input}
                value={form.expiryDate}
                onChangeText={(t: string) => setForm({ ...form, expiryDate: t })}
                placeholder="VD: 2026-12-31"
              />

              <View style={styles.switchRow}>
                <Text style={styles.inputLabel}>Kích hoạt ngay</Text>
                <Switch
                  value={form.isActive}
                  onValueChange={(val: boolean) => setForm({ ...form, isActive: val })}
                  trackColor={{ true: theme.colors.primary[600] }}
                />
              </View>

              <View style={styles.modalButtons}>
                <TouchableOpacity
                  style={styles.btnCancel}
                  onPress={() => setModalVisible(false)}
                >
                  <Text style={styles.btnCancelText}>Hủy</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.btnSave, saving && { opacity: 0.6 }]}
                  onPress={handleSave}
                  disabled={saving}
                >
                  {saving ? (
                    <ActivityIndicator size="small" color="#fff" />
                  ) : (
                    <Text style={styles.btnSaveText}>
                      {editingVoucher ? 'Cập nhật' : 'Tạo mới'}
                    </Text>
                  )}
                </TouchableOpacity>
              </View>
            </ScrollView>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  loadingContainer: {
    paddingVertical: 40,
    alignItems: 'center',
    gap: 10,
  },
  loadingText: {
    fontSize: 12,
    color: theme.textSecondary,
  },
  emptyContainer: {
    paddingVertical: 40,
    alignItems: 'center',
    gap: 8,
  },
  emptyText: {
    fontSize: 14,
    fontWeight: '600',
    color: theme.textSecondary,
  },
  emptySubtext: {
    fontSize: 12,
    color: theme.colors.slate[400],
  },
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
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: theme.radii.full,
  },
  statusBadgeText: {
    fontSize: 10,
    fontWeight: '600',
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
  maxDiscountNote: {
    fontSize: 11,
    color: theme.colors.warning[600],
    marginBottom: 8,
    fontStyle: 'italic',
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
  actionButtons: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  btnEdit: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: theme.colors.primary[50],
    alignItems: 'center',
    justifyContent: 'center',
  },
  btnDelete: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: theme.colors.danger[50],
    alignItems: 'center',
    justifyContent: 'center',
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
  // Modal styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: theme.colors.white,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 20,
    maxHeight: '85%',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: theme.textPrimary,
    marginBottom: 16,
    textAlign: 'center',
  },
  inputLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: theme.textSecondary,
    marginBottom: 4,
    marginTop: 10,
  },
  input: {
    borderWidth: 1,
    borderColor: theme.colors.slate[200],
    borderRadius: theme.radii.md,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 14,
    color: theme.textPrimary,
    backgroundColor: theme.colors.slate[50],
  },
  typeRow: {
    flexDirection: 'row',
    gap: 8,
  },
  typeBtn: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: theme.radii.md,
    borderWidth: 1,
    borderColor: theme.colors.slate[200],
    alignItems: 'center',
  },
  typeBtnActive: {
    backgroundColor: theme.colors.primary[600],
    borderColor: theme.colors.primary[600],
  },
  typeBtnText: {
    fontSize: 13,
    fontWeight: '600',
    color: theme.textSecondary,
  },
  typeBtnTextActive: {
    color: theme.colors.white,
  },
  switchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 12,
  },
  modalButtons: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 20,
    marginBottom: 20,
  },
  btnCancel: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: theme.radii.md,
    backgroundColor: theme.colors.slate[100],
    alignItems: 'center',
  },
  btnCancelText: {
    fontSize: 14,
    fontWeight: '600',
    color: theme.textSecondary,
  },
  btnSave: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: theme.radii.md,
    backgroundColor: theme.colors.primary[600],
    alignItems: 'center',
  },
  btnSaveText: {
    fontSize: 14,
    fontWeight: '700',
    color: theme.colors.white,
  },
});
