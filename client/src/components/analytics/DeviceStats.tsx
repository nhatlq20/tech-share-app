import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { DeviceStatistics } from '../../data/ownerAnalyticsMock';

const PRIMARY_TEAL = '#67BEC3'; // brand-500
const PASTEL_TEAL = '#E8F6F7'; // brand-100
const TEXT_SECONDARY = '#64748B'; // Slate-500
const BORDER_SUBTLE = '#F1F5F9';

type DeviceStatsProps = {
  statistics: DeviceStatistics;
};

export function DeviceStats({ statistics }: DeviceStatsProps) {
  const items = [
    {
      label: 'Tổng thiết bị',
      value: statistics.totalDevices,
      icon: 'cube-outline' as const,
      color: PRIMARY_TEAL,
      bg: PASTEL_TEAL,
    },
    {
      label: 'Đang cho thuê',
      value: statistics.rentedDevices,
      icon: 'flash-outline' as const,
      color: '#D97706',
      bg: '#FEF3C7',
    },
    {
      label: 'Sẵn sàng thuê',
      value: statistics.availableDevices,
      icon: 'checkmark-circle-outline' as const,
      color: '#10B981',
      bg: '#ECFDF5',
    },
  ];

  return (
    <View style={styles.row}>
      {items.map((item) => (
        <View key={item.label} style={styles.card}>
          <View style={[styles.iconBox, { backgroundColor: item.bg }]}>
            <Ionicons name={item.icon} size={16} color={item.color} />
          </View>
          <Text style={styles.label} numberOfLines={1}>
            {item.label}
          </Text>
          <Text style={[styles.value, { color: item.color }]}>{item.value}</Text>
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    gap: 10,
  },
  card: {
    flex: 1,
    minWidth: 0,
    padding: 12,
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: BORDER_SUBTLE,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 2,
  },
  iconBox: {
    width: 36,
    height: 36,
    borderRadius: 9999,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 6,
  },
  label: {
    fontSize: 11,
    fontWeight: '600',
    color: TEXT_SECONDARY,
    textAlign: 'center',
  },
  value: {
    fontSize: 18,
    fontWeight: '800',
    marginTop: 2,
    textAlign: 'center',
  },
});
