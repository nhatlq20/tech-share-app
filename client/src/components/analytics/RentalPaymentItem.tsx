import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { RentalPayment } from '../../data/ownerAnalyticsMock';
import { theme, STRINGS, CONFIG } from '../../constants';

type RentalPaymentItemProps = {
  payment: RentalPayment;
};

export function RentalPaymentItem({ payment }: RentalPaymentItemProps) {
  return (
    <View style={styles.card}>
      <View style={styles.iconBox}>
        <Ionicons name="receipt-outline" size={18} color={theme.primary} />
      </View>
      <View style={styles.details}>
        <Text style={styles.deviceName} numberOfLines={1}>
          {payment.deviceName}
        </Text>
        <Text style={styles.renterName} numberOfLines={1}>
          {STRINGS.ANALYTICS.RENTER_PREFIX}{payment.renterName}
        </Text>
        <Text style={styles.date}>{payment.date}</Text>
      </View>
      <View style={styles.amountColumn}>
        <Text style={styles.amount}>
          +{payment.amount.toLocaleString(CONFIG.CURRENCY.LOCALE)} {CONFIG.COMMON.CURRENCY_SUFFIX}
        </Text>
        <View style={styles.statusPill}>
          <Text style={styles.statusText}>{STRINGS.ANALYTICS.STATUS_COMPLETED}</Text>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.md,
    padding: theme.spacing.base,
    backgroundColor: theme.surface,
    borderRadius: theme.radii.lg,
    borderWidth: 1,
    borderColor: theme.border,
    ...theme.shadows.subtle,
  },
  iconBox: {
    width: 38,
    height: 38,
    flexShrink: 0,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: theme.radii.full,
    backgroundColor: theme.primaryLight,
  },
  details: {
    flex: 1,
    minWidth: 0,
  },
  deviceName: {
    fontSize: theme.typography.sizes.body,
    fontWeight: theme.typography.weights.bold,
    color: theme.textPrimary,
  },
  renterName: {
    fontSize: theme.typography.sizes.caption,
    color: theme.textSecondary,
    marginTop: 2,
  },
  date: {
    fontSize: theme.typography.sizes.sm,
    color: theme.textMuted,
    marginTop: 2,
  },
  amountColumn: {
    alignItems: 'flex-end',
    flexShrink: 0,
  },
  amount: {
    fontSize: theme.typography.sizes.body,
    fontWeight: theme.typography.weights.bold,
    color: theme.success,
    marginBottom: theme.spacing.xs,
  },
  statusPill: {
    backgroundColor: theme.successLight,
    paddingHorizontal: theme.spacing.sm,
    paddingVertical: theme.spacing.xs / 2,
    borderRadius: theme.radii.full,
  },
  statusText: {
    fontSize: theme.typography.sizes.xs,
    fontWeight: theme.typography.weights.bold,
    color: theme.success,
  },
});
