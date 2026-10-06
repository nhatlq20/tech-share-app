import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

const PRIMARY_TEAL = '#67BEC3'; // brand-500
const PASTEL_TEAL = '#E8F6F7'; // brand-100
const TEXT_PRIMARY = '#0F172A'; // Slate-900
const TEXT_SECONDARY = '#64748B'; // Slate-500
const SUCCESS_GREEN = '#10B981';
const BORDER_SUBTLE = '#F1F5F9';

type RevenueSummaryProps = {
  totalRevenue: number;
  revenueChange?: number;
};

export function RevenueSummary({ totalRevenue, revenueChange }: RevenueSummaryProps) {
  return (
    <View style={styles.card}>
      <View style={styles.topRow}>
        <View style={styles.iconBox}>
          <Ionicons name="wallet-outline" size={20} color={PRIMARY_TEAL} />
        </View>
        <Text style={styles.label}>Tổng Doanh Thu Tích Lũy</Text>
      </View>
      <Text style={styles.amount}>{totalRevenue.toLocaleString('vi-VN')} đ</Text>
      <View style={styles.changeRow}>
        <View style={styles.badgePill}>
          <Ionicons name="trending-up" size={14} color={SUCCESS_GREEN} />
          <Text style={styles.badgeText}>
            {revenueChange === undefined
              ? 'Tăng trưởng ổn định'
              : `${revenueChange >= 0 ? '+' : ''}${revenueChange}%`}
          </Text>
        </View>
        <Text style={styles.changeText}>
          {revenueChange === undefined
            ? 'Doanh thu thuần từ các đơn thuê hoàn tất'
            : 'so với chu kỳ trước'}
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    padding: 18,
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: BORDER_SUBTLE,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 2,
    marginBottom: 4,
  },
  topRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  iconBox: {
    width: 38,
    height: 38,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 9999,
    backgroundColor: PASTEL_TEAL,
  },
  label: {
    fontSize: 13,
    fontWeight: '600',
    color: TEXT_SECONDARY,
  },
  amount: {
    color: TEXT_PRIMARY,
    fontSize: 28,
    fontWeight: '800',
    marginTop: 12,
  },
  changeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: BORDER_SUBTLE,
  },
  badgePill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 9999,
    backgroundColor: '#ECFDF5',
  },
  badgeText: {
    fontSize: 11,
    fontWeight: '700',
    color: SUCCESS_GREEN,
  },
  changeText: {
    fontSize: 12,
    fontWeight: '500',
    color: TEXT_SECONDARY,
    flex: 1,
  },
});
