import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { RentalPayment } from '../../data/ownerAnalyticsMock';

const PRIMARY_TEAL = '#67BEC3'; // brand-500
const PASTEL_TEAL = '#E8F6F7'; // brand-100
const TEXT_PRIMARY = '#0F172A'; // Slate-900
const TEXT_SECONDARY = '#64748B'; // Slate-500
const TEXT_MUTED = '#94A3B8'; // Slate-400
const SUCCESS_GREEN = '#10B981';
const BORDER_SUBTLE = '#F1F5F9';

type RentalPaymentItemProps = {
  payment: RentalPayment;
};

export function RentalPaymentItem({ payment }: RentalPaymentItemProps) {
  return (
    <View style={styles.card}>
      <View style={styles.iconBox}>
        <Ionicons name="receipt-outline" size={18} color={PRIMARY_TEAL} />
      </View>
      <View style={styles.details}>
        <Text style={styles.deviceName} numberOfLines={1}>
          {payment.deviceName}
        </Text>
        <Text style={styles.renterName} numberOfLines={1}>
          Khách thuê: {payment.renterName}
        </Text>
        <Text style={styles.date}>{payment.date}</Text>
      </View>
      <View style={styles.amountColumn}>
        <Text style={styles.amount}>+{payment.amount.toLocaleString('vi-VN')} đ</Text>
        <View style={styles.statusPill}>
          <Text style={styles.statusText}>Hoàn tất</Text>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 14,
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: BORDER_SUBTLE,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.03,
    shadowRadius: 4,
    elevation: 1,
  },
  iconBox: {
    width: 38,
    height: 38,
    flexShrink: 0,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 9999,
    backgroundColor: PASTEL_TEAL,
  },
  details: {
    flex: 1,
    minWidth: 0,
  },
  deviceName: {
    fontSize: 13,
    fontWeight: '700',
    color: TEXT_PRIMARY,
  },
  renterName: {
    fontSize: 11,
    color: TEXT_SECONDARY,
    marginTop: 2,
  },
  date: {
    fontSize: 10,
    color: TEXT_MUTED,
    marginTop: 2,
  },
  amountColumn: {
    alignItems: 'flex-end',
    flexShrink: 0,
  },
  amount: {
    fontSize: 13,
    fontWeight: '700',
    color: SUCCESS_GREEN,
    marginBottom: 4,
  },
  statusPill: {
    backgroundColor: '#ECFDF5',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 9999,
  },
  statusText: {
    fontSize: 9,
    fontWeight: '700',
    color: '#059669',
  },
});
