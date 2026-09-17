import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { apiClient } from '../../../config/api';

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
            <Ionicons name="ticket" size={20} color="#10B981" />
            <Text style={styles.appliedText}>Đã áp dụng mã: <Text style={styles.appliedCode}>{appliedVoucher.code}</Text></Text>
          </View>
          <TouchableOpacity onPress={handleRemove} hitSlop={{ top: 10, right: 10, bottom: 10, left: 10 }}>
            <Ionicons name="close-circle" size={24} color="#EF4444" />
          </TouchableOpacity>
        </View>
      ) : (
        <View style={styles.inputContainer}>
          <View style={styles.inputWrapper}>
            <Ionicons name="pricetag-outline" size={20} color="#94A3B8" style={styles.icon} />
            <TextInput
              style={styles.input}
              placeholder="Nhập mã voucher (vd: SALE20)"
              placeholderTextColor="#64748B"
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
            {loading ? <ActivityIndicator size="small" color="#FFFFFF" /> : <Text style={styles.applyBtnText}>Áp dụng</Text>}
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
    backgroundColor: '#0F172A',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#1E293B',
  },
  title: {
    fontSize: 16,
    fontWeight: '700',
    color: '#FFFFFF',
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
    backgroundColor: '#1E293B',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#334155',
    paddingHorizontal: 12,
  },
  icon: {
    marginRight: 8,
  },
  input: {
    flex: 1,
    height: 44,
    color: '#FFFFFF',
    fontSize: 15,
  },
  applyBtn: {
    backgroundColor: '#2563EB',
    justifyContent: 'center',
    paddingHorizontal: 16,
    borderRadius: 8,
  },
  applyBtnDisabled: {
    backgroundColor: '#334155',
  },
  applyBtnText: {
    color: '#FFFFFF',
    fontWeight: '600',
    fontSize: 14,
  },
  appliedCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: 'rgba(16, 185, 129, 0.1)',
    borderWidth: 1,
    borderColor: 'rgba(16, 185, 129, 0.3)',
    borderRadius: 8,
    padding: 12,
  },
  appliedLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  appliedText: {
    color: '#E2E8F0',
    fontSize: 14,
  },
  appliedCode: {
    color: '#10B981',
    fontWeight: '700',
  },
  errorText: {
    color: '#EF4444',
    fontSize: 13,
    marginTop: 8,
    marginLeft: 4,
  }
});
