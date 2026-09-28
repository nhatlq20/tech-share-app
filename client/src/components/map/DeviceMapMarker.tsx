import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Marker } from 'react-native-maps';
import { colors } from '../../theme/colors';
import { Device } from '../../types';
import { formatCompactPrice } from './DeviceMapOverlayMarker';

const MarkerComponent = Marker as any;

interface DeviceMapMarkerProps {
  device: Device;
  coordinate: { latitude: number; longitude: number };
  selected: boolean;
  onSelect: (deviceId: string) => void;
}

export function DeviceMapMarker({
  device,
  coordinate,
  selected,
  onSelect,
}: DeviceMapMarkerProps) {
  const dailyRate = device.dailyRate ?? (device as any).pricePerDay ?? 0;
  const title = device.title || (device as any).name || 'Thiết bị';

  return (
    <MarkerComponent
      identifier={device._id}
      coordinate={coordinate}
      zIndex={selected ? 999 : 1}
      tracksViewChanges={true}
      onPress={(e: any) => {
        e?.stopPropagation?.();
        onSelect(device._id);
      }}
      accessibilityRole="button"
      accessibilityLabel={`${title}, ${dailyRate.toLocaleString('vi-VN')} đ/ngày`}
    >
      <View style={[styles.marker, selected && styles.markerSelected]}>
        <Text style={[styles.priceText, selected && styles.priceTextSelected]}>
          {formatCompactPrice(dailyRate)}
        </Text>
      </View>
    </MarkerComponent>
  );
}

const styles = StyleSheet.create({
  marker: {
    width: 54,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFFFFF',
    borderWidth: 1.5,
    borderColor: colors.light.primary,
    elevation: 3,
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
