import React from 'react';
import { StyleSheet, Text, View } from 'react-native';

const PRIMARY_TEAL = '#67BEC3'; // brand-500
const TEXT_SECONDARY = '#64748B'; // Slate-500
const BORDER_SUBTLE = '#F1F5F9';

type UtilizationCardProps = {
  utilizationRate: number;
  rentedDevices: number;
  totalDevices: number;
};

export function UtilizationCard({
  utilizationRate,
  rentedDevices,
  totalDevices,
}: UtilizationCardProps) {
  const progressWidth = `${Math.min(Math.max(utilizationRate, 0), 100)}%` as `${number}%`;

  return (
    <View style={styles.card}>
      <View style={styles.topRow}>
        <View style={styles.rateCol}>
          <Text style={styles.rate}>{utilizationRate}%</Text>
          <Text style={styles.rateSub}>Tỷ lệ lấp đầy kho</Text>
        </View>
        <Text style={styles.description}>
          {rentedDevices} / {totalDevices} máy đang cho thuê
        </Text>
      </View>
      <View
        accessibilityRole="progressbar"
        accessibilityValue={{ min: 0, max: 100, now: utilizationRate }}
        style={styles.progressBackground}
      >
        <View style={[styles.progress, { width: progressWidth }]} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    padding: 16,
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: BORDER_SUBTLE,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 2,
  },
  topRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  rateCol: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 6,
  },
  rate: {
    fontSize: 24,
    fontWeight: '800',
    color: PRIMARY_TEAL,
  },
  rateSub: {
    fontSize: 12,
    fontWeight: '600',
    color: TEXT_SECONDARY,
  },
  description: {
    fontSize: 12,
    fontWeight: '600',
    color: TEXT_SECONDARY,
  },
  progressBackground: {
    height: 10,
    overflow: 'hidden',
    borderRadius: 9999,
    backgroundColor: '#F1F5F9',
  },
  progress: {
    height: '100%',
    borderRadius: 9999,
    backgroundColor: PRIMARY_TEAL,
  },
});
