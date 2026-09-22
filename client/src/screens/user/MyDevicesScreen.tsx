import React, { useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  Image,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { DeviceStatusToggle } from "../../components/device/DeviceStatusToggle";
import { colors } from "../../theme/colors";
import type { ManagedDeviceStatus, OwnedDevice } from "../../types";
import { deviceService } from "../../services/deviceService";
import { useSelector } from "react-redux";
import { RootState } from "../../store";
import { useEffect } from "react";

interface MyDevicesScreenProps {
  onBack: () => void;
}

export function MyDevicesScreen({ onBack }: MyDevicesScreenProps) {
  const token = useSelector((state: RootState) => state.auth.token);

  const [isLoadingDevices, setIsLoadingDevices] = useState(false);
  const [devicesError, setDevicesError] = useState("");
  const [devices, setDevices] = useState([] as OwnedDevice[]);

  useEffect(() => {
    if (!token) return;

    const getMyDevices = async () => {
      setIsLoadingDevices(true);
      setDevicesError("");
      try {
        const data = await deviceService.getMyDevices(token);
        console.log(data);
        setDevices(data);
      } catch (error) {
        console.error("[PostDeviceScreen] Cannot load owner's devices:", error);
        setDevicesError("Cannot load your devices. Please check the server.");
      } finally {
        setIsLoadingDevices(false);
      }
    };

    getMyDevices();
  }, [token]);

  const handleStatusChange = async (
    deviceId: string,
    newStatus: ManagedDeviceStatus,
  ) => {
    if (!token) return;

    try {
      await deviceService.updateDeviceStatus(token, deviceId, newStatus);

      setDevices((previous: OwnedDevice[]) =>
        previous.map((device: OwnedDevice) =>
          device._id === deviceId ? { ...device, status: newStatus } : device,
        ),
      );

      console.log("Update status success:", newStatus);
    } catch (error) {
      console.error("Update status failed:", error);
    }
  };
  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity
          onPress={onBack}
          style={styles.backButton}
          accessibilityRole="button"
          accessibilityLabel="Back to Profile"
        >
          <Ionicons
            name="arrow-back"
            size={24}
            color={colors.light.textPrimary}
          />
        </TouchableOpacity>
        <View style={styles.heading}>
          <Text style={styles.title} accessibilityRole="header">
            My Devices
          </Text>
          <Text style={styles.subtitle}>Manage your listed devices</Text>
        </View>
      </View>

      {isLoadingDevices ? (
        <View style={styles.feedbackState} accessibilityLiveRegion="polite">
          <ActivityIndicator size="large" color={colors.light.primary} />
          <Text style={styles.emptyDescription}>Loading your devices...</Text>
        </View>
      ) : devicesError ? (
        <View style={styles.feedbackState} accessibilityRole="alert">
          <Ionicons
            name="alert-circle-outline"
            size={48}
            color={colors.light.error}
          />
          <Text style={styles.emptyTitle}>Unable to load devices</Text>
          <Text style={styles.errorDescription}>{devicesError}</Text>
        </View>
      ) : (
        <FlatList
          data={devices}
          keyExtractor={(device: OwnedDevice) => device._id}
          contentContainerStyle={[
            styles.listContent,
            devices.length === 0 && styles.emptyList,
          ]}
          showsVerticalScrollIndicator={false}
          renderItem={({ item: device }: { item: OwnedDevice }) => (
            <View style={styles.card}>
              <Image
                source={{ uri: device.image }}
                style={styles.deviceImage}
                resizeMode="cover"
                accessibilityLabel={device.title}
              />
              <View style={styles.cardContent}>
                <Text style={styles.deviceTitle}>{device.title}</Text>
                <Text style={styles.category}>{device.category}</Text>
                <Text style={styles.price}>
                  {device.dailyRate.toLocaleString("vi-VN")} VND
                  <Text style={styles.priceUnit}> / day</Text>
                </Text>

                <View style={styles.stats}>
                  <View style={styles.statItem}>
                    <Text style={styles.statValue}>{device.rentalCount}</Text>
                    <Text style={styles.statLabel}>Rentals</Text>
                  </View>
                  <View style={styles.statDivider} />
                  <View style={styles.statItem}>
                    <View style={styles.ratingValue}>
                      <Ionicons
                        name="star"
                        size={18}
                        color={colors.light.ratingStar}
                      />
                      <Text style={styles.statValue}>{device.ratingAvg}</Text>
                    </View>
                    <Text style={styles.statLabel}>Rating</Text>
                  </View>
                </View>

                <Text style={styles.statusLabel}>Device Status</Text>
                <DeviceStatusToggle
                  status={device.status}
                  onChange={(newStatus: ManagedDeviceStatus) =>
                    handleStatusChange(device._id, newStatus)
                  }
                />
              </View>
            </View>
          )}
          ListEmptyComponent={
            <View style={styles.emptyState}>
              <Ionicons
                name="cube-outline"
                size={48}
                color={colors.light.textSecondary}
              />
              <Text style={styles.emptyTitle}>No devices yet</Text>
              <Text style={styles.emptyDescription}>
                You haven't listed any devices.
              </Text>
            </View>
          }
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.light.surface },
  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 12,
    paddingVertical: 16,
    gap: 8,
    backgroundColor: colors.light.background,
    borderBottomWidth: 1,
    borderBottomColor: colors.light.border,
  },
  backButton: {
    width: 48,
    height: 48,
    alignItems: "center",
    justifyContent: "center",
  },
  heading: { flex: 1 },
  title: { fontSize: 22, fontWeight: "700", color: colors.light.textPrimary },
  subtitle: { fontSize: 14, color: colors.light.textSecondary, marginTop: 4 },
  listContent: {
    width: "100%",
    maxWidth: 720,
    alignSelf: "center",
    padding: 16,
    paddingBottom: 24,
  },
  card: {
    backgroundColor: colors.light.background,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.light.border,
    marginBottom: 16,
    shadowColor: colors.light.textPrimary,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 6,
    elevation: 2,
  },
  deviceImage: {
    width: "100%",
    aspectRatio: 1.8,
    maxHeight: 300,
    backgroundColor: colors.light.border,
    borderTopLeftRadius: 15,
    borderTopRightRadius: 15,
  },
  cardContent: { padding: 14 },
  deviceTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: colors.light.textPrimary,
  },
  category: {
    fontSize: 13,
    color: colors.light.textSecondary,
    marginTop: 4,
    textTransform: "capitalize",
  },
  price: {
    fontSize: 18,
    fontWeight: "700",
    color: colors.light.primary,
    marginTop: 12,
  },
  priceUnit: {
    fontSize: 13,
    fontWeight: "400",
    color: colors.light.textSecondary,
  },
  stats: {
    flexDirection: "row",
    paddingVertical: 14,
    marginVertical: 16,
    borderTopWidth: 1,
    borderBottomWidth: 1,
    borderColor: colors.light.border,
  },
  statItem: { flex: 1, alignItems: "center", gap: 4 },
  statValue: {
    fontSize: 18,
    fontWeight: "700",
    color: colors.light.textPrimary,
  },
  statLabel: { fontSize: 12, color: colors.light.textSecondary },
  statDivider: { width: 1, backgroundColor: colors.light.border },
  ratingValue: { flexDirection: "row", alignItems: "center", gap: 4 },
  statusLabel: {
    fontSize: 13,
    fontWeight: "600",
    color: colors.light.textPrimary,
    marginBottom: 8,
  },
  emptyList: { flexGrow: 1 },
  feedbackState: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: 24,
    gap: 12,
  },
  errorDescription: {
    fontSize: 14,
    color: colors.light.error,
    textAlign: "center",
  },
  emptyState: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 48,
    gap: 12,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: colors.light.textPrimary,
    textAlign: "center",
  },
  emptyDescription: {
    fontSize: 14,
    color: colors.light.textSecondary,
    textAlign: "center",
  },
});
