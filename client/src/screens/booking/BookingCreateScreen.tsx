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
  onNavigateToVerification?: () => void;
}

const formatPrice = (price: number): string => {
  return price.toLocaleString('vi-VN') + ' đ';
};

export function BookingCreateScreen({
  deviceId,
  onBack,
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

  const formatDateTime = (d: Date) => {
    const pad = (n: number) => n.toString().padStart(2, '0');
    return `${pad(d.getDate())}/${pad(d.getMonth() + 1)}/${d.getFullYear()} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
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

      Alert.alert('Thành công', 'Yêu cầu thuê máy đã được gửi đi!', [
        { text: 'OK', onPress: onBack }
      ]);
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
          <Text style={styles.deviceTitle} numberOfLines={1}>{device.title}</Text>
          <Text style={styles.deviceBrand}>{device.brand} • {device.category}</Text>
          <Text style={styles.dailyRate}>{formatPrice(device.dailyRate)} / ngày</Text>
        </View>

        {/* Date Picker Section */}
        <View style={styles.sectionContainer}>
          <Text style={styles.sectionTitle}>Chọn thời gian thuê</Text>

          {currentActiveBooking && (
            <View style={styles.activeBusyAlertBox}>
              <Ionicons name="time" size={16} color="#DC2626" />
              <Text style={styles.activeBusyAlertText}>
                Thiết bị đang có người thuê đến ngày{' '}
                <Text style={{ fontWeight: '700' }}>
                  {new Date(currentActiveBooking.endDate).toLocaleDateString('vi-VN')}
                </Text>
                . Bạn vui lòng chọn ngày nhận sau thời gian này!
              </Text>
            </View>
          )}

          <View style={styles.dateSummary}>
            <TouchableOpacity style={styles.dateBox} onPress={() => openPicker('start')} activeOpacity={0.7}>
              <Text style={styles.dateLabel}>Thời gian nhận máy</Text>
              <Text style={styles.dateValue}>{startDate ? formatDateTime(startDate) : 'Chọn'}</Text>
            </TouchableOpacity>
            <Ionicons name="arrow-forward" size={18} color={colors.light.textSecondary} />
            <TouchableOpacity style={styles.dateBox} onPress={() => openPicker('end')} activeOpacity={0.7}>
              <Text style={styles.dateLabel}>Thời gian trả máy</Text>
              <Text style={styles.dateValue}>{endDate ? formatDateTime(endDate) : 'Chọn'}</Text>
            </TouchableOpacity>
          </View>
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

        <CustomDateTimePicker
          visible={pickerConfig.visible}
          type={pickerConfig.type}
          initialDate={pickerConfig.type === 'start' ? startDate : endDate}
          minDate={pickerConfig.type === 'end' ? startDate : new Date()}
          busyRanges={busyRanges}
          onClose={() => setPickerConfig({ ...pickerConfig, visible: false })}
          onConfirm={handleConfirmPicker}
        />

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

const TimeScrollPicker = React.memo(({ items, selectedValue, onValueChange, visible }: any) => {
  const ITEM_HEIGHT = 44;
  const flatListRef = React.useRef(null as any);

  // Create a large list to simulate infinite scrolling (50 repetitions)
  const REPEAT = 50;
  const data = React.useMemo(() => Array(REPEAT).fill(items).flat(), [items]);

  React.useEffect(() => {
    if (visible && flatListRef.current) {
      const middleRepetition = Math.floor(REPEAT / 2);
      const originalIndex = items.indexOf(selectedValue);
      const targetIndex = middleRepetition * items.length + originalIndex;

      setTimeout(() => {
        flatListRef.current?.scrollToOffset({ offset: targetIndex * ITEM_HEIGHT, animated: false });
      }, 50);
    }
  }, [visible, items, selectedValue]);

  const handleScroll = (e: any) => {
    const y = e.nativeEvent.contentOffset.y;
    const index = Math.max(0, Math.min(data.length - 1, Math.round(y / ITEM_HEIGHT)));
    const actualItem = data[index];
    if (actualItem && actualItem !== selectedValue) {
      onValueChange(actualItem);
    }
  };

  return (
    <View style={{ height: ITEM_HEIGHT * 3, width: 60 }}>
      {/* Selection Highlight */}
      <View
        style={{
          position: 'absolute',
          top: ITEM_HEIGHT,
          width: '100%',
          height: ITEM_HEIGHT,
          backgroundColor: colors.light.primaryLight + '50',
          borderRadius: 8,
          borderWidth: 1,
          borderColor: colors.light.primary,
        }}
        pointerEvents="none"
      />

      <View style={{ flex: 1, overflow: 'hidden' }}>
        <React.Fragment>
          <FlatList
            ref={flatListRef}
            data={data}
            keyExtractor={(_: any, index: number) => index.toString()}
            showsVerticalScrollIndicator={false}
            snapToInterval={ITEM_HEIGHT}
            decelerationRate="fast"
            onMomentumScrollEnd={handleScroll}
            onScrollEndDrag={handleScroll}
            scrollEventThrottle={16}
            contentContainerStyle={{ paddingVertical: ITEM_HEIGHT }}
            getItemLayout={(data: any, index: number) => ({ length: ITEM_HEIGHT, offset: ITEM_HEIGHT * index, index })}
            initialNumToRender={8}
            maxToRenderPerBatch={10}
            windowSize={5}
            renderItem={({ item }: { item: string }) => {
              const isSelected = item === selectedValue;
              return (
                <View style={{ height: ITEM_HEIGHT, justifyContent: 'center', alignItems: 'center' }}>
                  <Text
                    style={{
                      fontSize: isSelected ? 20 : 15,
                      color: isSelected ? colors.light.primary : colors.light.textSecondary,
                      fontWeight: isSelected ? '700' : '500',
                    }}
                  >
                    {item}
                  </Text>
                </View>
              );
            }}
          />
        </React.Fragment>
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
    <Modal visible={visible} transparent animationType="fade">
      <View style={styles.modalOverlay}>
        <View style={styles.modalContent}>
          <Text style={styles.modalTitle}>
            {type === 'start' ? 'Thời gian nhận máy' : 'Thời gian trả máy'}
          </Text>

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
            }}
          />

          {/* Chú thích màu sắc */}
          <View style={styles.calendarLegendRow}>
            <View style={styles.legendItem}>
              <View style={[styles.legendDot, { backgroundColor: colors.light.primary }]} />
              <Text style={styles.legendText}>Ngày bạn chọn</Text>
            </View>
            <View style={styles.legendItem}>
              <View style={[styles.legendDot, { backgroundColor: colors.light.error }]} />
              <Text style={styles.legendText}>Đã có người thuê</Text>
            </View>
          </View>

          <View style={styles.timeContainer}>
            <Text style={styles.timeLabel}>Giờ nhận:</Text>
            <View style={styles.timeInputRow}>
              <TimeScrollPicker items={hoursList} selectedValue={hours} onValueChange={setHours} visible={visible} />
              <Text style={styles.timeColon}>:</Text>
              <TimeScrollPicker items={minutesList} selectedValue={minutes} onValueChange={setMinutes} visible={visible} />
            </View>
          </View>

          <View style={styles.modalActions}>
            <TouchableOpacity style={styles.modalBtnCancel} onPress={onClose}>
              <Text style={styles.modalBtnTextCancel}>Hủy</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.modalBtnConfirm} onPress={handleConfirm}>
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
  deviceTitle: {
    color: colors.light.textPrimary,
    fontSize: 16,
    fontWeight: '700',
    marginBottom: 4,
  },
  deviceBrand: {
    color: colors.light.textSecondary,
    fontSize: 13,
    textTransform: 'uppercase',
    marginBottom: 8,
  },
  dailyRate: {
    color: colors.light.primary,
    fontSize: 15,
    fontWeight: '700',
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
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.light.textPrimary,
    marginBottom: 14,
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
    marginBottom: 10,
  },
  activeBusyAlertText: {
    fontSize: 12,
    color: '#991B1B',
    flex: 1,
    lineHeight: 16,
  },
  calendarLegendRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 20,
    marginTop: 10,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: colors.light.border,
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  legendDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  legendText: {
    fontSize: 12,
    color: colors.light.textSecondary,
    fontWeight: '500',
  },
  dateSummary: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 8,
    gap: 10,
  },
  dateBox: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 12,
    backgroundColor: colors.light.surface,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: colors.light.border,
  },
  dateLabel: {
    color: colors.light.textSecondary,
    fontSize: 12,
    marginBottom: 4,
  },
  dateValue: {
    color: colors.light.textPrimary,
    fontSize: 14,
    fontWeight: '700',
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
    backgroundColor: '#EFF6FF',
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
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    padding: 20,
  },
  modalContent: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 20,
    borderWidth: 1,
    borderColor: colors.light.border,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 10,
  },
  modalTitle: {
    color: colors.light.textPrimary,
    fontSize: 17,
    fontWeight: '700',
    marginBottom: 16,
    textAlign: 'center',
  },
  timeContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 16,
    marginBottom: 16,
    backgroundColor: colors.light.surface,
    paddingVertical: 10,
    borderRadius: 10,
  },
  timeLabel: {
    color: colors.light.textSecondary,
    fontSize: 15,
    fontWeight: '600',
    marginRight: 12,
  },
  timeInputRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  timeColon: {
    color: colors.light.textPrimary,
    fontSize: 22,
    fontWeight: '700',
    marginHorizontal: 10,
  },
  modalActions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 12,
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
    backgroundColor: colors.light.primary,
    paddingVertical: 12,
    borderRadius: 10,
    alignItems: 'center',
  },
  modalBtnTextConfirm: {
    color: '#FFFFFF',
    fontWeight: '700',
    fontSize: 14,
  },
});
