import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { apiClient } from '../../../config/api';
import { colors } from '../../../theme/colors';

interface Voucher {
  code: string;
  type: 'fixed' | 'percent';
  value: number;
  maxDiscount?: number;
}

interface VoucherInputProps {
  rentalDays: number;
  onApplyVoucher: (voucher: Voucher | null) => void;
}

export const VoucherInput = ({ rentalDays, onApplyVoucher }: VoucherInputProps) => {
  const [code, setCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [appliedVoucher, setAppliedVoucher] = useState(null as Voucher | null);

  const handleApply = async () => {
    if (!code.trim()) return;
    setLoading(true);
    setError('');
    
    try {
      // In a real app, you would pass the auth token if required.
      // Assuming apiClient has an interceptor or it's a public check.
      const response = await apiClient.post('/vouchers/validate', {
        code: code.trim(),
        rentalDays
      });
      
      setAppliedVoucher(response.data.voucher);
      onApplyVoucher(response.data.voucher);
      setCode(''); // clear input on success
    } catch (err: any) {
      setError(err.response?.data?.message || 'Không thể kiểm tra mã voucher');
      setAppliedVoucher(null);
      onApplyVoucher(null);
    } finally {
      setLoading(false);
    }
  };

  const handleRemove = () => {
    setAppliedVoucher(null);
    onApplyVoucher(null);
    setCode('');
    setError('');
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Mã giảm giá</Text>
      
      {appliedVoucher ? (
        <View style={styles.appliedCard}>
          <View style={styles.appliedLeft}>
            <Ionicons name="ticket" size={20} color="#16A34A" />
            <Text style={styles.appliedText}>Đã áp dụng mã: <Text style={styles.appliedCode}>{appliedVoucher.code}</Text></Text>
          </View>
          <TouchableOpacity onPress={handleRemove} hitSlop={{ top: 10, right: 10, bottom: 10, left: 10 }}>
            <Ionicons name="close-circle" size={22} color="#DC2626" />
          </TouchableOpacity>
        </View>
      ) : (
        <View style={styles.inputContainer}>
          <View style={styles.inputWrapper}>
            <Ionicons name="pricetag-outline" size={18} color={colors.light.textSecondary} style={styles.icon} />
            <TextInput
              style={styles.input}
              placeholder="Nhập mã voucher (vd: SALE20)"
              placeholderTextColor={colors.light.textSecondary}
              value={code}
              onChangeText={(text: string) => {
                setCode(text);
                setError('');
              }}
              autoCapitalize="characters"
              editable={!loading}
            />
          </View>
          <TouchableOpacity 
            style={[styles.applyBtn, (!code.trim() || loading) && styles.applyBtnDisabled]} 
            onPress={handleApply}
            disabled={!code.trim() || loading}
          >
            {loading ? (
              <ActivityIndicator size="small" color="#FFFFFF" />
            ) : (
              <Text style={[styles.applyBtnText, (!code.trim() || loading) && styles.applyBtnTextDisabled]}>
                Áp dụng
              </Text>
            )}
          </TouchableOpacity>
        </View>
      )}

      {error ? <Text style={styles.errorText}>{error}</Text> : null}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginHorizontal: 16,
    marginBottom: 20,
    padding: 16,
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: colors.light.border,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 4,
    elevation: 2,
  },
  title: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.light.textPrimary,
    marginBottom: 12,
  },
  inputContainer: {
    flexDirection: 'row',
    gap: 12,
  },
  inputWrapper: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.light.surface,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: colors.light.border,
    paddingHorizontal: 12,
  },
  icon: {
    marginRight: 8,
  },
  input: {
    flex: 1,
    height: 44,
    color: colors.light.textPrimary,
    fontSize: 14,
  },
  applyBtn: {
    backgroundColor: colors.light.primary,
    justifyContent: 'center',
    paddingHorizontal: 16,
    borderRadius: 10,
  },
  applyBtnDisabled: {
    backgroundColor: '#E2E8F0',
  },
  applyBtnText: {
    color: '#FFFFFF',
    fontWeight: '700',
    fontSize: 14,
  },
  applyBtnTextDisabled: {
    color: '#94A3B8',
  },
  appliedCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#DCFCE7',
    borderWidth: 1,
    borderColor: '#86EFAC',
    borderRadius: 10,
    padding: 12,
  },
  appliedLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flex: 1,
  },
  appliedText: {
    color: '#166534',
    fontSize: 13,
  },
  appliedCode: {
    color: '#15803D',
    fontWeight: '700',
  },
  errorText: {
    color: colors.light.error,
    fontSize: 13,
    marginTop: 8,
    marginLeft: 4,
  },
});
