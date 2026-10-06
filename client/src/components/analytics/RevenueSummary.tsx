import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { theme, STRINGS, CONFIG } from '../../constants';

type RevenueSummaryProps = {
  totalRevenue: number;
  revenueChange?: number;
};

export function RevenueSummary({ totalRevenue, revenueChange }: RevenueSummaryProps) {
  return (
    <View style={styles.card}>
      <View style={styles.topRow}>
        <View style={styles.iconBox}>
          <Ionicons name="wallet-outline" size={20} color={theme.primary} />
        </View>
        <Text style={styles.label}>{STRINGS.ANALYTICS.TOTAL_REVENUE}</Text>
      </View>
      <Text style={styles.amount}>
        {totalRevenue.toLocaleString(CONFIG.CURRENCY.LOCALE)} {CONFIG.COMMON.CURRENCY_SUFFIX}
      </Text>
      <View style={styles.changeRow}>
        <View style={styles.badgePill}>
          <Ionicons name="trending-up" size={14} color={theme.success} />
          <Text style={styles.badgeText}>
            {revenueChange === undefined
              ? STRINGS.ANALYTICS.REVENUE_GROWTH_STABLE
              : STRINGS.ANALYTICS.REVENUE_GROWTH_PCT(revenueChange)}
          </Text>
        </View>
        <Text style={styles.changeText}>
          {revenueChange === undefined
            ? STRINGS.ANALYTICS.REVENUE_GROWTH_SUB_DEFAULT
            : STRINGS.ANALYTICS.REVENUE_GROWTH_SUB_COMPARE}
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    padding: theme.spacing.lg + 2,
    backgroundColor: theme.surface,
    borderRadius: theme.radii.lg,
    borderWidth: 1,
    borderColor: theme.border,
    marginBottom: theme.spacing.xs,
    ...theme.shadows.card,
  },
  topRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.md - 2,
  },
  iconBox: {
    width: 38,
    height: 38,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: theme.radii.full,
    backgroundColor: theme.primaryLight,
  },
  label: {
    fontSize: theme.typography.sizes.body,
    fontWeight: theme.typography.weights.semibold,
    color: theme.textSecondary,
  },
  amount: {
    color: theme.textPrimary,
    fontSize: theme.typography.sizes.hero,
    fontWeight: theme.typography.weights.heavy,
    marginTop: theme.spacing.md,
  },
  changeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.sm,
    marginTop: theme.spacing.md,
    paddingTop: theme.spacing.md,
    borderTopWidth: 1,
    borderTopColor: theme.border,
  },
  badgePill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.xs,
    paddingHorizontal: theme.spacing.sm,
    paddingVertical: theme.spacing.xs - 1,
    borderRadius: theme.radii.full,
    backgroundColor: theme.successLight,
  },
  badgeText: {
    fontSize: theme.typography.sizes.caption,
    fontWeight: theme.typography.weights.bold,
    color: theme.success,
  },
  changeText: {
    flex: 1,
    fontSize: theme.typography.sizes.caption,
    color: theme.textSecondary,
  },
});
