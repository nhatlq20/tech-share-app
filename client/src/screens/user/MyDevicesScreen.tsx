import React, { useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  Image,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  Platform,
  StatusBar,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { DeviceStatusToggle } from "../../components/device/DeviceStatusToggle";
import { OwnerAvailabilityModal } from "../../components/OwnerAvailabilityModal";
import { theme, STRINGS, CONFIG } from "../../constants";
import type { BlockedDate, ManagedDeviceStatus, OwnedDevice } from "../../types";
import { deviceService } from "../../services/deviceService";
import { useSelector } from "react-redux";
import { RootState } from "../../store";
import { useEffect } from "react";
import { API_BASE_URL } from "../../config/api";

const FALLBACK_DEVICE_IMAGE =
  "https://images.unsplash.com/photo-1519389950473-47ba0277781c?w=600";

const resolveImageUri = (image?: string) => {
  if (!image?.trim()) return FALLBACK_DEVICE_IMAGE;
  if (image.startsWith("http://") || image.startsWith("https://")) {
    return image;
  }
  if (image.startsWith("/")) {
    const origin = API_BASE_URL.replace(/\/api\/?$/, "");
    return `${origin}${image}`;
  }
  return image;
};

interface MyDevicesScreenProps {
  onBack: () => void;
}

export function MyDevicesScreen({ onBack }: MyDevicesScreenProps) {
  const insets = useSafeAreaInsets();
  const topInset = Math.max(
    insets.top,
    Platform.OS === 'android' ? StatusBar.currentHeight || 24 : 20
  );
  const token = useSelector((state: RootState) => state.auth.token);

  const [isLoadingDevices, setIsLoadingDevices] = useState(false);
  const [devicesError, setDevicesError] = useState("");
  const [devices, setDevices] = useState([] as OwnedDevice[]);
  const [modalVisible, setModalVisible] = useState(false);
  const [selectedDevice, setSelectedDevice] = useState(null as OwnedDevice | null);

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
        setDevicesError(STRINGS.MY_DEVICES.ERROR_DEFAULT);
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

  const openAvailabilityModal = (device: OwnedDevice) => {
    setSelectedDevice(device);
    setModalVisible(true);
  };

  const blockedDates = async(
     deviceId: string,
     bockedDates : BlockedDate[],
  )=> {
     if (!token) return;

       try {
          await deviceService.updateBlockDate(token,deviceId,bockedDates) 

       } catch (error) {
         console.error("Update blockedDates failed:", error);
       }

  }

  return (
    <View style={styles.container}>
      <View style={[styles.header, { paddingTop: topInset + 8 }]}>
        <TouchableOpacity
          onPress={onBack}
          style={styles.backButton}
          accessibilityRole="button"
          accessibilityLabel={STRINGS.MY_DEVICES.BACK_ACCESSIBILITY_LABEL}
        >
          <Ionicons
            name="arrow-back"
            size={24}
            color={theme.textPrimary}
          />
        </TouchableOpacity>
        <View style={styles.heading}>
          <Text style={styles.title} accessibilityRole="header">
            {STRINGS.MY_DEVICES.TITLE}
          </Text>
          <Text style={styles.subtitle}>{STRINGS.MY_DEVICES.SUBTITLE}</Text>
        </View>
      </View>

      {isLoadingDevices ? (
        <View style={styles.feedbackState} accessibilityLiveRegion="polite">
          <ActivityIndicator size="large" color={theme.primary} />
          <Text style={styles.emptyDescription}>{STRINGS.MY_DEVICES.LOADING}</Text>
        </View>
      ) : devicesError ? (
        <View style={styles.feedbackState} accessibilityRole="alert">
          <Ionicons
            name="alert-circle-outline"
            size={48}
            color={theme.danger}
          />
          <Text style={styles.emptyTitle}>{STRINGS.MY_DEVICES.ERROR_TITLE}</Text>
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
                source={{ uri: resolveImageUri(device.images?.[0]) }}
                style={styles.deviceImage}
                resizeMode="cover"
                accessibilityLabel={device.title}
                onError={(event: any) => {
                  console.warn(
                    "[MyDevicesScreen] Device image failed to load",
                    {
                      deviceId: device._id,
                      image: device.images?.[0],
                      error: event.nativeEvent.error,
                    },
                  );
                }}
              />
              <View style={styles.cardContent}>
                <Text style={styles.deviceTitle}>{device.title}</Text>
                <Text style={styles.category}>{device.category}</Text>
                <Text style={styles.price}>
                  {device.dailyRate.toLocaleString(CONFIG.CURRENCY.LOCALE)} {STRINGS.COMMON.CURRENCY_SUFFIX}
                  <Text style={styles.priceUnit}>{STRINGS.MY_DEVICES.PRICE_UNIT}</Text>
                </Text>

                <View style={styles.stats}>
                  <View style={styles.statItem}>
                    <Text style={styles.statValue}>{device.rentalCount}</Text>
                    <Text style={styles.statLabel}>{STRINGS.MY_DEVICES.RENTALS_LABEL}</Text>
                  </View>
                  <View style={styles.statDivider} />
                  <View style={styles.statItem}>
                    <View style={styles.ratingValue}>
                      <Ionicons
                        name="star"
                        size={18}
                        color={theme.warning}
                      />
                      <Text style={styles.statValue}>{device.ratingAvg}</Text>
                    </View>
                    <Text style={styles.statLabel}>{STRINGS.MY_DEVICES.RATING_LABEL}</Text>
                  </View>
                </View>

                <Text style={styles.statusLabel}>{STRINGS.MY_DEVICES.DEVICE_STATUS_LABEL}</Text>
                <DeviceStatusToggle
                  status={device.status}
                  onChange={(newStatus: ManagedDeviceStatus) =>
                    handleStatusChange(device._id, newStatus)
                  }
                />
                <TouchableOpacity
                  onPress={() => openAvailabilityModal(device)}
                  style={styles.availabilityButton}
                  accessibilityRole="button"
                >
                  <Ionicons
                    name="calendar-outline"
                    size={18}
                    color={theme.primary}
                  />
                  <Text style={styles.availabilityButtonText}>
                    {STRINGS.MY_DEVICES.MANAGE_AVAILABILITY}
                  </Text>
                </TouchableOpacity>
              </View>
            </View>
          )}
          ListEmptyComponent={
            <View style={styles.emptyState}>
              <Ionicons
                name="cube-outline"
                size={48}
                color={theme.textSecondary}
              />
              <Text style={styles.emptyTitle}>{STRINGS.MY_DEVICES.EMPTY_TITLE}</Text>
              <Text style={styles.emptyDescription}>
                {STRINGS.MY_DEVICES.EMPTY_DESC}
              </Text>
            </View>
          }
        />
      )}
      <OwnerAvailabilityModal
        visible={modalVisible}
        deviceName={selectedDevice?.title ?? ""}
        onClose={() => setModalVisible(false)}
        deviceId={selectedDevice?._id ?? ""}
        onUpdateBlockedDates={blockedDates}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.surface },
  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: theme.spacing.sm + 4,
    paddingVertical: theme.spacing.md,
    gap: theme.spacing.sm,
    backgroundColor: theme.background,
    borderBottomWidth: 1,
    borderBottomColor: theme.border,
  },
  backButton: {
    width: 48,
    height: 48,
    alignItems: "center",
    justifyContent: "center",
  },
  heading: { flex: 1 },
  title: { fontSize: 22, fontWeight: "700", color: theme.textPrimary },
  subtitle: { fontSize: 14, color: theme.textSecondary, marginTop: 4 },
  listContent: {
    width: "100%",
    maxWidth: 720,
    alignSelf: "center",
    padding: theme.spacing.md,
    paddingBottom: theme.spacing.xl,
  },
  card: {
    backgroundColor: theme.background,
    borderRadius: theme.radii.lg,
    borderWidth: 1,
    borderColor: theme.border,
    marginBottom: theme.spacing.md,
    ...theme.shadows.card,
  },
  deviceImage: {
    width: "100%",
    aspectRatio: 1.8,
    maxHeight: 300,
    backgroundColor: theme.border,
    borderTopLeftRadius: theme.radii.lg - 1,
    borderTopRightRadius: theme.radii.lg - 1,
  },
  cardContent: { padding: theme.spacing.sm + 6 },
  deviceTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: theme.textPrimary,
  },
  category: {
    fontSize: 13,
    color: theme.textSecondary,
    marginTop: 4,
    textTransform: "capitalize",
  },
  price: {
    fontSize: 18,
    fontWeight: "700",
    color: theme.primary,
    marginTop: 12,
  },
  priceUnit: {
    fontSize: 13,
    fontWeight: "400",
    color: theme.textSecondary,
  },
  stats: {
    flexDirection: "row",
    paddingVertical: 14,
    marginVertical: 16,
    borderTopWidth: 1,
    borderBottomWidth: 1,
    borderColor: theme.border,
  },
  statItem: { flex: 1, alignItems: "center", gap: 4 },
  statValue: {
    fontSize: 18,
    fontWeight: "700",
    color: theme.textPrimary,
  },
  statLabel: { fontSize: 12, color: theme.textSecondary },
  statDivider: { width: 1, backgroundColor: theme.border },
  ratingValue: { flexDirection: "row", alignItems: "center", gap: 4 },
  statusLabel: {
    fontSize: 13,
    fontWeight: "600",
    color: theme.textPrimary,
    marginBottom: 8,
  },
  availabilityButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    marginTop: 16,
    paddingVertical: 12,
    borderRadius: theme.radii.md,
    borderWidth: 1,
    borderColor: theme.primary,
  },
  availabilityButtonText: {
    color: theme.primary,
    fontSize: 14,
    fontWeight: "700",
  },
  emptyList: { flexGrow: 1 },
  feedbackState: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: theme.spacing.lg + 8,
    gap: 12,
  },
  errorDescription: {
    fontSize: 14,
    color: theme.danger,
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
    color: theme.textPrimary,
    textAlign: "center",
  },
  emptyDescription: {
    fontSize: 14,
    color: theme.textSecondary,
    textAlign: "center",
  },
});
