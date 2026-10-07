import React, { useState, useEffect, useMemo } from 'react';
import {
  StyleSheet,
  View,
  Text,
  TouchableOpacity,
  ActivityIndicator,
  StatusBar,
  ScrollView,
  Alert,
  Modal,
  TextInput,
  FlatList,
  Platform,
  Image,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { Calendar } from 'react-native-calendars';
import { deviceService } from '../../services/deviceService';
import { bookingService } from '../../services/bookingService';
import { apiClient } from '../../config/api';
import { Device } from '../../types';
import { colors } from '../../theme/colors';
import { useAppSelector } from '../../store';
import { VoucherInput } from './components/VoucherInput';
import { PriceBreakdownCard } from './components/PriceBreakdownCard';

interface BookingCreateScreenProps {
  deviceId: string;
  onBack: () => void;
  onSuccess?: () => void;
  onNavigateToVerification?: () => void;
}

const formatPrice = (price: number): string => {
  return price.toLocaleString('vi-VN') + ' đ';
};

const formatDateTime = (d: Date) => {
  const pad = (n: number) => n.toString().padStart(2, '0');
  return `${pad(d.getDate())}/${pad(d.getMonth() + 1)}/${d.getFullYear()} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
};

const formatDateOnly = (d: Date) => {
  const pad = (n: number) => n.toString().padStart(2, '0');
  return `${pad(d.getDate())}/${pad(d.getMonth() + 1)}/${d.getFullYear()}`;
};

const formatTimeOnly = (d: Date) => {
  const pad = (n: number) => n.toString().padStart(2, '0');
  return `${pad(d.getHours())}:${pad(d.getMinutes())}`;
};

const getDayOfWeekName = (d: Date) => {
  const days = ['Chủ Nhật', 'Thứ Hai', 'Thứ Ba', 'Thứ Tư', 'Thứ Năm', 'Thứ Sáu', 'Thứ Bảy'];
  return days[d.getDay()];
};

export function BookingCreateScreen({
  deviceId,
  onBack,
  onSuccess,
  onNavigateToVerification,
}: BookingCreateScreenProps) {
  const currentUser = useAppSelector(state => state.auth.user);
  const insets = useSafeAreaInsets();
  const topInset = Math.max(
    insets.top,
    Platform.OS === 'android' ? StatusBar.currentHeight || 24 : 20
  );
  const [device, setDevice] = useState(null as Device | null);
  const [loading, setLoading] = useState(true);

  const [startDate, setStartDate] = useState(null as Date | null);
  const [endDate, setEndDate] = useState(null as Date | null);
  const [busyRanges, setBusyRanges] = useState(
    [] as { _id: string; startDate: string; endDate: string; status: string; bookingCode?: string }[]
  );

  const [deliveryMethod, setDeliveryMethod] = useState('pickup' as 'pickup' | 'delivery');
  const [deliveryAddress, setDeliveryAddress] = useState(currentUser?.address || '');

  const [pickerConfig, setPickerConfig] = useState({ visible: false, type: 'start' as 'start' | 'end' });
  const [appliedVoucher, setAppliedVoucher] = useState(null as any);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (currentUser?.address && !deliveryAddress) {
      setDeliveryAddress(currentUser.address);
    }
  }, [currentUser]);

  useEffect(() => {
    let isMounted = true;
    (async () => {
      setLoading(true);
      try {
        const [deviceData, ranges] = await Promise.all([
          deviceService.getDeviceById(deviceId),
          bookingService.getDeviceBusyDates(deviceId).catch(() => []),
        ]);
        if (isMounted) {
          setDevice(deviceData);
          setBusyRanges(ranges);
          setLoading(false);
        }
      } catch (err) {
        if (isMounted) setLoading(false);
      }
    })();
    return () => {
      isMounted = false;
    };
  }, [deviceId]);

  const checkOverlapWithBusy = (start: Date, end: Date) => {
    for (const b of busyRanges) {
      const bStart = new Date(b.startDate);
      const bEnd = new Date(b.endDate);
      // Hai khoảng thời gian [start, end] và [bStart, bEnd] trùng nhau khi start < bEnd và end > bStart
      if (start < bEnd && end > bStart) {
        return b;
      }
    }
    return null;
  };

  const isDateInBusyRange = (d: Date) => {
    const dTime = d.getTime();
    const dYMD = getLocalYMD(d);

    for (const b of busyRanges) {
      const bStart = new Date(b.startDate);
      const bEnd = new Date(b.endDate);
      const startYMD = getLocalYMD(bStart);
      const endYMD = getLocalYMD(bEnd);

      if (dTime >= bStart.getTime() && dTime <= bEnd.getTime()) {
        return b;
      }
      if (dYMD >= startYMD && dYMD <= endYMD) {
        return b;
      }
    }
    return null;
  };


  const currentActiveBooking = useMemo(() => {
    const now = new Date();
    return busyRanges.find((b: { startDate: string; endDate: string; status: string }) => {
      const bStart = new Date(b.startDate);
      const bEnd = new Date(b.endDate);
      return b.status === 'active' && now >= bStart && now <= bEnd;
    });
  }, [busyRanges]);

  const openPicker = (type: 'start' | 'end') => {
    setPickerConfig({ visible: true, type });
  };

  const handleConfirmPicker = (date: Date) => {
    // Cho phép dung sai 2 phút để tránh lỗi giây trôi qua khi người dùng đang chọn giờ
    const now = new Date(Date.now() - 2 * 60 * 1000);

    if (pickerConfig.type === 'start') {
      if (date < now) {
        Alert.alert('Lỗi thời gian', 'Thời gian nhận máy không hợp lệ.');
        return;
      }

      // 1. Kiểm tra thời điểm nhận máy có nằm trong khoảng đang có người thuê không
      const conflict = isDateInBusyRange(date);
      if (conflict) {
        const fromStr = new Date(conflict.startDate).toLocaleDateString('vi-VN');
        const toStr = new Date(conflict.endDate).toLocaleDateString('vi-VN');
        Alert.alert(
          'Đã có người thuê',
          `Thiết bị đang có người thuê (${fromStr} - ${toStr}). Vui lòng chọn thời gian nhận sau ngày ${toStr} hoặc thời gian khác!`
        );
        return;
      }

      // 2. Nếu đã có endDate, kiểm tra khoảng [date, endDate] có bị bao trùm hoặc trùng đơn bận nào không
      if (endDate) {
        const rangeConflict = checkOverlapWithBusy(date, endDate);
        if (rangeConflict) {
          const fromStr = new Date(rangeConflict.startDate).toLocaleDateString('vi-VN');
          const toStr = new Date(rangeConflict.endDate).toLocaleDateString('vi-VN');
          Alert.alert(
            'Trùng lịch thuê',
            `Khoảng thời gian bạn chọn trùng với đơn thuê của người khác (${fromStr} - ${toStr}). Hệ thống sẽ đặt lại ngày trả.`
          );
          setEndDate(null);
        }
      }

      setStartDate(date);
      if (endDate && endDate < date) {
        setEndDate(null);
      }
    } else {
      if (startDate && date <= startDate) {
        Alert.alert('Lỗi thời gian', 'Thời gian trả không hợp lệ.');
        return;
      }

      // Kiểm tra khoảng [startDate, date] có bị trùng với đơn đang active không
      if (startDate) {
        const rangeConflict = checkOverlapWithBusy(startDate, date);
        if (rangeConflict) {
          const fromStr = new Date(rangeConflict.startDate).toLocaleDateString('vi-VN');
          const toStr = new Date(rangeConflict.endDate).toLocaleDateString('vi-VN');
          Alert.alert(
            'Trùng lịch thuê',
            `Thiết bị đang có người thuê trong khoảng (${fromStr} - ${toStr}). Vui lòng chọn thời gian trả trước ngày ${fromStr} hoặc chọn khoảng thời gian khác!`
          );
          return;
        }
      }

      setEndDate(date);
    }
    setPickerConfig({ ...pickerConfig, visible: false });
  };

  const calculateDays = () => {
    if (!startDate || !endDate) return 0;
    const diffTime = Math.abs(endDate.getTime() - startDate.getTime());
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays === 0 ? 1 : diffDays; // minimum 1 day
  };


  if (loading) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color={colors.light.primary} />
        <Text style={styles.loadingText}>Đang tải thông tin thiết bị...</Text>
      </View>
    );
  }

  if (!device) {
    return (
      <View style={styles.centerContainer}>
        <Ionicons name="alert-circle-outline" size={48} color={colors.light.error} />
        <Text style={styles.errorTitle}>Không tìm thấy thông tin thiết bị</Text>
        <TouchableOpacity style={styles.backBtn} onPress={onBack}>
          <Text style={styles.backBtnText}>Quay lại</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const rentalDays = calculateDays();
  const baseRentalFee = rentalDays * device.dailyRate;

  let longTermDiscountPercent = 0;
  if (rentalDays >= 7) longTermDiscountPercent = 20;
  else if (rentalDays >= 3) longTermDiscountPercent = 10;

  const longTermDiscountAmount = (baseRentalFee * longTermDiscountPercent) / 100;
  const rentalFeeAfterLongTerm = baseRentalFee - longTermDiscountAmount;

  let voucherDiscountAmount = 0;
  if (appliedVoucher) {
    if (appliedVoucher.type === 'percent') {
      voucherDiscountAmount = (rentalFeeAfterLongTerm * appliedVoucher.value) / 100;
      if (appliedVoucher.maxDiscount && voucherDiscountAmount > appliedVoucher.maxDiscount) {
        voucherDiscountAmount = appliedVoucher.maxDiscount;
      }
    } else {
      voucherDiscountAmount = appliedVoucher.value;
    }
    if (voucherDiscountAmount > rentalFeeAfterLongTerm) {
      voucherDiscountAmount = rentalFeeAfterLongTerm;
    }
  }

  const totalAmount = rentalFeeAfterLongTerm - voucherDiscountAmount + (device.depositValue || 0);

  const handleConfirm = async () => {
    if (currentUser?.role === 'renter' && !currentUser.isVerified) {
      Alert.alert(
        'Cần xác thực danh tính',
        'Bạn cần hoàn tất Xác thực người dùng thực trước khi thuê thiết bị.',
        [
          { text: 'Để sau', style: 'cancel' },
          { text: 'Xác thực ngay', onPress: onNavigateToVerification },
        ]
      );
      return;
    }

    if (!startDate || !endDate) {
      Alert.alert('Thiếu thông tin', 'Vui lòng chọn thời gian nhận và trả máy.');
      return;
    }

    if (deliveryMethod === 'delivery' && !deliveryAddress.trim()) {
      Alert.alert('Thiếu thông tin', 'Vui lòng nhập địa chỉ nhận hàng để chủ máy giao thiết bị.');
      return;
    }

    // Kiểm tra chặn đặt trùng với đơn đang active trên hệ thống
    const conflict = checkOverlapWithBusy(startDate, endDate);
    if (conflict) {
      const fromStr = new Date(conflict.startDate).toLocaleDateString('vi-VN');
      const toStr = new Date(conflict.endDate).toLocaleDateString('vi-VN');
      Alert.alert(
        'Đã có người thuê',
        `Thiết bị đang có người thuê trong khoảng thời gian (${fromStr} - ${toStr}). Vui lòng chọn khoảng thời gian khác!`
      );
      return;
    }

    setIsSubmitting(true);
    try {
      await apiClient.post('/bookings', {

        deviceId,
        startDate: startDate.toISOString(),
        endDate: endDate.toISOString(),
        voucherCode: appliedVoucher?.code || '',
        deliveryMethod,
        deliveryAddress: deliveryMethod === 'delivery' ? deliveryAddress.trim() : (device.addressText || ''),
      });

      Alert.alert(
        'Thành công',
        'Yêu cầu thuê máy đã được gửi đi!',
        [
          {
            text: 'OK',
            onPress: () => {
              if (onSuccess) {
                onSuccess();
              } else {
                onBack();
              }
            },
          },
        ],
        { cancelable: false }
      );
    } catch (error: any) {
      const responseData = error.response?.data;
      if (responseData?.code === 'RENTER_EKYC_REQUIRED') {
        Alert.alert(
          'Cần xác thực danh tính',
          responseData.message || 'Bạn cần hoàn tất Xác thực người dùng thực trước khi thuê thiết bị.',
          [
            { text: 'Để sau', style: 'cancel' },
            { text: 'Xác thực ngay', onPress: onNavigateToVerification },
          ]
        );
      } else {
        Alert.alert('Lỗi', responseData?.message || 'Không thể tạo yêu cầu thuê máy.');
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const isConfirmDisabled =
    !startDate ||
    !endDate ||
    isSubmitting ||
    (deliveryMethod === 'delivery' && !deliveryAddress.trim());

  return (
    <View style={styles.root}>
      <StatusBar barStyle="dark-content" backgroundColor="#FFFFFF" />

      {/* Top Header */}
      <View style={[styles.header, { paddingTop: topInset + 8 }]}>
        <TouchableOpacity style={styles.headerBtn} onPress={onBack}>
          <Ionicons name="chevron-back" size={22} color={colors.light.textPrimary} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Tạo đơn thuê</Text>
        <View style={{ width: 36 }} />
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {/* Device Summary */}
        <View style={styles.deviceCard}>
          <Image
            source={{ uri: device.images?.[0] || 'https://via.placeholder.com/150' }}
            style={styles.deviceThumb}
            resizeMode="cover"
          />
          <View style={styles.deviceInfo}>
            <View style={styles.deviceBadgeRow}>
              <Text style={styles.deviceBrand}>{device.brand}</Text>
              <Text style={styles.deviceCategoryBadge}>{device.category}</Text>
            </View>
            <Text style={styles.deviceTitle} numberOfLines={1}>{device.title}</Text>
            <Text style={styles.dailyRate}>
              {formatPrice(device.dailyRate)} <Text style={styles.dailyRateUnit}>/ ngày</Text>
            </Text>
          </View>
        </View>

        {/* Date Picker Section */}
        <View style={styles.sectionContainer}>
          <View style={styles.sectionHeaderRow}>
            <View style={styles.sectionHeaderLeft}>
              <View style={styles.sectionHeaderIconBadge}>
                <Ionicons name="calendar-outline" size={16} color={colors.light.primary} />
              </View>
              <View>
                <Text style={styles.sectionTitle}>Thời gian thuê</Text>
                <Text style={styles.sectionSubtitle}>Lịch nhận và hoàn trả thiết bị</Text>
              </View>
            </View>
            {rentalDays > 0 && startDate && endDate && (
              <View style={styles.durationPill}>
                <Ionicons name="time-outline" size={12} color={colors.light.primary} />
                <Text style={styles.durationPillText}>{rentalDays} ngày</Text>
              </View>
            )}
          </View>

          {currentActiveBooking && (
            <View style={styles.activeBusyAlertBox}>
              <Ionicons name="warning" size={16} color="#DC2626" />
              <Text style={styles.activeBusyAlertText}>
                Thiết bị đang có người thuê đến ngày{' '}
                <Text style={{ fontWeight: '700' }}>
                  {new Date(currentActiveBooking.endDate).toLocaleDateString('vi-VN')}
                </Text>
                . Bạn vui lòng chọn ngày nhận sau thời gian này!
              </Text>
            </View>
          )}

          <View style={styles.dateSelectionContainer}>
            {/* Box 1: Start Date */}
            <TouchableOpacity
              style={[
                styles.dateCard,
                startDate ? styles.dateCardActive : undefined,
              ]}
              onPress={() => openPicker('start')}
              activeOpacity={0.7}
            >
              <View style={styles.dateCardHeader}>
                <View style={[styles.dateCardIconWrap, startDate ? styles.dateCardIconWrapActive : undefined]}>
                  <Ionicons
                    name="log-in-outline"
                    size={14}
                    color={startDate ? colors.light.primary : colors.light.textSecondary}
                  />
                </View>
                <Text style={[styles.dateCardLabel, startDate ? styles.dateCardLabelActive : undefined]}>
                  Nhận máy
                </Text>
              </View>

              {startDate ? (
                <View style={styles.dateCardBody}>
                  <Text style={styles.dateCardTime}>{formatTimeOnly(startDate)}</Text>
                  <Text style={styles.dateCardDate}>{formatDateOnly(startDate)}</Text>
                  <Text style={styles.dateCardSub}>{getDayOfWeekName(startDate)}</Text>
                </View>
              ) : (
                <View style={styles.dateCardPlaceholder}>
                  <Text style={styles.datePlaceholderPrompt}>Chưa chọn</Text>
                  <View style={styles.dateCardActionBadge}>
                    <Ionicons name="add" size={12} color={colors.light.primary} />
                    <Text style={styles.dateCardActionText}>Chọn giờ</Text>
                  </View>
                </View>
              )}
            </TouchableOpacity>

            {/* Arrow connector */}
            <View style={styles.dateArrowWrap}>
              <View style={styles.dateArrowCircle}>
                <Ionicons name="arrow-forward" size={13} color={colors.light.primary} />
              </View>
            </View>

            {/* Box 2: End Date */}
            <TouchableOpacity
              style={[
                styles.dateCard,
                endDate ? styles.dateCardActive : undefined,
              ]}
              onPress={() => openPicker('end')}
              activeOpacity={0.7}
            >
              <View style={styles.dateCardHeader}>
                <View style={[styles.dateCardIconWrap, endDate ? styles.dateCardIconWrapActive : undefined]}>
                  <Ionicons
                    name="log-out-outline"
                    size={14}
                    color={endDate ? colors.light.primary : colors.light.textSecondary}
                  />
                </View>
                <Text style={[styles.dateCardLabel, endDate ? styles.dateCardLabelActive : undefined]}>
                  Trả máy
                </Text>
              </View>

              {endDate ? (
                <View style={styles.dateCardBody}>
                  <Text style={styles.dateCardTime}>{formatTimeOnly(endDate)}</Text>
                  <Text style={styles.dateCardDate}>{formatDateOnly(endDate)}</Text>
                  <Text style={styles.dateCardSub}>{getDayOfWeekName(endDate)}</Text>
                </View>
              ) : (
                <View style={styles.dateCardPlaceholder}>
                  <Text style={styles.datePlaceholderPrompt}>Chưa chọn</Text>
                  <View style={styles.dateCardActionBadge}>
                    <Ionicons name="add" size={12} color={colors.light.primary} />
                    <Text style={styles.dateCardActionText}>Chọn giờ</Text>
                  </View>
                </View>
              )}
            </TouchableOpacity>
          </View>

          {/* Duration Summary Pill */}
          {startDate && endDate && rentalDays > 0 && (
            <View style={styles.durationSummaryBar}>
              <Ionicons name="checkmark-circle" size={15} color={colors.light.primary} />
              <Text style={styles.durationSummaryText}>
                Tổng thời gian thuê: <Text style={styles.durationSummaryBold}>{rentalDays} ngày</Text> ({rentalDays * 24} giờ)
              </Text>
            </View>
          )}
        </View>

        {/* ── Delivery Method Section (Phương thức nhận máy) ── */}
        <View style={styles.sectionContainer}>
          <Text style={styles.sectionTitle}>Phương thức nhận máy</Text>

          <View style={styles.deliveryOptionsContainer}>
            {/* Option 1: Tự đến lấy máy */}
            <TouchableOpacity
              style={[
                styles.deliveryOptionCard,
                deliveryMethod === 'pickup' && styles.deliveryOptionCardSelected,
              ]}
              onPress={() => setDeliveryMethod('pickup')}
              activeOpacity={0.7}
            >
              <View style={styles.deliveryOptionHeader}>
                <View style={styles.deliveryIconTitleRow}>
                  <View
                    style={[
                      styles.deliveryIconBox,
                      deliveryMethod === 'pickup' && styles.deliveryIconBoxSelected,
                    ]}
                  >
                    <Ionicons
                      name="storefront-outline"
                      size={20}
                      color={deliveryMethod === 'pickup' ? colors.light.primary : colors.light.textSecondary}
                    />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text
                      style={[
                        styles.deliveryOptionTitle,
                        deliveryMethod === 'pickup' && styles.deliveryOptionTitleSelected,
                      ]}
                    >
                      Tự đến lấy máy
                    </Text>
                    <Text style={styles.deliveryOptionSubtitle}>
                      Nhận và kiểm tra thiết bị trực tiếp tại điểm hẹn
                    </Text>
                  </View>
                </View>
                <View
                  style={[
                    styles.radioCircle,
                    deliveryMethod === 'pickup' && styles.radioCircleSelected,
                  ]}
                >
                  {deliveryMethod === 'pickup' && <View style={styles.radioInnerCircle} />}
                </View>
              </View>

              {deliveryMethod === 'pickup' && (
                <View style={styles.pickupAddressBox}>
                  <Ionicons name="location-outline" size={16} color={colors.light.primary} />
                  <Text style={styles.pickupAddressText}>
                    Điểm nhận: {device.addressText || 'Liên hệ trao đổi trực tiếp với chủ máy sau khi đơn được duyệt'}
                  </Text>
                </View>
              )}
            </TouchableOpacity>

            {/* Option 2: Giao hàng tận nơi */}
            <TouchableOpacity
              style={[
                styles.deliveryOptionCard,
                deliveryMethod === 'delivery' && styles.deliveryOptionCardSelected,
              ]}
              onPress={() => setDeliveryMethod('delivery')}
              activeOpacity={0.7}
            >
              <View style={styles.deliveryOptionHeader}>
                <View style={styles.deliveryIconTitleRow}>
                  <View
                    style={[
                      styles.deliveryIconBox,
                      deliveryMethod === 'delivery' && styles.deliveryIconBoxSelected,
                    ]}
                  >
                    <Ionicons
                      name="bicycle-outline"
                      size={20}
                      color={deliveryMethod === 'delivery' ? colors.light.primary : colors.light.textSecondary}
                    />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text
                      style={[
                        styles.deliveryOptionTitle,
                        deliveryMethod === 'delivery' && styles.deliveryOptionTitleSelected,
                      ]}
                    >
                      Giao hàng tận nơi
                    </Text>
                    <Text style={styles.deliveryOptionSubtitle}>
                      Chủ máy hoặc Shipper giao thiết bị đến địa chỉ của bạn
                    </Text>
                  </View>
                </View>
                <View
                  style={[
                    styles.radioCircle,
                    deliveryMethod === 'delivery' && styles.radioCircleSelected,
                  ]}
                >
                  {deliveryMethod === 'delivery' && <View style={styles.radioInnerCircle} />}
                </View>
              </View>

              {deliveryMethod === 'delivery' && (
                <View style={styles.deliveryInputBox}>
                  <Text style={styles.deliveryInputLabel}>
                    Địa chỉ nhận hàng <Text style={{ color: colors.light.error }}>*</Text>:
                  </Text>
                  <View style={styles.deliveryInputWrapper}>
                    <Ionicons name="location" size={18} color={colors.light.primary} style={{ marginTop: 2 }} />
                    <TextInput
                      style={styles.deliveryAddressInput}
                      placeholder="Nhập số nhà, tên đường, phường/xã, quận/huyện..."
                      placeholderTextColor={colors.light.textSecondary}
                      value={deliveryAddress}
                      onChangeText={(text: string) => setDeliveryAddress(text)}
                      multiline
                      numberOfLines={2}
                    />
                  </View>
                </View>
              )}
            </TouchableOpacity>
          </View>
        </View>

        {rentalDays > 0 && (
          <>
            <VoucherInput
              rentalDays={rentalDays}
              onApplyVoucher={setAppliedVoucher}
            />
            <PriceBreakdownCard
              rentalDays={rentalDays}
              dailyRate={device.dailyRate}
              depositValue={device.depositValue || 0}
              voucher={appliedVoucher}
            />
          </>
        )}
      </ScrollView>

      {/* Bottom Sticky Action Bar */}
      <View style={styles.bottomBar}>
        <View>
          <Text style={styles.bottomPriceSub}>Tổng thanh toán</Text>
          <Text style={styles.bottomPriceMain}>
            {rentalDays > 0 ? formatPrice(totalAmount) : '---'}
          </Text>
        </View>

        <TouchableOpacity
          style={[styles.confirmBtn, isConfirmDisabled && styles.confirmBtnDisabled]}
          onPress={handleConfirm}
          disabled={isConfirmDisabled}
          activeOpacity={0.8}
        >
          {isSubmitting ? (
            <ActivityIndicator size="small" color="#FFFFFF" />
          ) : (
            <Text style={[styles.confirmBtnText, isConfirmDisabled && styles.confirmBtnTextDisabled]}>
              Xác nhận đặt thuê
            </Text>
          )}
        </TouchableOpacity>
      </View>

      <CustomDateTimePicker
        visible={pickerConfig.visible}
        type={pickerConfig.type}
        initialDate={pickerConfig.type === 'start' ? startDate : endDate}
        minDate={pickerConfig.type === 'end' ? startDate : new Date()}
        busyRanges={busyRanges}
        onClose={() => setPickerConfig({ ...pickerConfig, visible: false })}
        onConfirm={handleConfirmPicker}
      />
    </View>
  );
}

const getLocalYMD = (d: Date) => {
  const year = d.getFullYear();
  const month = (d.getMonth() + 1).toString().padStart(2, '0');
  const day = d.getDate().toString().padStart(2, '0');
  return `${year}-${month}-${day}`;
};


const hoursList = Array.from({ length: 24 }, (_, i) => i.toString().padStart(2, '0'));
const minutesList = Array.from({ length: 60 }, (_, i) => i.toString().padStart(2, '0'));
const quickTimePresets = ['08:00', '10:00', '13:30', '17:30', '20:00'];

const TimeScrollPicker = React.memo(({ items, selectedValue, onValueChange, visible }: any) => {
  const ITEM_HEIGHT = 44;
  const scrollViewRef = React.useRef(null as any);

  React.useEffect(() => {
    if (visible && scrollViewRef.current) {
      const targetIndex = items.indexOf(selectedValue);
      if (targetIndex >= 0) {
        setTimeout(() => {
          scrollViewRef.current?.scrollTo({ y: targetIndex * ITEM_HEIGHT, animated: false });
        }, 50);
      }
    }
  }, [visible, items, selectedValue]);

  const handleScroll = (e: any) => {
    const y = e.nativeEvent.contentOffset.y;
    const index = Math.max(0, Math.min(items.length - 1, Math.round(y / ITEM_HEIGHT)));
    const actualItem = items[index];
    if (actualItem && actualItem !== selectedValue) {
      onValueChange(actualItem);
    }
  };

  return (
    <View style={{ height: ITEM_HEIGHT * 3, width: 70 }}>
      {/* Selection Highlight */}
      <View
        style={{
          position: 'absolute',
          top: ITEM_HEIGHT,
          width: '100%',
          height: ITEM_HEIGHT,
          backgroundColor: colors.light.primaryLight,
          borderRadius: 8,
          borderWidth: 1.5,
          borderColor: colors.light.primary,
        }}
        pointerEvents="none"
      />

      <View style={{ flex: 1, overflow: 'hidden' }}>
        <ScrollView
          ref={scrollViewRef}
          nestedScrollEnabled={true}
          showsVerticalScrollIndicator={false}
          snapToInterval={ITEM_HEIGHT}
          decelerationRate="fast"
          onMomentumScrollEnd={handleScroll}
          onScrollEndDrag={handleScroll}
          scrollEventThrottle={16}
          contentContainerStyle={{ paddingVertical: ITEM_HEIGHT }}
        >
          {items.map((item: string) => {
            const isSelected = item === selectedValue;
            return (
              <View key={item} style={{ height: ITEM_HEIGHT, justifyContent: 'center', alignItems: 'center' }}>
                <Text
                  style={{
                    fontSize: isSelected ? 22 : 15,
                    color: isSelected ? colors.light.primary : colors.light.textSecondary,
                    fontWeight: isSelected ? '800' : '500',
                  }}
                >
                  {item}
                </Text>
              </View>
            );
          })}
        </ScrollView>
      </View>
    </View>
  );
});

const CustomDateTimePicker = ({
  visible,
  type,
  initialDate,
  minDate,
  busyRanges,
  onClose,
  onConfirm,
}: any) => {
  const [date, setDate] = useState(initialDate || new Date());
  const [hours, setHours] = useState((initialDate || new Date()).getHours().toString().padStart(2, '0'));
  const [minutes, setMinutes] = useState((initialDate || new Date()).getMinutes().toString().padStart(2, '0'));

  useEffect(() => {
    if (visible) {
      const d = initialDate || new Date();
      setDate(d);
      setHours(d.getHours().toString().padStart(2, '0'));
      setMinutes(d.getMinutes().toString().padStart(2, '0'));
    }
  }, [visible, initialDate]);

  const handleConfirm = () => {
    const finalDate = new Date(date);
    finalDate.setHours(parseInt(hours) || 0, parseInt(minutes) || 0, 0, 0);

    const ymd = getLocalYMD(finalDate);
    if (markedDates[ymd]?.disabled) {
      Alert.alert(
        'Không thể chọn ngày này',
        'Thiết bị đã có người thuê trong ngày bạn chọn. Vui lòng chọn ngày khác trên lịch!'
      );
      return;
    }

    onConfirm(finalDate);
  };

  const currentDateStr = getLocalYMD(date);
  const minDateStr = minDate ? getLocalYMD(minDate) : undefined;

  const markedDates = useMemo(() => {
    const marks: Record<string, any> = {};

    // 1. Đánh dấu các ngày bận (đã có người thuê)
    if (busyRanges && Array.isArray(busyRanges)) {
      busyRanges.forEach((range: any) => {
        const s = new Date(range.startDate);
        const e = new Date(range.endDate);

        const curr = new Date(s);
        curr.setHours(0, 0, 0, 0);

        const endLimit = new Date(e);
        endLimit.setHours(23, 59, 59, 999);

        while (curr <= endLimit) {
          const ymd = getLocalYMD(curr);
          marks[ymd] = {
            disabled: true,
            disableTouchEvent: true,
            marked: true,
            dotColor: colors.light.error,
            textColor: '#CBD5E1',
          };
          curr.setDate(curr.getDate() + 1);
        }
      });
    }

    // 2. Đánh dấu ngày đang chọn
    marks[currentDateStr] = {
      ...(marks[currentDateStr] || {}),
      selected: true,
      selectedColor: colors.light.primary,
      textColor: '#FFFFFF',
    };

    return marks;
  }, [busyRanges, currentDateStr]);

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View style={styles.modalOverlay}>
        <View style={styles.modalContent}>
          {/* Modal Header */}
          <View style={styles.modalHeader}>
            <View style={styles.modalHeaderTitleRow}>
              <View style={styles.modalHeaderIconBadge}>
                <Ionicons
                  name={type === 'start' ? 'log-in-outline' : 'log-out-outline'}
                  size={18}
                  color={colors.light.primary}
                />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.modalTitle}>
                  {type === 'start' ? 'Thời gian nhận máy' : 'Thời gian trả máy'}
                </Text>
                <Text style={styles.modalSubtitle}>
                  {type === 'start'
                    ? 'Chọn ngày & giờ bạn muốn nhận thiết bị'
                    : 'Chọn ngày & giờ bạn sẽ trả thiết bị'}
                </Text>
              </View>
            </View>
            <TouchableOpacity style={styles.modalCloseBtn} onPress={onClose} activeOpacity={0.7}>
              <Ionicons name="close" size={18} color={colors.light.textSecondary} />
            </TouchableOpacity>
          </View>

          <ScrollView
            showsVerticalScrollIndicator={false}
            nestedScrollEnabled={true}
            style={styles.modalScrollBody}
            contentContainerStyle={{ paddingBottom: 6 }}
          >
            {/* Live Selection Preview Bar */}
            <View style={styles.modalPreviewBar}>
              <View style={styles.modalPreviewCol}>
                <Text style={styles.modalPreviewLabel}>Ngày đã chọn</Text>
                <View style={styles.modalPreviewValRow}>
                  <Ionicons name="calendar" size={14} color={colors.light.primary} />
                  <Text style={styles.modalPreviewValText}>
                    {getDayOfWeekName(date)}, {formatDateOnly(date)}
                  </Text>
                </View>
              </View>
              <View style={styles.modalPreviewDivider} />
              <View style={styles.modalPreviewCol}>
                <Text style={styles.modalPreviewLabel}>Giờ hẹn</Text>
                <View style={styles.modalPreviewValRow}>
                  <Ionicons name="time" size={14} color={colors.light.primary} />
                  <Text style={styles.modalPreviewValTime}>
                    {hours}:{minutes}
                  </Text>
                </View>
              </View>
            </View>

            {/* Calendar */}
            <View style={styles.calendarContainer}>
              <Calendar
                current={currentDateStr}
                minDate={minDateStr}
                onDayPress={(day: any) => {
                  if (markedDates[day.dateString]?.disabled) {
                    Alert.alert(
                      'Không thể chọn ngày này',
                      'Thiết bị đã có người thuê trong ngày này. Vui lòng chọn ngày khác!'
                    );
                    return;
                  }
                  const [y, m, d] = day.dateString.split('-').map(Number);
                  setDate(new Date(y, m - 1, d));
                }}
                markedDates={markedDates}
                theme={{
                  backgroundColor: '#FFFFFF',
                  calendarBackground: '#FFFFFF',
                  textSectionTitleColor: colors.light.textSecondary,
                  selectedDayBackgroundColor: colors.light.primary,
                  selectedDayTextColor: '#FFFFFF',
                  todayTextColor: colors.light.primary,
                  dayTextColor: colors.light.textPrimary,
                  textDisabledColor: '#CBD5E1',
                  monthTextColor: colors.light.textPrimary,
                  arrowColor: colors.light.primary,
                  textDayFontWeight: '600',
                  textMonthFontWeight: '700',
                  textDayHeaderFontWeight: '600',
                  textDayFontSize: 14,
                  textMonthFontSize: 15,
                  textDayHeaderFontSize: 12,
                }}
              />
            </View>

            {/* Chú thích màu sắc */}
            <View style={styles.calendarLegendRow}>
              <View style={styles.legendItem}>
                <View style={[styles.legendDot, { backgroundColor: colors.light.primary }]} />
                <Text style={styles.legendText}>Ngày bạn chọn</Text>
              </View>
              <View style={styles.legendItem}>
                <View style={[styles.legendDot, { backgroundColor: '#F87171' }]} />
                <Text style={styles.legendText}>Đã có người thuê</Text>
              </View>
            </View>

            {/* Time Picker Section */}
            <View style={styles.timeSection}>
              <View style={styles.timeSectionHeaderRow}>
                <Ionicons name="time-outline" size={16} color={colors.light.primary} />
                <Text style={styles.timeSectionTitle}>
                  {type === 'start' ? 'Giờ nhận máy' : 'Giờ trả máy'}
                </Text>
              </View>

              {/* Quick Preset Buttons */}
              <View style={styles.presetContainer}>
                <Text style={styles.presetLabel}>Gợi ý khung giờ:</Text>
                <View style={styles.presetChipsRow}>
                  {quickTimePresets.map((preset) => {
                    const [h, m] = preset.split(':');
                    const isSelected = hours === h && minutes === m;
                    return (
                      <TouchableOpacity
                        key={preset}
                        style={[
                          styles.presetChip,
                          isSelected ? styles.presetChipSelected : undefined,
                        ]}
                        onPress={() => {
                          setHours(h);
                          setMinutes(m);
                        }}
                        activeOpacity={0.7}
                      >
                        <Text
                          style={[
                            styles.presetChipText,
                            isSelected ? styles.presetChipTextSelected : undefined,
                          ]}
                        >
                          {preset}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>
              </View>

              {/* Scroll Picker with Column Titles */}
              <View style={styles.timePickerCard}>
                <View style={styles.timePickerCol}>
                  <Text style={styles.timePickerColTitle}>Giờ</Text>
                  <TimeScrollPicker
                    items={hoursList}
                    selectedValue={hours}
                    onValueChange={setHours}
                    visible={visible}
                  />
                </View>

                <Text style={styles.timeColon}>:</Text>

                <View style={styles.timePickerCol}>
                  <Text style={styles.timePickerColTitle}>Phút</Text>
                  <TimeScrollPicker
                    items={minutesList}
                    selectedValue={minutes}
                    onValueChange={setMinutes}
                    visible={visible}
                  />
                </View>
              </View>
            </View>
          </ScrollView>

          {/* Modal Actions */}
          <View style={styles.modalActions}>
            <TouchableOpacity style={styles.modalBtnCancel} onPress={onClose} activeOpacity={0.7}>
              <Text style={styles.modalBtnTextCancel}>Hủy</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.modalBtnConfirm} onPress={handleConfirm} activeOpacity={0.8}>
              <Ionicons name="checkmark-circle" size={17} color="#FFFFFF" style={{ marginRight: 6 }} />
              <Text style={styles.modalBtnTextConfirm}>Xác nhận</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },
  centerContainer: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  loadingText: {
    color: colors.light.textSecondary,
    marginTop: 12,
    fontSize: 14,
  },
  errorTitle: {
    color: colors.light.error,
    fontSize: 16,
    fontWeight: '700',
    marginTop: 12,
    marginBottom: 16,
  },
  backBtn: {
    backgroundColor: colors.light.primary,
    paddingHorizontal: 18,
    paddingVertical: 10,
    borderRadius: 10,
  },
  backBtnText: {
    color: '#FFFFFF',
    fontWeight: '600',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingTop: Platform.OS === 'ios' ? 44 : 14,
    paddingBottom: 14,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: colors.light.border,
  },
  headerBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: colors.light.surface,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: colors.light.border,
  },
  headerTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.light.textPrimary,
  },
  scrollContent: {
    paddingBottom: 110,
    paddingTop: 14,
  },
  deviceCard: {
    marginHorizontal: 16,
    marginBottom: 14,
    padding: 12,
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: colors.light.border,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 4,
    elevation: 2,
  },
  deviceThumb: {
    width: 68,
    height: 68,
    borderRadius: 10,
    backgroundColor: '#F1F5F9',
  },
  deviceInfo: {
    flex: 1,
  },
  deviceBadgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 4,
  },
  deviceBrand: {
    color: colors.light.primary,
    fontSize: 11,
    fontWeight: '800',
    textTransform: 'uppercase',
  },
  deviceCategoryBadge: {
    fontSize: 11,
    color: colors.light.textSecondary,
    backgroundColor: colors.light.surface,
    paddingHorizontal: 6,
    paddingVertical: 1,
    borderRadius: 4,
    borderWidth: 1,
    borderColor: colors.light.border,
    fontWeight: '500',
  },
  deviceTitle: {
    color: colors.light.textPrimary,
    fontSize: 15,
    fontWeight: '700',
    marginBottom: 4,
  },
  dailyRate: {
    color: colors.light.primary,
    fontSize: 15,
    fontWeight: '800',
  },
  dailyRateUnit: {
    fontSize: 12,
    fontWeight: '400',
    color: colors.light.textSecondary,
  },
  sectionContainer: {
    marginHorizontal: 16,
    marginBottom: 14,
    padding: 16,
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: colors.light.border,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 4,
    elevation: 2,
  },
  sectionHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  sectionHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flex: 1,
  },
  sectionHeaderIconBadge: {
    width: 30,
    height: 30,
    borderRadius: 8,
    backgroundColor: colors.light.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sectionTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: colors.light.textPrimary,
  },
  sectionSubtitle: {
    fontSize: 11,
    color: colors.light.textSecondary,
    marginTop: 1,
  },
  durationPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: colors.light.primaryLight,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: colors.light.primaryLight,
  },
  durationPillText: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.light.primary,
  },
  activeBusyAlertBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#FEF2F2',
    borderWidth: 1,
    borderColor: '#FCA5A5',
    padding: 10,
    borderRadius: 8,
    marginBottom: 12,
  },
  activeBusyAlertText: {
    fontSize: 12,
    color: '#991B1B',
    flex: 1,
    lineHeight: 16,
  },
  dateSelectionContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 2,
  },
  dateCard: {
    flex: 1,
    backgroundColor: colors.light.surface,
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: colors.light.border,
    padding: 12,
    minHeight: 90,
  },
  dateCardActive: {
    borderColor: colors.light.primary,
    backgroundColor: colors.light.primaryLight,
  },
  dateCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 6,
  },
  dateCardIconWrap: {
    width: 22,
    height: 22,
    borderRadius: 6,
    backgroundColor: colors.light.white,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: colors.light.border,
  },
  dateCardIconWrapActive: {
    backgroundColor: colors.light.primaryLight,
    borderColor: colors.light.primary,
  },
  dateCardLabel: {
    fontSize: 11,
    fontWeight: '600',
    color: colors.light.textSecondary,
    textTransform: 'uppercase',
  },
  dateCardLabelActive: {
    color: colors.light.primary,
    fontWeight: '800',
  },
  dateCardBody: {
    alignItems: 'flex-start',
  },
  dateCardTime: {
    fontSize: 18,
    fontWeight: '800',
    color: colors.light.textPrimary,
    letterSpacing: 0.5,
  },
  dateCardDate: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.light.primary,
    marginTop: 1,
  },
  dateCardSub: {
    fontSize: 11,
    color: colors.light.textSecondary,
    marginTop: 1,
  },
  dateCardPlaceholder: {
    paddingVertical: 2,
  },
  datePlaceholderPrompt: {
    fontSize: 12,
    fontWeight: '500',
    color: colors.light.textSecondary,
    marginBottom: 6,
  },
  dateCardActionBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: colors.light.border,
    alignSelf: 'flex-start',
  },
  dateCardActionText: {
    fontSize: 11,
    fontWeight: '700',
    color: colors.light.primary,
  },
  dateArrowWrap: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  dateArrowCircle: {
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: colors.light.border,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 2,
    elevation: 1,
  },
  durationSummaryBar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: colors.light.primaryLight,
    borderWidth: 1,
    borderColor: colors.light.borderDefault,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    marginTop: 10,
  },
  durationSummaryText: {
    fontSize: 12,
    color: colors.light.textPrimary,
    flex: 1,
  },
  durationSummaryBold: {
    fontWeight: '700',
    color: colors.light.primary,
  },
  deliveryOptionsContainer: {
    gap: 12,
  },
  deliveryOptionCard: {
    backgroundColor: colors.light.surface,
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: colors.light.border,
    padding: 14,
  },
  deliveryOptionCardSelected: {
    borderColor: colors.light.primary,
    backgroundColor: colors.light.primaryLight,
  },
  deliveryOptionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  deliveryIconTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flex: 1,
    marginRight: 8,
  },
  deliveryIconBox: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: colors.light.border,
  },
  deliveryIconBoxSelected: {
    borderColor: colors.light.primaryLight,
    backgroundColor: colors.light.primaryLight + '60',
  },
  deliveryOptionTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.light.textPrimary,
    marginBottom: 2,
  },
  deliveryOptionTitleSelected: {
    color: colors.light.primary,
  },
  deliveryOptionSubtitle: {
    fontSize: 12,
    color: colors.light.textSecondary,
    lineHeight: 16,
  },
  radioCircle: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: colors.light.border,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFFFFF',
  },
  radioCircleSelected: {
    borderColor: colors.light.primary,
  },
  radioInnerCircle: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: colors.light.primary,
  },
  pickupAddressBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#FFFFFF',
    padding: 10,
    borderRadius: 8,
    marginTop: 10,
    borderWidth: 1,
    borderColor: colors.light.border,
  },
  pickupAddressText: {
    fontSize: 12,
    color: colors.light.textSecondary,
    flex: 1,
    lineHeight: 16,
  },
  deliveryInputBox: {
    marginTop: 10,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: colors.light.border,
  },
  deliveryInputLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.light.textPrimary,
    marginBottom: 6,
  },
  deliveryInputWrapper: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: '#FFFFFF',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.light.border,
    paddingHorizontal: 10,
    paddingVertical: 8,
    gap: 8,
  },
  deliveryAddressInput: {
    flex: 1,
    fontSize: 13,
    color: colors.light.textPrimary,
    minHeight: 40,
    paddingTop: 0,
    paddingBottom: 0,
  },
  bottomBar: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: '#FFFFFF',
    borderTopWidth: 1,
    borderTopColor: colors.light.border,
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: Platform.OS === 'ios' ? 28 : 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 6,
  },
  bottomPriceSub: {
    fontSize: 12,
    color: colors.light.textSecondary,
  },
  bottomPriceMain: {
    fontSize: 18,
    fontWeight: '800',
    color: colors.light.primary,
  },
  confirmBtn: {
    backgroundColor: colors.light.primary,
    paddingVertical: 12,
    paddingHorizontal: 22,
    borderRadius: 10,
  },
  confirmBtnDisabled: {
    backgroundColor: '#E2E8F0',
  },
  confirmBtnText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '700',
  },
  confirmBtnTextDisabled: {
    color: '#94A3B8',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.65)',
    justifyContent: 'center',
    padding: 16,
  },
  modalContent: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 16,
    maxHeight: '90%',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.15,
    shadowRadius: 16,
    elevation: 10,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 10,
    paddingBottom: 10,
    borderBottomWidth: 1,
    borderBottomColor: colors.light.border,
  },
  modalHeaderTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    flex: 1,
    marginRight: 8,
  },
  modalHeaderIconBadge: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: colors.light.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.light.textPrimary,
  },
  modalSubtitle: {
    fontSize: 11,
    color: colors.light.textSecondary,
    marginTop: 1,
  },
  modalCloseBtn: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: colors.light.surface,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: colors.light.border,
  },
  modalScrollBody: {
    flexGrow: 0,
  },
  modalPreviewBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.light.primaryLight,
    borderRadius: 10,
    padding: 10,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: colors.light.primaryLight,
  },
  modalPreviewCol: {
    flex: 1,
    alignItems: 'center',
  },
  modalPreviewLabel: {
    fontSize: 11,
    color: colors.light.textSecondary,
    marginBottom: 2,
    fontWeight: '500',
  },
  modalPreviewValRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  modalPreviewValText: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.light.textPrimary,
  },
  modalPreviewValTime: {
    fontSize: 15,
    fontWeight: '800',
    color: colors.light.primary,
  },
  modalPreviewDivider: {
    width: 1,
    height: 26,
    backgroundColor: colors.light.borderDefault,
  },
  calendarContainer: {
    borderRadius: 12,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: colors.light.border,
    marginBottom: 6,
  },
  calendarLegendRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 18,
    paddingVertical: 6,
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  legendDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  legendText: {
    fontSize: 11,
    color: colors.light.textSecondary,
    fontWeight: '500',
  },
  timeSection: {
    backgroundColor: colors.light.surface,
    borderRadius: 12,
    padding: 12,
    marginTop: 6,
    borderWidth: 1,
    borderColor: colors.light.border,
  },
  timeSectionHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 8,
  },
  timeSectionTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.light.textPrimary,
  },
  presetContainer: {
    marginBottom: 10,
  },
  presetLabel: {
    fontSize: 11,
    color: colors.light.textSecondary,
    marginBottom: 6,
    fontWeight: '500',
  },
  presetChipsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  presetChip: {
    paddingHorizontal: 9,
    paddingVertical: 5,
    borderRadius: 6,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: colors.light.border,
  },
  presetChipSelected: {
    backgroundColor: colors.light.primary,
    borderColor: colors.light.primary,
  },
  presetChipText: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.light.textPrimary,
  },
  presetChipTextSelected: {
    color: '#FFFFFF',
    fontWeight: '700',
  },
  timePickerCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 10,
    paddingVertical: 6,
    borderWidth: 1,
    borderColor: colors.light.border,
  },
  timePickerCol: {
    alignItems: 'center',
  },
  timePickerColTitle: {
    fontSize: 11,
    fontWeight: '600',
    color: colors.light.textSecondary,
    marginBottom: 4,
  },
  timeColon: {
    fontSize: 24,
    fontWeight: '700',
    color: colors.light.primary,
    marginHorizontal: 10,
    marginTop: 16,
  },
  modalActions: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 10,
    marginTop: 10,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: colors.light.border,
  },
  modalBtnCancel: {
    flex: 1,
    backgroundColor: colors.light.surface,
    borderWidth: 1,
    borderColor: colors.light.border,
    paddingVertical: 12,
    borderRadius: 10,
    alignItems: 'center',
  },
  modalBtnTextCancel: {
    color: colors.light.textSecondary,
    fontWeight: '600',
    fontSize: 14,
  },
  modalBtnConfirm: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.light.primary,
    paddingVertical: 12,
    borderRadius: 10,
  },
  modalBtnTextConfirm: {
    color: '#FFFFFF',
    fontWeight: '700',
    fontSize: 14,
  },
});
