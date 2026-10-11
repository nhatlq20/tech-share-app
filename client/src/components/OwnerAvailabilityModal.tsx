import React, { useState, useEffect, useMemo, useCallback } from "react";
import {
  ActivityIndicator,
  Alert,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { theme, STRINGS } from "../constants";
import { BlockedDate } from "../types";
import { bookingService } from "../services/bookingService";

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

interface BookedBookingItem {
  _id: string;
  startDate: string;
  endDate: string;
  status: string;
  bookingCode?: string;
}

const weekDays: readonly string[] = STRINGS.AVAILABILITY.WEEKDAYS;

const createDateKey = (year: number, month: number, day: number) => {
  const monthText = String(month + 1).padStart(2, "0");
  const dayText = String(day).padStart(2, "0");
  return `${year}-${monthText}-${dayText}`;
};

const createDateKeyFromDate = (date: Date) => {
  return createDateKey(date.getFullYear(), date.getMonth(), date.getDate());
};

const createTodayKey = () => {
  const today = new Date();
  return createDateKey(today.getFullYear(), today.getMonth(), today.getDate());
};

const formatDateDisplay = (dateStr: string) => {
  try {
    const [y, m, d] = dateStr.split("-");
    return `${d}/${m}/${y}`;
  } catch {
    return dateStr;
  }
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
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [bookedBookings, setBookedBookings] = useState([] as BookedBookingItem[]);

  const year = displayedMonth.getFullYear();
  const month = displayedMonth.getMonth();
  const firstDayOfMonth = new Date(year, month, 1).getDay();
  const numberOfDays = new Date(year, month + 1, 0).getDate();
  const monthName = STRINGS.AVAILABILITY.MONTH_NAME(displayedMonth);
  const todayKey = createTodayKey();

  // Tải lịch đã đặt và lịch bận của chủ máy khi mở modal
  const fetchSchedule = useCallback(async () => {
    if (!deviceId) return;
    setIsLoading(true);
    try {
      const schedule = await bookingService.getDeviceSchedule(deviceId);
      setBookedBookings(schedule.bookedBookings || []);

      // Trích xuất các ngày bận đã được chủ máy lưu trước đó
      const existingBlocked = schedule.blockedDates || [];
      const extractedDates: string[] = [];

      existingBlocked.forEach((b: any) => {
        const s = new Date(b.startDate);
        const e = new Date(b.endDate);
        const curr = new Date(s.getFullYear(), s.getMonth(), s.getDate());
        const endLimit = new Date(e.getFullYear(), e.getMonth(), e.getDate());

        while (curr <= endLimit) {
          extractedDates.push(createDateKeyFromDate(curr));
          curr.setDate(curr.getDate() + 1);
        }
      });

      const uniqueDates = Array.from(new Set(extractedDates)).sort();
      setSelectedDates(uniqueDates);

      if (existingBlocked.length === 1 && uniqueDates.length > 1) {
        setStartDate(uniqueDates[0]);
        setEndDate(uniqueDates[uniqueDates.length - 1]);
      } else {
        setStartDate(null);
        setEndDate(null);
      }
    } catch (error) {
      console.error("Lỗi khi tải lịch bận / đơn thuê của thiết bị:", error);
      Alert.alert(
        "Lỗi",
        "Không thể tải lịch của thiết bị. Vui lòng kiểm tra kết nối mạng và thử lại.",
      );
    } finally {
      setIsLoading(false);
    }
  }, [deviceId]);

  useEffect(() => {
    if (visible && deviceId) {
      fetchSchedule();
    }
  }, [visible, deviceId, fetchSchedule]);

  // Kiểm tra ngày có thuộc khoảng đơn thuê của khách hay không
  const getBookedItemForDate = useCallback(
    (dateKey: string) => {
      return bookedBookings.find((b: BookedBookingItem) => {
        const s = new Date(b.startDate);
        const e = new Date(b.endDate);
        const sKey = createDateKeyFromDate(s);
        const eKey = createDateKeyFromDate(e);
        return dateKey >= sKey && dateKey <= eKey;
      });
    },
    [bookedBookings],
  );

  const handleSelectDate = (date: string) => {
    // 1. Nếu ngày này đã có khách đặt thuê -> Không cho chặn lịch
    const bookedItem = getBookedItemForDate(date);
    if (bookedItem) {
      const sStr = formatDateDisplay(createDateKeyFromDate(new Date(bookedItem.startDate)));
      const eStr = formatDateDisplay(createDateKeyFromDate(new Date(bookedItem.endDate)));
      Alert.alert(
        "Ngày đã có khách đặt thuê",
        `Thiết bị này đã có đơn thuê từ ${sStr} đến ${eStr}${
          bookedItem.bookingCode ? ` (Mã: #${bookedItem.bookingCode})` : ""
        }.\nTrạng thái: ${
          bookedItem.status === "active" ? "Đang cho thuê" : "Đã duyệt thuê"
        }.\n\nBạn không thể chặn lịch bận vào ngày khách đã thuê.`,
      );
      return;
    }

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
      if (date < startDate) {
        setStartDate(date);
        setEndDate(null);
        return;
      }

      // Kiểm tra khoảng range [startDate, date] có đi qua ngày đã được đặt không
      const hasConflictWithBooked = bookedBookings.some((b: BookedBookingItem) => {
        const sKey = createDateKeyFromDate(new Date(b.startDate));
        const eKey = createDateKeyFromDate(new Date(b.endDate));
        return startDate <= eKey && date >= sKey;
      });

      if (hasConflictWithBooked) {
        Alert.alert(
          "Trùng lịch khách thuê",
          "Khoảng thời gian bạn chọn có ngày khách đã đặt trước. Vui lòng chọn khoảng ngày khác.",
        );
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
    }
  };

  const handleClearAllBlockedDates = () => {
    setSelectedDates([]);
    setStartDate(null);
    setEndDate(null);
  };

  const handleSave = async () => {
    let blockedDates: BlockedDate[] = [];

    if (mode === "single") {
      // Cho phép lưu cả danh sách rỗng nếu chủ máy muốn gỡ bỏ hết các ngày bận
      blockedDates = [...selectedDates].sort().map((date) => ({
        startDate: date,
        endDate: date,
        reason: "Chủ máy bận",
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

      const hasConflictWithBooked = bookedBookings.some((b: BookedBookingItem) => {
        const sKey = createDateKeyFromDate(new Date(b.startDate));
        const eKey = createDateKeyFromDate(new Date(b.endDate));
        return startDate <= eKey && endDate >= sKey;
      });

      if (hasConflictWithBooked) {
        Alert.alert(
          "Trùng lịch khách thuê",
          "Khoảng thời gian bạn chọn có ngày khách đã đặt trước. Vui lòng chọn khoảng thời gian khác.",
        );
        return;
      }

      blockedDates = [
        {
          startDate,
          endDate,
          reason: "Chủ máy bận",
        },
      ];
    }

    try {
      setIsSaving(true);
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
    } finally {
      setIsSaving(false);
    }
  };

  const changeMonth = (amount: number) => {
    setDisplayedMonth(new Date(year, month + amount, 1));
  };

  const handleCancel = () => {
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
          {/* Header */}
          <View style={styles.header}>
            <View style={{ flex: 1 }}>
              <Text style={styles.title}>{STRINGS.AVAILABILITY.MODAL_TITLE}</Text>
              <Text style={styles.deviceName} numberOfLines={1}>
                {deviceName}
              </Text>
            </View>
            <Pressable
              onPress={handleCancel}
              style={styles.closeButton}
              accessibilityLabel={STRINGS.COMMON.CLOSE}
            >
              <Ionicons name="close" size={24} color={theme.textSecondary} />
            </Pressable>
          </View>

          <ScrollView showsVerticalScrollIndicator={false}>
            <Text style={styles.description}>
              {STRINGS.AVAILABILITY.DESCRIPTION}
            </Text>

            {/* Chú thích màu sắc */}
            <View style={styles.legendContainer}>
              <View style={styles.legendItem}>
                <View style={[styles.legendDot, { backgroundColor: "#E5E7EB" }]} />
                <Text style={styles.legendText}>Sẵn sàng</Text>
              </View>
              <View style={styles.legendItem}>
                <View style={[styles.legendDot, { backgroundColor: theme.primary }]} />
                <Text style={styles.legendText}>Lịch bạn bận</Text>
              </View>
              <View style={styles.legendItem}>
                <View style={[styles.legendDot, { backgroundColor: "#3B82F6" }]} />
                <Text style={styles.legendText}>Khách đã thuê</Text>
              </View>
            </View>

            {/* Chuyển chế độ Chọn từng ngày / Chọn khoảng ngày */}
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
                  <Ionicons name="checkmark" size={16} color={theme.white} />
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
                  <Ionicons name="checkmark" size={16} color={theme.white} />
                )}
              </Pressable>
            </View>

            {/* Điều hướng tháng */}
            <View style={styles.monthHeader}>
              <Pressable
                onPress={() => changeMonth(-1)}
                style={styles.monthButton}
                accessibilityLabel={STRINGS.AVAILABILITY.PREV_MONTH_ACCESSIBILITY}
              >
                <Ionicons name="chevron-back" size={22} color={theme.primary} />
              </Pressable>
              <Text style={styles.monthTitle}>
                {monthName} {year}
              </Text>
              <Pressable
                onPress={() => changeMonth(1)}
                style={styles.monthButton}
                accessibilityLabel={STRINGS.AVAILABILITY.NEXT_MONTH_ACCESSIBILITY}
              >
                <Ionicons name="chevron-forward" size={22} color={theme.primary} />
              </Pressable>
            </View>

            {/* Loading indicator */}
            {isLoading ? (
              <View style={styles.loadingBox}>
                <ActivityIndicator size="small" color={theme.primary} />
                <Text style={styles.loadingText}>Đang tải lịch thiết bị...</Text>
              </View>
            ) : (
              /* Calendar grid */
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
                  const bookedItem = getBookedItemForDate(date);
                  const isBooked = !!bookedItem;

                  const isSingleSelected = selectedDates.includes(date);
                  const isStartDate = date === startDate;
                  const isEndDate = date === endDate;
                  const inRange =
                    startDate !== null &&
                    endDate !== null &&
                    date > startDate &&
                    date < endDate;
                  const isRangeSelected = isStartDate || isEndDate || inRange;
                  const isOwnerBlocked =
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
                          isBooked && styles.bookedDate,
                          !isBooked && isOwnerBlocked && styles.blockedDate,
                          !isBooked && (isStartDate || isEndDate) && styles.selectedDateCircle,
                          isPast && styles.pastDate,
                        ]}
                      >
                        <Text
                          style={[
                            styles.dateText,
                            isBooked && styles.bookedDateText,
                            !isBooked && isOwnerBlocked && styles.blockedDateText,
                            isPast && styles.pastDateText,
                          ]}
                        >
                          {day}
                        </Text>
                        {isBooked && (
                          <View style={styles.bookedBadgeIndicator} />
                        )}
                      </View>
                    </Pressable>
                  );
                })}
              </View>
            )}

            {/* Chi tiết ngày đang chặn */}
            <View style={styles.selectedSectionHeader}>
              <Text style={styles.selectedTitle}>
                {STRINGS.AVAILABILITY.SELECTED_TITLE}
              </Text>
              {selectedDates.length > 0 && mode === "single" && (
                <TouchableOpacity onPress={handleClearAllBlockedDates}>
                  <Text style={styles.clearAllText}>Xóa tất cả</Text>
                </TouchableOpacity>
              )}
            </View>

            {mode === "single" ? (
              selectedDates.length === 0 ? (
                <Text style={styles.emptyText}>
                  {STRINGS.AVAILABILITY.NO_DATES_SELECTED}
                </Text>
              ) : (
                <View style={styles.dateTagContainer}>
                  {selectedDates.sort().map((date: string) => (
                    <View key={date} style={styles.dateTag}>
                      <Ionicons name="calendar-outline" size={14} color={theme.primary} />
                      <Text style={styles.dateTagText}>
                        {formatDateDisplay(date)}
                      </Text>
                      <TouchableOpacity
                        onPress={() => handleSelectDate(date)}
                        hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                      >
                        <Ionicons name="close-circle" size={16} color={theme.textSecondary} />
                      </TouchableOpacity>
                    </View>
                  ))}
                  <Text style={styles.selectedTotal}>
                    {STRINGS.AVAILABILITY.TOTAL_DAYS(selectedDates.length)}
                  </Text>
                </View>
              )
            ) : !startDate ? (
              <Text style={styles.emptyText}>Chưa chọn khoảng ngày nào.</Text>
            ) : (
              <View style={styles.rangeSummaryBox}>
                <View style={styles.rangeRow}>
                  <Text style={styles.rangeLabel}>Ngày bắt đầu:</Text>
                  <Text style={styles.rangeValue}>{formatDateDisplay(startDate)}</Text>
                </View>
                <View style={styles.rangeRow}>
                  <Text style={styles.rangeLabel}>Ngày kết thúc:</Text>
                  <Text style={styles.rangeValue}>
                    {endDate ? formatDateDisplay(endDate) : "Vui lòng chọn ngày kết thúc"}
                  </Text>
                </View>
              </View>
            )}

            {/* Danh sách các đơn khách đã đặt thuê (nếu có) */}
            {bookedBookings.length > 0 && (
              <View style={styles.bookedListSection}>
                <View style={styles.bookedHeaderRow}>
                  <Ionicons name="receipt-outline" size={16} color="#3B82F6" />
                  <Text style={styles.bookedListTitle}>Lịch khách đã đặt thuê máy</Text>
                </View>
                {bookedBookings.map((b: BookedBookingItem) => {
                  const sStr = formatDateDisplay(createDateKeyFromDate(new Date(b.startDate)));
                  const eStr = formatDateDisplay(createDateKeyFromDate(new Date(b.endDate)));
                  return (
                    <View key={b._id} style={styles.bookedCard}>
                      <View style={{ flex: 1 }}>
                        <Text style={styles.bookedCode}>
                          Đơn: #{b.bookingCode || b._id.slice(-6)}
                        </Text>
                        <Text style={styles.bookedDateTextSmall}>
                          {sStr} ➔ {eStr}
                        </Text>
                      </View>
                      <View
                        style={[
                          styles.bookedStatusPill,
                          {
                            backgroundColor:
                              b.status === "active" ? "#DBEAFE" : "#FEF3C7",
                          },
                        ]}
                      >
                        <Text
                          style={[
                            styles.bookedStatusText,
                            {
                              color:
                                b.status === "active" ? "#1D4ED8" : "#B45309",
                            },
                          ]}
                        >
                          {b.status === "active" ? "Đang thuê" : "Đã duyệt"}
                        </Text>
                      </View>
                    </View>
                  );
                })}
              </View>
            )}
          </ScrollView>

          {/* Action buttons */}
          <View style={styles.actions}>
            <Pressable onPress={handleCancel} style={styles.cancelButton}>
              <Text style={styles.cancelText}>{STRINGS.COMMON.CANCEL}</Text>
            </Pressable>
            <TouchableOpacity
              onPress={handleSave}
              style={[styles.saveButton, isSaving && { opacity: 0.7 }]}
              disabled={isSaving}
            >
              {isSaving ? (
                <ActivityIndicator size="small" color={theme.white} />
              ) : (
                <Text style={styles.saveText}>{STRINGS.AVAILABILITY.SAVE_CHANGES}</Text>
              )}
            </TouchableOpacity>
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
    padding: theme.spacing.lg,
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
    fontSize: theme.typography.sizes.h2,
    fontWeight: theme.typography.weights.bold,
    color: theme.textPrimary,
  },
  deviceName: {
    marginTop: theme.spacing.xs,
    fontSize: theme.typography.sizes.subheading,
    color: theme.primary,
    fontWeight: theme.typography.weights.semibold,
  },
  closeButton: { padding: theme.spacing.xs },
  description: {
    marginTop: theme.spacing.sm,
    color: theme.textSecondary,
    fontSize: theme.typography.sizes.bodySm,
    lineHeight: 18,
  },
  legendContainer: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-around",
    backgroundColor: theme.surface,
    paddingVertical: theme.spacing.sm,
    paddingHorizontal: theme.spacing.md,
    borderRadius: theme.radii.md,
    marginTop: theme.spacing.md,
  },
  legendItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  legendDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
  },
  legendText: {
    fontSize: theme.typography.sizes.caption,
    color: theme.textSecondary,
    fontWeight: theme.typography.weights.medium,
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
    minHeight: 38,
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
    fontSize: theme.typography.sizes.bodySm,
    fontWeight: theme.typography.weights.semibold,
  },
  modeButtonTextActive: {
    color: theme.white,
  },
  monthHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginTop: theme.spacing.md,
  },
  monthButton: { padding: theme.spacing.sm },
  monthTitle: {
    fontSize: theme.typography.sizes.subheading,
    fontWeight: theme.typography.weights.bold,
    color: theme.textPrimary,
  },
  loadingBox: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: theme.spacing.xl,
    gap: 8,
  },
  loadingText: {
    fontSize: theme.typography.sizes.bodySm,
    color: theme.textSecondary,
  },
  calendar: {
    flexDirection: "row",
    flexWrap: "wrap",
    marginTop: theme.spacing.xs,
  },
  weekDay: {
    width: "14.285%",
    paddingVertical: theme.spacing.xs,
    textAlign: "center",
    fontSize: theme.typography.sizes.caption,
    fontWeight: theme.typography.weights.semibold,
    color: theme.textSecondary,
  },
  dateCell: {
    width: "14.285%",
    height: 42,
    alignItems: "center",
    justifyContent: "center",
  },
  dateCircle: {
    width: 34,
    height: 34,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: theme.radii.full,
    position: "relative",
  },
  blockedDate: {
    backgroundColor: theme.primary,
  },
  selectedDateCircle: {
    backgroundColor: theme.primaryDark,
  },
  bookedDate: {
    backgroundColor: "#DBEAFE",
    borderWidth: 1.5,
    borderColor: "#3B82F6",
  },
  bookedBadgeIndicator: {
    position: "absolute",
    bottom: 2,
    width: 4,
    height: 4,
    borderRadius: 2,
    backgroundColor: "#3B82F6",
  },
  pastDate: { opacity: 0.35 },
  dateText: {
    color: theme.textPrimary,
    fontSize: theme.typography.sizes.bodySm,
    fontWeight: theme.typography.weights.medium,
  },
  blockedDateText: {
    color: theme.white,
    fontWeight: theme.typography.weights.bold,
  },
  bookedDateText: {
    color: "#1E40AF",
    fontWeight: theme.typography.weights.bold,
  },
  pastDateText: { color: theme.textSecondary },
  selectedSectionHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginTop: theme.spacing.md,
    marginBottom: theme.spacing.xs,
  },
  selectedTitle: {
    fontSize: theme.typography.sizes.bodySm,
    fontWeight: theme.typography.weights.bold,
    color: theme.textPrimary,
  },
  clearAllText: {
    fontSize: theme.typography.sizes.caption,
    color: theme.danger,
    fontWeight: theme.typography.weights.semibold,
  },
  emptyText: {
    color: theme.textSecondary,
    fontSize: theme.typography.sizes.caption,
    fontStyle: "italic",
    marginVertical: 4,
  },
  dateTagContainer: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 6,
    marginTop: 4,
  },
  dateTag: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: theme.surface,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: theme.radii.sm,
    borderWidth: 1,
    borderColor: theme.border,
  },
  dateTagText: {
    fontSize: theme.typography.sizes.caption,
    color: theme.textPrimary,
    fontWeight: theme.typography.weights.medium,
  },
  selectedTotal: {
    width: "100%",
    fontSize: theme.typography.sizes.caption,
    fontWeight: theme.typography.weights.bold,
    color: theme.primary,
    marginTop: 4,
  },
  rangeSummaryBox: {
    backgroundColor: theme.surface,
    padding: theme.spacing.sm,
    borderRadius: theme.radii.md,
    marginTop: 4,
    gap: 4,
  },
  rangeRow: {
    flexDirection: "row",
    justifyContent: "space-between",
  },
  rangeLabel: {
    fontSize: theme.typography.sizes.caption,
    color: theme.textSecondary,
  },
  rangeValue: {
    fontSize: theme.typography.sizes.caption,
    fontWeight: theme.typography.weights.semibold,
    color: theme.textPrimary,
  },
  bookedListSection: {
    marginTop: theme.spacing.md,
    paddingTop: theme.spacing.sm,
    borderTopWidth: 1,
    borderTopColor: theme.border,
  },
  bookedHeaderRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginBottom: 6,
  },
  bookedListTitle: {
    fontSize: theme.typography.sizes.caption,
    fontWeight: theme.typography.weights.bold,
    color: "#2563EB",
  },
  bookedCard: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: "#F0F7FF",
    padding: 8,
    borderRadius: theme.radii.md,
    borderWidth: 1,
    borderColor: "#BFDBFE",
    marginBottom: 6,
  },
  bookedCode: {
    fontSize: theme.typography.sizes.caption,
    fontWeight: theme.typography.weights.bold,
    color: "#1E3A8A",
  },
  bookedDateTextSmall: {
    fontSize: 11,
    color: "#3B82F6",
    marginTop: 2,
  },
  bookedStatusPill: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: theme.radii.full,
  },
  bookedStatusText: {
    fontSize: 11,
    fontWeight: theme.typography.weights.bold,
  },
  actions: {
    flexDirection: "row",
    gap: theme.spacing.md,
    marginTop: theme.spacing.md,
  },
  cancelButton: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: theme.spacing.md,
    borderRadius: theme.radii.md,
    borderWidth: 1,
    borderColor: theme.border,
    backgroundColor: theme.surface,
  },
  saveButton: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: theme.spacing.md,
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
