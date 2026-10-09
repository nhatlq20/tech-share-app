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
import { theme, STRINGS, CONFIG } from "../constants";
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

const weekDays: readonly string[] = STRINGS.AVAILABILITY.WEEKDAYS;

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

  const monthName = STRINGS.AVAILABILITY.MONTH_NAME(displayedMonth);

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
      Alert.alert(
        STRINGS.AVAILABILITY.ALERT_ERROR_TITLE,
        STRINGS.AVAILABILITY.ALERT_SELECT_RANGE,
      );
      return;
    }

    if (mode === "single") {
      if (selectedDates.length === 0) {
        Alert.alert(
          STRINGS.AVAILABILITY.ALERT_ERROR_TITLE,
          STRINGS.AVAILABILITY.ALERT_SELECT_SINGLE,
        );
        return;
      }

      blockedDates = [...selectedDates].sort().map((date) => ({
        startDate: date,
        endDate: date,
      }));
    }

    if (mode === "range") {
      if (!startDate || !endDate) {
        Alert.alert(
          STRINGS.AVAILABILITY.ALERT_ERROR_TITLE,
          STRINGS.AVAILABILITY.ALERT_SELECT_RANGE,
        );
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
      Alert.alert(
        STRINGS.AVAILABILITY.ALERT_SUCCESS_TITLE,
        STRINGS.AVAILABILITY.ALERT_SUCCESS_MSG,
      );
      onClose();
    } catch (error) {
      Alert.alert(
        STRINGS.AVAILABILITY.ALERT_ERROR_TITLE,
        STRINGS.AVAILABILITY.ALERT_ERROR_MSG,
      );
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
              <Text style={styles.title}>{STRINGS.AVAILABILITY.MODAL_TITLE}</Text>
              <Text style={styles.deviceName}>{deviceName}</Text>
            </View>
            <Pressable
              onPress={handleCancel}
              style={styles.closeButton}
              accessibilityLabel={STRINGS.COMMON.CLOSE}
            >
              <Ionicons
                name="close"
                size={24}
                color={theme.textSecondary}
              />
            </Pressable>
          </View>

          <ScrollView showsVerticalScrollIndicator={false}>
            <Text style={styles.description}>
              {STRINGS.AVAILABILITY.DESCRIPTION}
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
                  {STRINGS.AVAILABILITY.MODE_SINGLE}
                </Text>
                {mode === "single" && (
                  <Ionicons
                    name="checkmark"
                    size={16}
                    color={theme.white}
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
                  {STRINGS.AVAILABILITY.MODE_RANGE}
                </Text>
                {mode === "range" && (
                  <Ionicons
                    name="checkmark"
                    size={16}
                    color={theme.white}
                  />
                )}
              </Pressable>
            </View>

            <View style={styles.monthHeader}>
              <Pressable
                onPress={() => changeMonth(-1)}
                style={styles.monthButton}
                accessibilityLabel={STRINGS.AVAILABILITY.PREV_MONTH_ACCESSIBILITY}
              >
                <Ionicons
                  name="chevron-back"
                  size={22}
                  color={theme.primary}
                />
              </Pressable>
              <Text style={styles.monthTitle}>
                {monthName} {year}
              </Text>
              <Pressable
                onPress={() => changeMonth(1)}
                style={styles.monthButton}
                accessibilityLabel={STRINGS.AVAILABILITY.NEXT_MONTH_ACCESSIBILITY}
              >
                <Ionicons
                  name="chevron-forward"
                  size={22}
                  color={theme.primary}
                />
              </Pressable>
            </View>

            <View style={styles.calendar}>
              {weekDays.map((day: string) => (
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

            <Text style={styles.selectedTitle}>{STRINGS.AVAILABILITY.SELECTED_TITLE}</Text>

            {mode === "single" ? (
              // SINGLE MODE
              selectedDates.length === 0 ? (
                <Text style={styles.emptyText}>{STRINGS.AVAILABILITY.NO_DATES_SELECTED}</Text>
              ) : (
                <>
                  {selectedDates.sort().map((date: string) => (
                    <Text key={date} style={styles.selectedDateItem}>
                      {STRINGS.AVAILABILITY.BLOCKED_DATE_ITEM(date)}
                    </Text>
                  ))}

                  <Text style={styles.selectedTotal}>
                    {STRINGS.AVAILABILITY.TOTAL_DAYS(selectedDates.length)}
                  </Text>
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
              <Text style={styles.cancelText}>{STRINGS.COMMON.CANCEL}</Text>
            </Pressable>
            <Pressable onPress={handleSave} style={styles.saveButton}>
              <Text style={styles.saveText}>{STRINGS.AVAILABILITY.SAVE_CHANGES}</Text>
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
    backgroundColor: theme.backdrop,
  },
  modalContent: {
    maxHeight: "92%",
    padding: theme.spacing.lg + 4,
    backgroundColor: theme.background,
    borderTopLeftRadius: theme.radii.xl,
    borderTopRightRadius: theme.radii.xl,
  },
  header: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
  },
  title: {
    fontSize: theme.typography.sizes.h1 - 3,
    fontWeight: theme.typography.weights.bold,
    color: theme.textPrimary,
  },
  deviceName: {
    marginTop: theme.spacing.xs + 2,
    fontSize: theme.typography.sizes.subheading,
    color: theme.primary,
    fontWeight: theme.typography.weights.semibold,
  },
  closeButton: { padding: theme.spacing.xs },
  description: {
    marginTop: theme.spacing.lg,
    color: theme.textSecondary,
    fontSize: theme.typography.sizes.body,
    lineHeight: 21,
  },
  modeToggle: {
    flexDirection: "row",
    gap: theme.spacing.sm,
    marginTop: theme.spacing.md,
    padding: theme.spacing.xs,
    borderRadius: theme.radii.base,
    backgroundColor: theme.surface,
  },
  modeButton: {
    flex: 1,
    minHeight: 40,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    paddingHorizontal: theme.spacing.sm,
    borderRadius: theme.radii.md,
    backgroundColor: theme.background,
  },
  modeButtonActive: {
    backgroundColor: theme.primary,
  },
  modeButtonText: {
    color: theme.textPrimary,
    fontSize: theme.typography.sizes.body,
    fontWeight: theme.typography.weights.semibold,
  },
  modeButtonTextActive: {
    color: theme.white,
  },
  monthHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginTop: theme.spacing.lg + 4,
  },
  monthButton: { padding: theme.spacing.sm },
  monthTitle: {
    fontSize: theme.typography.sizes.h3,
    fontWeight: theme.typography.weights.bold,
    color: theme.textPrimary,
  },
  calendar: {
    flexDirection: "row",
    flexWrap: "wrap",
    marginTop: theme.spacing.sm,
  },
  weekDay: {
    width: "14.285%",
    paddingVertical: theme.spacing.sm,
    textAlign: "center",
    fontSize: theme.typography.sizes.bodySm,
    fontWeight: theme.typography.weights.semibold,
    color: theme.textSecondary,
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
    borderRadius: theme.radii.full,
  },
  blockedDate: {
    backgroundColor: theme.primary,
    borderRadius: theme.radii.md,
  },
  pastDate: { opacity: 0.35 },
  dateText: {
    color: theme.textPrimary,
    fontSize: theme.typography.sizes.body,
  },
  blockedDateText: {
    color: theme.white,
    fontWeight: theme.typography.weights.bold,
  },
  pastDateText: { color: theme.textSecondary },
  selectedTitle: {
    marginTop: theme.spacing.lg + 2,
    marginBottom: theme.spacing.sm,
    fontSize: theme.typography.sizes.body,
    fontWeight: theme.typography.weights.bold,
    color: theme.textPrimary,
  },
  selectedDate: {
    marginBottom: theme.spacing.xs,
    color: theme.textSecondary,
    fontSize: theme.typography.sizes.h2,
  },
  selectedDateItem: {
    fontSize: theme.typography.sizes.body,
    color: theme.textPrimary,
    marginBottom: theme.spacing.xs,
  },
  selectedTotal: {
    fontSize: theme.typography.sizes.body,
    fontWeight: theme.typography.weights.bold,
    color: theme.primaryDark,
    marginTop: theme.spacing.xs,
  },
  emptyText: {
    color: theme.textSecondary,
    fontSize: theme.typography.sizes.body,
  },
  actions: {
    flexDirection: "row",
    gap: theme.spacing.md,
    marginTop: theme.spacing.lg + 4,
  },
  cancelButton: {
    flex: 1,
    alignItems: "center",
    paddingVertical: theme.spacing.md + 1,
    borderRadius: theme.radii.md,
    borderWidth: 1,
    borderColor: theme.border,
    backgroundColor: theme.surface,
  },
  saveButton: {
    flex: 1,
    alignItems: "center",
    paddingVertical: theme.spacing.md + 1,
    borderRadius: theme.radii.md,
    backgroundColor: theme.primary,
  },
  cancelText: {
    color: theme.textPrimary,
    fontWeight: theme.typography.weights.semibold,
  },
  saveText: {
    color: theme.white,
    fontWeight: theme.typography.weights.bold,
  },
});
