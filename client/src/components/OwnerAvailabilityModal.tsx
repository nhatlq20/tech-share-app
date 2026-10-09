import React, { useState } from "react";
import {
  Alert,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { colors } from "../theme/colors";
import { BlockedDate } from "../types";

interface OwnerAvailabilityModalProps {
  visible: boolean;
  deviceName: string;
  onClose: () => void;
  deviceId: string;
  onUpdateBlockedDates: (
    deviceId: string,
    blockedDates: BlockedDate[],
  ) => Promise<void>;
}

type AvailabilityMode = "single" | "range";

const weekDays = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

const createDateKey = (year: number, month: number, day: number) => {
  const monthText = String(month + 1).padStart(2, "0");
  const dayText = String(day).padStart(2, "0");
  return `${year}-${monthText}-${dayText}`;
};

const createTodayKey = () => {
  const today = new Date();
  return createDateKey(today.getFullYear(), today.getMonth(), today.getDate());
};

export function OwnerAvailabilityModal({
  visible,
  deviceName,
  onClose,
  deviceId,
  onUpdateBlockedDates,
}: OwnerAvailabilityModalProps) {
  const [startDate, setStartDate] = useState(null as string | null);
  const [endDate, setEndDate] = useState(null as string | null);
  const today = new Date();
  const [displayedMonth, setDisplayedMonth] = useState(
    new Date(today.getFullYear(), today.getMonth(), 1),
  );
  const [selectedDates, setSelectedDates] = useState([] as string[]);
  const [mode, setMode] = useState("single" as AvailabilityMode);
  const year = displayedMonth.getFullYear();
  const month = displayedMonth.getMonth();
  const firstDayOfMonth = new Date(year, month, 1).getDay();

  const numberOfDays = new Date(year, month + 1, 0).getDate();

  const monthName = displayedMonth.toLocaleString("en-US", { month: "long" });

  const todayKey = createTodayKey();
  //chọn ngày bắt đầu và ngày kết thúc
  const handleSelectDate = (date: string) => {
    if (mode === "range") {
      if (!startDate) {
        setStartDate(date);
        setEndDate(null);
        return;
      }

      if (startDate && endDate) {
        setStartDate(date);
        setEndDate(null);
        return;
      }

      // Không cho endDate nhỏ hơn startDate
      if (new Date(date) < new Date(startDate)) {
        setStartDate(date);
        setEndDate(null);
        return;
      }

      // Chọn endDate
      setEndDate(date);
    }

    if (mode === "single") {
      setSelectedDates((prev: string[]) => {
        // Nếu ngày đã được chọn -> bấm lại để bỏ
        if (prev.includes(date)) {
          return prev.filter((item) => item !== date);
        }

        // Chưa có -> thêm ngày
        return [...prev, date];
      });

      return;
    }
  };

  const handleSave = async () => {
    let blockedDates: BlockedDate[] = [];
    if (!startDate || !endDate) {
      Alert.alert("Error", "Please select start date and end date");
      return;
    }

    if (mode === "single") {
      if (selectedDates.length === 0) {
        Alert.alert("Error", "Please select at least one date");
        return;
      }

      blockedDates = [...selectedDates].sort().map((date) => ({
        startDate: date,
        endDate: date,
      }));
    }

    if (mode === "range") {
      if (!startDate || !endDate) {
        Alert.alert("Error", "Please select start date and end date");
        return;
      }

      blockedDates = [
        {
          startDate,
          endDate,
        },
      ];
    }

    try {
      await onUpdateBlockedDates(deviceId, blockedDates);
      Alert.alert("THành công", "Update blocked dates true");
      onClose();
    } catch (error) {
      Alert.alert("Error", "Update blocked dates failed");
    }
  };

  const changeMonth = (amount: number) => {
    setDisplayedMonth(new Date(year, month + amount, 1));
  };

  const handleCancel = () => {
    setStartDate("");
    setEndDate("");
    onClose();
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={handleCancel}
    >
      <View style={styles.overlay}>
        <View style={styles.modalContent}>
          <View style={styles.header}>
            <View>
              <Text style={styles.title}>Manage Availability</Text>
              <Text style={styles.deviceName}>{deviceName}</Text>
            </View>
            <Pressable
              onPress={handleCancel}
              style={styles.closeButton}
              accessibilityLabel="Close"
            >
              <Ionicons
                name="close"
                size={24}
                color={colors.light.textSecondary}
              />
            </Pressable>
          </View>

          <ScrollView showsVerticalScrollIndicator={false}>
            <Text style={styles.description}>
              Block dates when you need to use this device.
            </Text>

            <View style={styles.modeToggle}>
              <Pressable
                onPress={() => setMode("single")}
                style={[
                  styles.modeButton,
                  mode === "single" && styles.modeButtonActive,
                ]}
                accessibilityRole="button"
                accessibilityState={{ selected: mode === "single" }}
              >
                <Text
                  style={[
                    styles.modeButtonText,
                    mode === "single" && styles.modeButtonTextActive,
                  ]}
                >
                  Single dates
                </Text>
                {mode === "single" && (
                  <Ionicons
                    name="checkmark"
                    size={16}
                    color={colors.light.background}
                  />
                )}
              </Pressable>
              <Pressable
                onPress={() => setMode("range")}
                style={[
                  styles.modeButton,
                  mode === "range" && styles.modeButtonActive,
                ]}
                accessibilityRole="button"
                accessibilityState={{ selected: mode === "range" }}
              >
                <Text
                  style={[
                    styles.modeButtonText,
                    mode === "range" && styles.modeButtonTextActive,
                  ]}
                >
                  Date range
                </Text>
                {mode === "range" && (
                  <Ionicons
                    name="checkmark"
                    size={16}
                    color={colors.light.background}
                  />
                )}
              </Pressable>
            </View>

            <View style={styles.monthHeader}>
              <Pressable
                onPress={() => changeMonth(-1)}
                style={styles.monthButton}
                accessibilityLabel="Previous month"
              >
                <Ionicons
                  name="chevron-back"
                  size={22}
                  color={colors.light.primary}
                />
              </Pressable>
              <Text style={styles.monthTitle}>
                {monthName} {year}
              </Text>
              <Pressable
                onPress={() => changeMonth(1)}
                style={styles.monthButton}
                accessibilityLabel="Next month"
              >
                <Ionicons
                  name="chevron-forward"
                  size={22}
                  color={colors.light.primary}
                />
              </Pressable>
            </View>

            <View style={styles.calendar}>
              {weekDays.map((day) => (
                <Text key={day} style={styles.weekDay}>
                  {day}
                </Text>
              ))}
              {Array.from({ length: firstDayOfMonth }).map((_, index) => (
                <View key={`empty-${index}`} style={styles.dateCell} />
              ))}
              {Array.from({ length: numberOfDays }).map((_, index) => {
                const day = index + 1;
                const date = createDateKey(year, month, day);

                const isPast = date < todayKey;
                const isSingleSelected = selectedDates.includes(date);

                const isStartDate = date === startDate;
                const isEndDate = date === endDate;
                const inRange =
                  startDate !== "" &&
                  endDate !== "" &&
                  date > startDate &&
                  date < endDate;
                const isRangeSelected = isStartDate || isEndDate || inRange;
                const isSelected =
                  mode === "single" ? isSingleSelected : isRangeSelected;
                return (
                  <Pressable
                    key={date}
                    disabled={isPast}
                    onPress={() => handleSelectDate(date)}
                    style={styles.dateCell}
                    accessibilityLabel={`${monthName} ${day}, ${year}`}
                  >
                    <View
                      style={[
                        styles.dateCircle,

                        isSelected && styles.blockedDate,

                        (isStartDate || isEndDate) && styles.selectedDate,

                        mode === "range" &&
                        (isStartDate || isEndDate) &&
                        styles.selectedDate,
                        isPast && styles.pastDate,
                      ]}
                    >
                      <Text
                        style={[
                          styles.dateText,

                          isSelected && styles.blockedDateText,

                          isSelected && styles.selectedDateText,

                          isPast && styles.pastDateText,
                        ]}
                      >
                        {day}
                      </Text>
                    </View>
                  </Pressable>
                );
              })}
            </View>

            <Text style={styles.selectedTitle}>Selected blocked dates</Text>

            {mode === "single" ? (
              // SINGLE MODE
              selectedDates.length === 0 ? (
                <Text style={styles.emptyText}>No blocked dates selected.</Text>
              ) : (
                <>
                  {selectedDates.sort().map((date: string) => (
                    <Text key={date}>Blocked Date: {date}</Text>
                  ))}

                  <Text>Total: {selectedDates.length} days</Text>
                </>
              )
            ) : // RANGE MODE
              !startDate ? (
                <Text style={styles.emptyText}>No blocked dates selected.</Text>
              ) : (
                <>
                  <Text>Start Date: {startDate}</Text>

                  <Text>End Date: {endDate || "Please select"}</Text>
                </>
              )}
          </ScrollView>

          <View style={styles.actions}>
            <Pressable onPress={handleCancel} style={styles.cancelButton}>
              <Text style={styles.cancelText}>Cancel</Text>
            </Pressable>
            <Pressable onPress={handleSave} style={styles.saveButton}>
              <Text style={styles.saveText}>Save Changes</Text>
            </Pressable>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: "flex-end",
    backgroundColor: "rgba(15, 23, 42, 0.45)",
  },
  modalContent: {
    maxHeight: "92%",
    padding: 20,
    backgroundColor: colors.light.background,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
  },
  header: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
  },
  title: { fontSize: 21, fontWeight: "700", color: colors.light.textPrimary },
  deviceName: {
    marginTop: 6,
    fontSize: 15,
    color: colors.light.primary,
    fontWeight: "600",
  },
  closeButton: { padding: 4 },
  description: {
    marginTop: 18,
    color: colors.light.textSecondary,
    fontSize: 14,
    lineHeight: 21,
  },
  modeToggle: {
    flexDirection: "row",
    gap: 8,
    marginTop: 12,
    padding: 4,
    borderRadius: 12,
    backgroundColor: colors.light.surface,
  },
  modeButton: {
    flex: 1,
    minHeight: 40,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    paddingHorizontal: 8,
    borderRadius: 9,
    backgroundColor: colors.light.background,
  },
  modeButtonActive: {
    backgroundColor: colors.light.primary,
  },
  modeButtonText: {
    color: colors.light.textPrimary,
    fontSize: 13,
    fontWeight: "600",
  },
  modeButtonTextActive: {
    color: colors.light.background,
  },
  monthHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginTop: 20,
  },
  monthButton: { padding: 8 },
  monthTitle: {
    fontSize: 17,
    fontWeight: "700",
    color: colors.light.textPrimary,
  },
  calendar: { flexDirection: "row", flexWrap: "wrap", marginTop: 8 },
  weekDay: {
    width: "14.285%",
    paddingVertical: 8,
    textAlign: "center",
    fontSize: 12,
    fontWeight: "600",
    color: colors.light.textSecondary,
  },
  dateCell: {
    width: "14.285%",
    height: 44,
    alignItems: "center",
    justifyContent: "center",
  },
  dateCircle: {
    width: 36,
    height: 36,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 18,
  },
  blockedDate: { backgroundColor: colors.light.primary, borderRadius: 10 },
  pastDate: { opacity: 0.35 },
  dateText: { color: colors.light.textPrimary, fontSize: 14 },
  blockedDateText: { color: colors.light.background, fontWeight: "700" },
  pastDateText: { color: colors.light.textSecondary },
  selectedTitle: {
    marginTop: 18,
    marginBottom: 8,
    fontSize: 14,
    fontWeight: "700",
    color: colors.light.textPrimary,
  },
  selectedDate: {
    marginBottom: 4,
    color: colors.light.textSecondary,
    fontSize: 19,
  },
  emptyText: { color: colors.light.textSecondary, fontSize: 14 },
  actions: { flexDirection: "row", gap: 12, marginTop: 20 },
  cancelButton: {
    flex: 1,
    alignItems: "center",
    paddingVertical: 13,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: colors.light.border,
  },
  saveButton: {
    flex: 1,
    alignItems: "center",
    paddingVertical: 13,
    borderRadius: 10,
    backgroundColor: colors.light.primary,
  },
  cancelText: { color: colors.light.textPrimary, fontWeight: "600" },
  saveText: { color: colors.light.background, fontWeight: "700" },
});
