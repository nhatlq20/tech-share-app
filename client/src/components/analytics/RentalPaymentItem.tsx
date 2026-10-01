import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { theme } from '../../constants/theme';
import { RentalPayment } from '../../data/ownerAnalyticsMock';

type RentalPaymentItemProps = {
  payment: RentalPayment;
};

export function RentalPaymentItem({ payment }: RentalPaymentItemProps) {
  return (
    <View style={styles.card}>
      <View style={styles.iconBox}>
        <Ionicons name="phone-portrait-outline" size={19} color={theme.colors.primary[600]} />
      </View>
      <View style={styles.details}>
        <Text style={styles.deviceName} numberOfLines={1}>
          {payment.deviceName}
        </Text>
        <Text style={styles.renterName} numberOfLines={1}>
          {payment.renterName}
        </Text>
        <Text style={styles.date}>{payment.date}</Text>
      </View>
      <View style={styles.amountColumn}>
        <Text style={styles.amount}>+{payment.amount.toLocaleString('vi-VN')} ₫</Text>
        <Text style={styles.status}>Completed</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.sm,
    padding: theme.spacing.md,
    backgroundColor: theme.card,
    borderRadius: theme.radii.md,
    borderWidth: 1,
    borderColor: theme.border,
  },
  iconBox: {
    width: 38,
    height: 38,
    flexShrink: 0,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: theme.radii.sm,
    backgroundColor: theme.colors.primary[50],
  },
  details: {
    flex: 1,
    minWidth: 0,
  },
  deviceName: {
    ...theme.typography.body,
    fontWeight: '700',
  },
  renterName: {
    ...theme.typography.caption,
    marginTop: 2,
  },
  date: {
    fontSize: 11,
    color: theme.textSecondary,
    marginTop: 2,
  },
  amountColumn: {
    alignItems: 'flex-end',
    flexShrink: 0,
  },
  amount: {
    fontSize: 12,
    fontWeight: '700',
    color: theme.colors.success[600],
  },
  status: {
    fontSize: 10,
    color: theme.textSecondary,
    marginTop: 4,
  },
});
