import React from 'react';
import { StyleSheet, Text, TouchableOpacity } from 'react-native';
import { colors } from '../../theme/colors';
import { Device } from '../../types';

interface DeviceMapOverlayMarkerProps {
  device: Device;
  left: number;
  top: number;
  selected: boolean;
  onSelect: (deviceId: string) => void;
}

export function formatCompactPrice(price: number): string {
  if (!Number.isFinite(price) || price <= 0) return '0K';
  if (price >= 1_000_000) {
    const millions = price / 1_000_000;
    const formatted = Number.isInteger(millions)
      ? millions.toString()
      : parseFloat(millions.toFixed(1)).toString();
    return `${formatted}M`;
  }
  if (price >= 1_000) {
    const thousands = price / 1_000;
    const formatted = Number.isInteger(thousands)
      ? thousands.toString()
      : parseFloat(thousands.toFixed(1)).toString();
    return `${formatted}K`;
  }
  return `${price}`;
}

export function DeviceMapOverlayMarker({
  device,
  left,
  top,
  selected,
  onSelect,
}: DeviceMapOverlayMarkerProps) {
  const dailyRate = device.dailyRate ?? (device as any).pricePerDay ?? 0;
  const title = device.title || (device as any).name || 'Thiết bị';

  return (
    <TouchableOpacity
      style={[
        styles.marker,
        { left, top },
        selected && styles.markerSelected,
      ]}
      accessibilityRole="button"
      accessibilityLabel={`${title}, ${dailyRate.toLocaleString('vi-VN')} đ/ngày`}
      activeOpacity={0.85}
      onPress={() => onSelect(device._id)}
    >
      <Text style={[styles.priceText, selected && styles.priceTextSelected]}>
        {formatCompactPrice(dailyRate)}
      </Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  marker: {
    position: 'absolute',
    minWidth: 52,
    height: 28,
    paddingHorizontal: 8,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFFFFF',
    borderWidth: 1.5,
    borderColor: colors.light.primary,
    elevation: 3,
    zIndex: 21,
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.12,
    shadowRadius: 2.5,
  },
  markerSelected: {
    backgroundColor: colors.light.primary,
    borderColor: '#FFFFFF',
    borderWidth: 1.5,
    transform: [{ scale: 1.08 }],
    elevation: 7,
    zIndex: 999,
    shadowColor: colors.light.primaryDark,
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.35,
    shadowRadius: 5,
  },
  priceText: {
    color: colors.light.primary,
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: -0.2,
  },
  priceTextSelected: {
    color: '#FFFFFF',
    fontWeight: '800',
  },
});

