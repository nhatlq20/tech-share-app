import React, { useEffect, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useSelector } from "react-redux";
import { theme } from "../../constants/theme";
import { RootState } from "../../store";
import { RevenueChart } from "../../components/analytics/RevenueChart";
import { RevenueSummary } from "../../components/analytics/RevenueSummary";
import { UtilizationCard } from "../../components/analytics/UtilizationCard";
import { DeviceStats } from "../../components/analytics/DeviceStats";
import { RentalPaymentItem } from "../../components/analytics/RentalPaymentItem";
import {
  OwnerAnalyticsBooking,
  OwnerAnalyticsData,
  OwnerAnalyticsDevice,
  OwnerRevenueByDay,
  ownerAnalyticsService,
} from "../../services/ownerAnalyticsService";
import type { Period, RentalPayment, RevenueData } from "../../data/ownerAnalyticsMock";

const getBookingDate = (booking: OwnerAnalyticsBooking) =>
  new Date(booking.updatedAt || booking.endDate || booking.startDate);

const getChartData = (
  bookings: OwnerAnalyticsBooking[],
  revenueByDay: OwnerRevenueByDay[],
  period: Period,
): RevenueData[] => {
  const today = new Date();

  if (period === "week") {
    if (revenueByDay.length > 0) {
      return revenueByDay.map((item) => ({ label: item.day, revenue: item.revenue }));
    }

    return Array.from({ length: 7 }, (_, index) => {
      const day = new Date(today);
      day.setDate(today.getDate() - 6 + index);
      day.setHours(0, 0, 0, 0);
      const nextDay = new Date(day);
      nextDay.setDate(day.getDate() + 1);

      return {
        label: day.toLocaleDateString("en-US", { weekday: "short" }),
        revenue: bookings.reduce((sum, booking) => {
          const bookingDate = getBookingDate(booking);
          return bookingDate >= day && bookingDate < nextDay
            ? sum + Number(booking.rentalFee || 0)
            : sum;
        }, 0),
      };
    });
  }

  return Array.from({ length: 5 }, (_, index) => ({
    label: `Week ${index + 1}`,
    revenue: bookings.reduce((sum, booking) => {
      const bookingDate = getBookingDate(booking);
      const isCurrentMonth =
        bookingDate.getFullYear() === today.getFullYear() &&
        bookingDate.getMonth() === today.getMonth();
      const bookingWeek = Math.floor((bookingDate.getDate() - 1) / 7);

      return isCurrentMonth && bookingWeek === index
        ? sum + Number(booking.rentalFee || 0)
        : sum;
    }, 0),
  }));
};

const formatDate = (dateValue?: string | null) => {
  if (!dateValue) return "-";
  const date = new Date(dateValue);
  return Number.isNaN(date.getTime()) ? "-" : date.toLocaleDateString("vi-VN");
};

interface OwnerAnalyticsScreenProps {
  onBackToHome?: () => void;
  onNavigateToDeviceDetail?: (deviceId: string) => void;
}

export function OwnerAnalyticsScreen({
  onBackToHome,
}: OwnerAnalyticsScreenProps) {
  const token = useSelector((state: RootState) => state.auth.token);
  const role = useSelector((state: RootState) => state.auth.user?.role);
  const [period, setPeriod] = useState("week" as Period);
  const [isLoading, setIsLoading] = useState(true);
  const [analytics, setAnalytics] = useState(null as OwnerAnalyticsData | null);
  const [errorMessage, setErrorMessage] = useState("");
  const [reloadCount, setReloadCount] = useState(0);

  useEffect(() => {
    let isMounted = true;

    if (!token || role !== "owner") {
      setAnalytics(null);
      setErrorMessage(token ? "Owner access is required." : "Please sign in again.");
      setIsLoading(false);
      return () => {
        isMounted = false;
      };
    }

    setIsLoading(true);
    setErrorMessage("");

    ownerAnalyticsService
      .getOwnerAnalytics(token)
      .then((data) => {
        if (isMounted) setAnalytics(data);
      })
      .catch((error: any) => {
        if (isMounted) {
          setErrorMessage(
            error?.response?.data?.message || error?.message || "Unable to load analytics.",
          );
        }
      })
      .finally(() => {
        if (isMounted) setIsLoading(false);
      });

    return () => {
      isMounted = false;
    };
  }, [token, role, reloadCount]);

  const devices: OwnerAnalyticsDevice[] = analytics?.devices || [];
  const bookings: OwnerAnalyticsBooking[] = analytics?.bookings || [];
  const totalDevices = analytics?.totalDevices ?? devices.length;
  const rentedDevices = analytics?.rentedDevices ?? 0;
  const availableDevices = devices.filter((device) => device.status === "available").length;
  const utilizationRate = totalDevices
    ? Math.round((rentedDevices / totalDevices) * 100)
    : 0;
  const chartData = getChartData(bookings, analytics?.revenueByDay || [], period);
  const deviceById = new Map(devices.map((device) => [device._id, device]));
  const rentalPayments: RentalPayment[] = bookings.map((booking) => {
    const deviceReference = typeof booking.deviceId === "string" ? null : booking.deviceId;
    const renterReference = typeof booking.renterId === "string" ? null : booking.renterId;
    const deviceId =
      typeof booking.deviceId === "string" ? booking.deviceId : booking.deviceId._id;
    const bookingDate = booking.updatedAt || booking.endDate || booking.startDate;

    return {
      id: booking._id,
      deviceName: deviceReference?.name || deviceById.get(deviceId)?.name || "Rental device",
      renterName: renterReference?.name || "Renter",
      amount: Number(booking.rentalFee || 0),
      date: formatDate(bookingDate),
      status: "completed",
    };
  });

  if (role !== "owner") {
    return (
      <View style={styles.loadingContainer}>
        <Text style={styles.loadingText}>Owner access is required.</Text>
      </View>
    );
  }

  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator color={theme.colors.primary[600]} />
        <Text style={styles.loadingText}>Loading analytics...</Text>
      </View>
    );
  }

  if (errorMessage && !analytics) {
    return (
      <View style={styles.loadingContainer}>
        <Text style={styles.errorText}>{errorMessage}</Text>
        <TouchableOpacity
          accessibilityRole="button"
          onPress={() => setReloadCount(reloadCount + 1)}
          style={styles.retryButton}
        >
          <Text style={styles.retryButtonText}>Retry</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <ScrollView
      style={styles.screen}
      contentContainerStyle={styles.content}
      showsVerticalScrollIndicator={false}
    >
      <View style={styles.header}>
        <TouchableOpacity
          accessibilityRole="button"
          accessibilityLabel="Go back"
          onPress={onBackToHome}
          style={styles.backButton}
        >
          <Ionicons name="arrow-back" size={20} color={theme.textPrimary} />
        </TouchableOpacity>
        <View style={styles.headerText}>
          <Text style={styles.title}>Revenue &amp; Analytics</Text>
          <Text style={styles.subtitle}>Track your rental performance</Text>
        </View>
      </View>

      <RevenueSummary
        totalRevenue={analytics?.totalRevenue || 0}
      />

      <View style={styles.section}>
        <View style={styles.sectionHeading}>
          <Text style={styles.sectionTitle}>Revenue overview</Text>
          <View style={styles.periodControl}>
            <TouchableOpacity
              accessibilityRole="button"
              accessibilityState={{ selected: period === "week" }}
              onPress={() => setPeriod("week")}
              style={[
                styles.periodButton,
                period === "week" && styles.periodButtonSelected,
              ]}
            >
              <Text
                style={[
                  styles.periodText,
                  period === "week" && styles.periodTextSelected,
                ]}
              >
                Week
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              accessibilityRole="button"
              accessibilityState={{ selected: period === "month" }}
              onPress={() => setPeriod("month")}
              style={[
                styles.periodButton,
                period === "month" && styles.periodButtonSelected,
              ]}
            >
              <Text
                style={[
                  styles.periodText,
                  period === "month" && styles.periodTextSelected,
                ]}
              >
                Month
              </Text>
            </TouchableOpacity>
          </View>
        </View>
        <RevenueChart data={chartData} period={period} />
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Device utilization</Text>
        <UtilizationCard
          utilizationRate={utilizationRate}
          rentedDevices={rentedDevices}
          totalDevices={totalDevices}
        />
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Device statistics</Text>
        <DeviceStats statistics={{ totalDevices, rentedDevices, availableDevices }} />
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Rental Payment History</Text>
        {rentalPayments.length === 0 ? (
          <View style={styles.emptyState}>
            <Ionicons
              name="receipt-outline"
              size={28}
              color={theme.textSecondary}
            />
            <Text style={styles.emptyText}>No rental payments yet</Text>
          </View>
        ) : (
          <FlatList
            data={rentalPayments}
            keyExtractor={(item: RentalPayment) => item.id}
            renderItem={({ item }: { item: RentalPayment }) => (
              <RentalPaymentItem payment={item} />
            )}
            scrollEnabled={false}
            ItemSeparatorComponent={() => (
              <View style={styles.paymentSeparator} />
            )}
          />
        )}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: theme.background,
  },
  content: {
    padding: theme.spacing.md,
    paddingBottom: theme.spacing.xl,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: theme.spacing.lg,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: theme.radii.md,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: theme.card,
    borderWidth: 1,
    borderColor: theme.border,
    marginRight: theme.spacing.sm,
  },
  headerText: {
    flex: 1,
  },
  title: {
    ...theme.typography.heading,
  },
  subtitle: {
    ...theme.typography.caption,
    marginTop: 3,
  },
  section: {
    marginTop: theme.spacing.lg,
  },
  sectionHeading: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: theme.spacing.sm,
    marginBottom: theme.spacing.sm,
  },
  sectionTitle: {
    ...theme.typography.subheading,
    marginBottom: theme.spacing.sm,
  },
  periodControl: {
    flexDirection: "row",
    padding: 3,
    borderRadius: theme.radii.md,
    backgroundColor: theme.colors.slate[100],
  },
  periodButton: {
    minWidth: 58,
    alignItems: "center",
    paddingHorizontal: theme.spacing.sm,
    paddingVertical: 7,
    borderRadius: theme.radii.sm,
  },
  periodButtonSelected: {
    backgroundColor: theme.card,
    ...theme.shadows.subtle,
  },
  periodText: {
    ...theme.typography.caption,
    fontWeight: "600",
  },
  periodTextSelected: {
    color: theme.colors.primary[600],
  },
  loadingContainer: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: theme.spacing.sm,
    backgroundColor: theme.background,
  },
  loadingText: {
    ...theme.typography.caption,
  },
  errorText: {
    ...theme.typography.body,
    color: theme.colors.danger[600],
    textAlign: "center",
  },
  retryButton: {
    paddingHorizontal: theme.spacing.lg,
    paddingVertical: theme.spacing.sm,
    borderRadius: theme.radii.sm,
    backgroundColor: theme.colors.primary[600],
  },
  retryButtonText: {
    ...theme.typography.body,
    color: theme.colors.white,
  },
  emptyState: {
    minHeight: 120,
    alignItems: "center",
    justifyContent: "center",
    gap: theme.spacing.sm,
    backgroundColor: theme.card,
    borderRadius: theme.radii.md,
    borderWidth: 1,
    borderColor: theme.border,
  },
  emptyText: {
    ...theme.typography.body,
    color: theme.textSecondary,
  },
  paymentSeparator: {
    height: theme.spacing.sm,
  },
});
