import React from 'react';
import { StyleSheet, View, Text, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../../theme/colors';

interface MapScreenProps {
  onNavigateToDeviceDetail?: (deviceId: string) => void;
  onNavigateToHome?: () => void;
}

export function MapScreen({ onNavigateToHome }: MapScreenProps) {
  return (
    <View style={styles.container}>
      {/* HEADER */}
      <View style={styles.header}>
        <View style={styles.headerTitleRow}>
          <Ionicons name="map" size={24} color={colors.light.primary} />
          <Text style={styles.headerTitle}>Gần bạn</Text>
        </View>
        <Text style={styles.headerSubtitle}>
          Khám phá thiết bị công nghệ cho thuê quanh vị trí của bạn
        </Text>
      </View>

      {/* PLACEHOLDER BODY */}
      <View style={styles.content}>
        <View style={styles.iconCircle}>
          <Ionicons name="map-outline" size={54} color={colors.light.primary} />
        </View>
        <Text style={styles.title}>Bản đồ thiết bị</Text>
        <Text style={styles.description}>
          Chức năng định vị bản đồ GPS tương tác đang được hoàn thiện. Bạn có thể quay lại trang chủ để khám phá toàn bộ thiết bị.
        </Text>

        {onNavigateToHome && (
          <TouchableOpacity
            style={styles.actionButton}
            onPress={onNavigateToHome}
            activeOpacity={0.8}
          >
            <Ionicons name="home-outline" size={18} color="#FFFFFF" />
            <Text style={styles.actionButtonText}>Về trang chủ</Text>
          </TouchableOpacity>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.light.background,
  },
  header: {
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: colors.light.border,
  },
  headerTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  headerTitle: {
    fontSize: 22,
    fontWeight: '800',
    color: colors.light.textPrimary,
  },
  headerSubtitle: {
    fontSize: 13,
    color: colors.light.textSecondary,
    marginTop: 4,
  },
  content: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 32,
    gap: 12,
  },
  iconCircle: {
    width: 96,
    height: 96,
    borderRadius: 48,
    backgroundColor: colors.light.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  title: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.light.textPrimary,
  },
  description: {
    fontSize: 13,
    color: colors.light.textSecondary,
    textAlign: 'center',
    lineHeight: 20,
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: colors.light.primary,
    paddingHorizontal: 20,
    paddingVertical: 11,
    borderRadius: 12,
    marginTop: 12,
  },
  actionButtonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '700',
  },
});
