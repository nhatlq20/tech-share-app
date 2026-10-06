import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Image,
  Modal,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { AIComparison } from '../../types/ai';
import { Device } from '../../types';
import { deviceService } from '../../services/deviceService';
import { AIServiceError, compareDevices } from '../../services/aiService';
import { ComparisonTable } from '../../components/ai/ComparisonTable';
import { colors } from '../../theme/colors';

type DeviceSlot = 'device1' | 'device2';

const formatPrice = (price: number) => `${price.toLocaleString('vi-VN')} đ/day`;

export function AiCompareScreen() {
  const [devices, setDevices] = React.useState<Device[]>([]);
  const [device1, setDevice1] = React.useState<Device | null>(null);
  const [device2, setDevice2] = React.useState<Device | null>(null);
  const [comparison, setComparison] = React.useState<AIComparison | null>(null);
  const [loading, setLoading] = React.useState(false);
  const [devicesLoading, setDevicesLoading] = React.useState(true);
  const [error, setError] = React.useState('');
  const [pickerVisible, setPickerVisible] = React.useState(false);
  const [activeSlot, setActiveSlot] = React.useState<DeviceSlot | null>(null);

  useEffect(() => {
    let isMounted = true;

    const loadDevices = async () => {
      try {
        const result = await deviceService.getDevices({ limit: 100 });
        if (isMounted) setDevices(result);
      } catch {
        if (isMounted) setError('Unable to load devices. Please try again.');
      } finally {
        if (isMounted) setDevicesLoading(false);
      }
    };

    loadDevices();
    return () => {
      isMounted = false;
    };
  }, []);

  const openDevicePicker = (slot: DeviceSlot) => {
    setActiveSlot(slot);
    setPickerVisible(true);
  };

  const chooseDevice = (device: Device) => {
    if (activeSlot === 'device1') {
      setDevice1(device);
    } else if (activeSlot === 'device2') {
      setDevice2(device);
    }
    setComparison(null);
    setError('');
    setPickerVisible(false);
  };

  const handleCompare = async () => {
    if (!device1 || !device2) {
      setError('Please select two devices.');
      return;
    }

    if (device1._id === device2._id) {
      setError('Please select two different devices.');
      return;
    }

    setError('');
    setLoading(true);
    try {
      const data = await compareDevices(device1._id, device2._id);
      setComparison(data);
    } catch (requestError: unknown) {
      const message =
        requestError instanceof AIServiceError && requestError.status === 503
          ? 'AI is currently busy. Please try again later.'
          : 'Unable to compare these devices. Please try again.';
      setError(message);
    } finally {
      setLoading(false);
    }
  };

  const renderSelectedDevice = (device: Device | null, slot: DeviceSlot) => (
    <View style={styles.deviceCard}>
      {device ? (
        <>
          <Image
            source={{
              uri:
                device.images?.[0] ||
                'https://images.unsplash.com/photo-1519389950473-47ba0277781c?w=600',
            }}
            style={styles.deviceImage}
          />
          <Text style={styles.deviceName}>{device.title}</Text>
          <Text style={styles.deviceBrand}>{device.brand}</Text>
          <Text style={styles.devicePrice}>{formatPrice(device.dailyRate)}</Text>
        </>
      ) : (
        <Text style={styles.emptySelection}>No device selected</Text>
      )}
      <TouchableOpacity
        style={styles.selectButton}
        onPress={() => openDevicePicker(slot)}
        activeOpacity={0.8}
      >
        <Text style={styles.selectButtonText}>
          {device ? 'Change Device' : 'Select Device'}
        </Text>
      </TouchableOpacity>
    </View>
  );

  return (
    <View style={styles.screen}>
      <ScrollView contentContainerStyle={styles.content}>
        <Text style={styles.heading}>AI Device Comparison</Text>

        {devicesLoading ? (
          <View style={styles.devicesLoading}>
            <ActivityIndicator color={colors.light.primary} />
            <Text style={styles.loadingText}>Loading devices...</Text>
          </View>
        ) : (
          <>
            <Text style={styles.slotTitle}>Device 1</Text>
            {renderSelectedDevice(device1, 'device1')}

            <Text style={styles.versus}>VS</Text>

            <Text style={styles.slotTitle}>Device 2</Text>
            {renderSelectedDevice(device2, 'device2')}
          </>
        )}

        {error ? <Text style={styles.error}>{error}</Text> : null}

        <TouchableOpacity
          style={[styles.compareButton, loading && styles.disabledButton]}
          onPress={handleCompare}
          disabled={loading || devicesLoading}
          activeOpacity={0.8}
        >
          {loading ? (
            <ActivityIndicator color="#FFFFFF" />
          ) : (
            <Ionicons name="git-compare-outline" size={18} color="#FFFFFF" />
          )}
          <Text style={styles.compareButtonText}>Compare with AI</Text>
        </TouchableOpacity>

        {loading ? (
          <Text style={styles.loadingText}>AI is comparing the devices...</Text>
        ) : null}

        {comparison && device1 && device2 ? (
          <ComparisonTable
            device1={device1}
            device2={device2}
            comparison={comparison}
          />
        ) : null}
      </ScrollView>

      <Modal
        visible={pickerVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setPickerVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.picker}>
            <View style={styles.pickerHeader}>
              <Text style={styles.pickerTitle}>Select a device</Text>
              <TouchableOpacity onPress={() => setPickerVisible(false)}>
                <Ionicons name="close" size={24} color={colors.light.textPrimary} />
              </TouchableOpacity>
            </View>
            <FlatList
              data={devices}
              keyExtractor={(item: Device) => item._id}
              ListEmptyComponent={
                <Text style={styles.emptyList}>No devices are available.</Text>
              }
              renderItem={({ item }: { item: Device }) => (
                <TouchableOpacity
                  style={styles.deviceOption}
                  onPress={() => chooseDevice(item)}
                >
                  <Text style={styles.optionName}>{item.title}</Text>
                  <Text style={styles.deviceBrand}>
                    {item.brand} · {formatPrice(item.dailyRate)}
                  </Text>
                </TouchableOpacity>
              )}
            />
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: colors.light.background,
  },
  content: {
    padding: 16,
    paddingBottom: 36,
  },
  heading: {
    color: colors.light.textPrimary,
    fontSize: 22,
    fontWeight: '800',
    marginBottom: 20,
  },
  slotTitle: {
    color: colors.light.textPrimary,
    fontSize: 16,
    fontWeight: '700',
    marginBottom: 8,
  },
  deviceCard: {
    backgroundColor: colors.light.surface,
    borderColor: colors.light.border,
    borderRadius: 14,
    borderWidth: 1,
    padding: 12,
  },
  deviceImage: {
    width: '100%',
    height: 150,
    backgroundColor: colors.light.border,
    borderRadius: 10,
    marginBottom: 10,
  },
  deviceName: {
    color: colors.light.textPrimary,
    fontSize: 15,
    fontWeight: '700',
  },
  deviceBrand: {
    color: colors.light.textSecondary,
    fontSize: 13,
    marginTop: 4,
  },
  devicePrice: {
    color: colors.light.primary,
    fontSize: 14,
    fontWeight: '700',
    marginTop: 6,
  },
  emptySelection: {
    color: colors.light.textSecondary,
    paddingVertical: 18,
    textAlign: 'center',
  },
  selectButton: {
    alignItems: 'center',
    backgroundColor: colors.light.primaryLight,
    borderRadius: 10,
    marginTop: 12,
    paddingVertical: 11,
  },
  selectButtonText: {
    color: colors.light.primaryDark,
    fontSize: 14,
    fontWeight: '700',
  },
  versus: {
    color: colors.light.textSecondary,
    fontSize: 16,
    fontWeight: '800',
    marginVertical: 16,
    textAlign: 'center',
  },
  compareButton: {
    alignItems: 'center',
    backgroundColor: colors.light.primary,
    borderRadius: 12,
    flexDirection: 'row',
    gap: 8,
    justifyContent: 'center',
    marginTop: 20,
    paddingVertical: 14,
  },
  disabledButton: {
    opacity: 0.7,
  },
  compareButtonText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '700',
  },
  error: {
    color: colors.light.error,
    fontSize: 14,
    marginTop: 12,
    textAlign: 'center',
  },
  devicesLoading: {
    alignItems: 'center',
    paddingVertical: 36,
  },
  loadingText: {
    color: colors.light.textSecondary,
    fontSize: 14,
    marginTop: 10,
    textAlign: 'center',
  },
  modalOverlay: {
    backgroundColor: 'rgba(15, 23, 42, 0.5)',
    flex: 1,
    justifyContent: 'flex-end',
  },
  picker: {
    backgroundColor: colors.light.background,
    borderTopLeftRadius: 18,
    borderTopRightRadius: 18,
    maxHeight: '75%',
    padding: 18,
  },
  pickerHeader: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  pickerTitle: {
    color: colors.light.textPrimary,
    fontSize: 18,
    fontWeight: '700',
  },
  deviceOption: {
    borderBottomColor: colors.light.border,
    borderBottomWidth: 1,
    paddingVertical: 14,
  },
  optionName: {
    color: colors.light.textPrimary,
    fontSize: 14,
    fontWeight: '600',
  },
  emptyList: {
    color: colors.light.textSecondary,
    paddingVertical: 24,
    textAlign: 'center',
  },
});
