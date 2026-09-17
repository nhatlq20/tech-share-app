import React from 'react';
import { View, Text, StyleSheet } from 'react-native';

interface PriceBreakdownCardProps {
  rentalDays: number;
  dailyRate: number;
  depositValue: number;
  voucher: {
    type: 'fixed' | 'percent';
    value: number;
    maxDiscount?: number;
  } | null;
}

export const PriceBreakdownCard = ({ rentalDays, dailyRate, depositValue, voucher }: PriceBreakdownCardProps) => {
  if (rentalDays <= 0) return null;

  const formatPrice = (price: number) => {
    return Math.round(price).toLocaleString('vi-VN') + ' đ';
  };

  const baseRentalFee = rentalDays * dailyRate;

  // 1. Long term discount
  let longTermDiscountPercent = 0;
  if (rentalDays >= 7) {
    longTermDiscountPercent = 20;
  } else if (rentalDays >= 3) {
    longTermDiscountPercent = 10;
  }
  
  const longTermDiscountAmount = (baseRentalFee * longTermDiscountPercent) / 100;
  const rentalFeeAfterLongTerm = baseRentalFee - longTermDiscountAmount;

  // 2. Voucher discount
  let voucherDiscountAmount = 0;
  if (voucher) {
    if (voucher.type === 'percent') {
      voucherDiscountAmount = (rentalFeeAfterLongTerm * voucher.value) / 100;
      if (voucher.maxDiscount && voucherDiscountAmount > voucher.maxDiscount) {
        voucherDiscountAmount = voucher.maxDiscount;
      }
    } else {
      voucherDiscountAmount = voucher.value;
    }
    
    // Ensure discount doesn't exceed rental fee
    if (voucherDiscountAmount > rentalFeeAfterLongTerm) {
      voucherDiscountAmount = rentalFeeAfterLongTerm;
    }
  }

  const totalAmount = rentalFeeAfterLongTerm - voucherDiscountAmount + depositValue;

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Chi tiết thanh toán</Text>
      
      <View style={styles.row}>
        <Text style={styles.label}>Phí thuê ({rentalDays} ngày)</Text>
        <Text style={styles.value}>{formatPrice(baseRentalFee)}</Text>
      </View>

      {longTermDiscountPercent > 0 && (
        <View style={styles.row}>
          <Text style={[styles.label, styles.discountLabel]}>Giảm giá thuê dài ngày ({longTermDiscountPercent}%)</Text>
          <Text style={[styles.value, styles.discountValue]}>- {formatPrice(longTermDiscountAmount)}</Text>
        </View>
      )}

      {voucherDiscountAmount > 0 && (
        <View style={styles.row}>
          <Text style={[styles.label, styles.discountLabel]}>Voucher giảm giá</Text>
          <Text style={[styles.value, styles.discountValue]}>- {formatPrice(voucherDiscountAmount)}</Text>
        </View>
      )}

      <View style={styles.row}>
        <Text style={styles.label}>Tiền cọc (hoàn trả sau)</Text>
        <Text style={styles.value}>{formatPrice(depositValue)}</Text>
      </View>
      
      <View style={styles.divider} />
      
      <View style={styles.row}>
        <Text style={styles.totalLabel}>Tổng thanh toán</Text>
        <Text style={styles.totalValue}>{formatPrice(totalAmount)}</Text>
      </View>
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
    marginBottom: 16,
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  label: {
    color: '#94A3B8',
    fontSize: 14,
  },
  value: {
    color: '#F1F5F9',
    fontSize: 14,
    fontWeight: '500',
  },
  discountLabel: {
    color: '#10B981',
  },
  discountValue: {
    color: '#10B981',
    fontWeight: '600',
  },
  divider: {
    height: 1,
    backgroundColor: '#1E293B',
    marginVertical: 12,
  },
  totalLabel: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '700',
  },
  totalValue: {
    color: '#38BDF8',
    fontSize: 18,
    fontWeight: '800',
  },
});
