import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { theme } from '../../constants/theme';

type RevenueSummaryProps = {
  totalRevenue: number;
  revenueChange?: number;
};

export function RevenueSummary({ totalRevenue, revenueChange }: RevenueSummaryProps) {
  return (
    <View style={styles.card}>
      <View style={styles.topRow}>
        <View style={styles.iconBox}>
          <Ionicons name="wallet-outline" size={21} color={theme.colors.white} />
        </View>
        <Text style={styles.label}>Revenue</Text>
      </View>
      <Text style={styles.amount}>{totalRevenue.toLocaleString('vi-VN')} ₫</Text>
      <View style={styles.changeRow}>
        {revenueChange !== undefined && (
          <Ionicons name="trending-up" size={16} color="#B8F0D9" />
        )}
        <Text style={styles.changeText}>
          {revenueChange === undefined
            ? 'Income from completed rentals'
            : `${revenueChange >= 0 ? '+' : ''}${revenueChange}% compared to last month`}
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    padding: theme.spacing.lg,
    backgroundColor: theme.colors.primary[700],
    borderRadius: theme.radii.lg,
  },
  topRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.sm,
  },
  iconBox: {
    width: 36,
    height: 36,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: theme.radii.sm,
    backgroundColor: 'rgba(255,255,255,0.16)',
  },
  label: {
    ...theme.typography.body,
    color: theme.colors.white,
  },
  amount: {
    color: theme.colors.white,
    fontSize: 28,
    fontWeight: '800',
    marginTop: theme.spacing.md,
  },
  changeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.xs,
    marginTop: theme.spacing.sm,
  },
  changeText: {
    ...theme.typography.caption,
    color: '#E1F4EC',
  },
});
