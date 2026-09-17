import React, { useState, useEffect } from 'react';
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
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Calendar } from 'react-native-calendars';
import { deviceService } from '../../services/deviceService';
import { Device } from '../../types';

interface BookingCreateScreenProps {
  deviceId: string;
  onBack: () => void;
}

const formatPrice = (price: number): string => {
  return price.toLocaleString('vi-VN') + ' đ';
};

export function BookingCreateScreen({ deviceId, onBack }: BookingCreateScreenProps) {
  const [device, setDevice] = useState(null as Device | null);
  const [loading, setLoading] = useState(true);
  
  const [startDate, setStartDate] = useState(null as Date | null);
  const [endDate, setEndDate] = useState(null as Date | null);
  
  const [pickerConfig, setPickerConfig] = useState({ visible: false, type: 'start' as 'start' | 'end' });

  useEffect(() => {
    let isMounted = true;
    (async () => {
      setLoading(true);
      const data = await deviceService.getDeviceById(deviceId);
      if (isMounted) {
        setDevice(data);
        setLoading(false);
      }
    })();
    return () => {
      isMounted = false;
    };
  }, [deviceId]);

  const openPicker = (type: 'start' | 'end') => {
    setPickerConfig({ visible: true, type });
  };

  const handleConfirmPicker = (date: Date) => {
    const now = new Date();
    
    if (pickerConfig.type === 'start') {
      if (date < now) {
        Alert.alert('Lỗi chọn giờ', 'Thời gian bắt đầu không được nằm trong quá khứ.');
        return;
      }
      setStartDate(date);
      if (endDate && endDate < date) {
        setEndDate(null);
      }
    } else {
      if (startDate && date <= startDate) {
        Alert.alert('Lỗi chọn giờ', 'Thời gian trả máy phải sau thời gian bắt đầu.');
        return;
      }
      if (date < now) {
        Alert.alert('Lỗi chọn giờ', 'Thời gian trả máy không được nằm trong quá khứ.');
        return;
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
    return `${pad(d.getDate())}/${pad(d.getMonth()+1)}/${d.getFullYear()} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
  };

  if (loading) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color="#38BDF8" />
        <Text style={styles.loadingText}>Loading booking details...</Text>
      </View>
    );
  }

  if (!device) {
    return (
      <View style={styles.centerContainer}>
        <Ionicons name="alert-circle-outline" size={48} color="#EF4444" />
        <Text style={styles.errorTitle}>Device not found</Text>
        <TouchableOpacity style={styles.backBtn} onPress={onBack}>
          <Text style={styles.backBtnText}>Back to Device</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const rentalDays = calculateDays();
  const rentalFee = rentalDays * device.dailyRate;
  const totalAmount = rentalFee + (device.depositValue || 0);

  const handleConfirm = () => {
    if (!startDate || !endDate) {
      Alert.alert('Missing Dates', 'Please select a start and end date for your rental.');
      return;
    }
    Alert.alert('Booking Confirmed', 'Your booking request has been submitted!', [
      { text: 'OK', onPress: onBack }
    ]);
  };

  return (
    <View style={styles.root}>
      <StatusBar barStyle="light-content" backgroundColor="#070B13" />

      {/* Top Header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.headerBtn} onPress={onBack}>
          <Ionicons name="chevron-back" size={22} color="#FFFFFF" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Create Booking</Text>
        <View style={{ width: 36 }} />
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent}>
        {/* Device Summary */}
        <View style={styles.deviceCard}>
          <Text style={styles.deviceTitle} numberOfLines={1}>{device.title}</Text>
          <Text style={styles.deviceBrand}>{device.brand} • {device.category}</Text>
          <Text style={styles.dailyRate}>{formatPrice(device.dailyRate)} / day</Text>
        </View>

        {/* Date Picker Section */}
        <View style={styles.sectionContainer}>
          <Text style={styles.sectionTitle}>Select Rental Period</Text>
          
          <View style={styles.dateSummary}>
            <TouchableOpacity style={styles.dateBox} onPress={() => openPicker('start')} activeOpacity={0.7}>
              <Text style={styles.dateLabel}>Start Date & Time</Text>
              <Text style={styles.dateValue}>{startDate ? formatDateTime(startDate) : 'Select'}</Text>
            </TouchableOpacity>
            <Ionicons name="arrow-forward" size={20} color="#94A3B8" />
            <TouchableOpacity style={styles.dateBox} onPress={() => openPicker('end')} activeOpacity={0.7}>
              <Text style={styles.dateLabel}>End Date & Time</Text>
              <Text style={styles.dateValue}>{endDate ? formatDateTime(endDate) : 'Select'}</Text>
            </TouchableOpacity>
          </View>
        </View>

        <CustomDateTimePicker 
          visible={pickerConfig.visible}
          type={pickerConfig.type}
          initialDate={pickerConfig.type === 'start' ? startDate : endDate}
          minDate={pickerConfig.type === 'end' ? startDate : new Date()}
          onClose={() => setPickerConfig({ ...pickerConfig, visible: false })}
          onConfirm={handleConfirmPicker}
        />

        {/* Price Breakdown */}
        {rentalDays > 0 && (
          <View style={styles.sectionContainer}>
            <Text style={styles.sectionTitle}>Price Breakdown</Text>
            
            <View style={styles.priceRow}>
              <Text style={styles.priceLabel}>Rental Fee ({rentalDays} days)</Text>
              <Text style={styles.priceValue}>{formatPrice(rentalFee)}</Text>
            </View>
            <View style={styles.priceRow}>
              <Text style={styles.priceLabel}>Security Deposit</Text>
              <Text style={styles.priceValue}>{formatPrice(device.depositValue || 0)}</Text>
            </View>
            
            <View style={styles.divider} />
            
            <View style={styles.priceRow}>
              <Text style={styles.totalLabel}>Total Payment</Text>
              <Text style={styles.totalValue}>{formatPrice(totalAmount)}</Text>
            </View>
          </View>
        )}
      </ScrollView>

      {/* Bottom Sticky Action Bar */}
      <View style={styles.bottomBar}>
        <View>
          <Text style={styles.bottomPriceSub}>Total amount</Text>
          <Text style={styles.bottomPriceMain}>
            {rentalDays > 0 ? formatPrice(totalAmount) : '---'}
          </Text>
        </View>

        <TouchableOpacity
          style={[styles.confirmBtn, (!startDate || !endDate) && styles.confirmBtnDisabled]}
          onPress={handleConfirm}
          disabled={!startDate || !endDate}
          activeOpacity={0.8}
        >
          <Text style={styles.confirmBtnText}>Confirm Booking</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const getLocalYMD = (d: Date) => {
  const offset = d.getTimezoneOffset();
  const adjusted = new Date(d.getTime() - (offset * 60 * 1000));
  return adjusted.toISOString().split('T')[0];
};

const hoursList = Array.from({length: 24}, (_, i) => i.toString().padStart(2, '0'));
const minutesList = Array.from({length: 60}, (_, i) => i.toString().padStart(2, '0'));

const TimeScrollPicker = ({ items, selectedValue, onValueChange, visible }: any) => {
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
        flatListRef.current?.scrollTo({ y: targetIndex * ITEM_HEIGHT, animated: false });
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
      <View style={{ position: 'absolute', top: ITEM_HEIGHT, width: '100%', height: ITEM_HEIGHT, backgroundColor: 'rgba(56, 189, 248, 0.1)', borderRadius: 8, borderWidth: 1, borderColor: 'rgba(56, 189, 248, 0.3)' }} pointerEvents="none" />
      
      <View style={{ flex: 1, overflow: 'hidden' }}>
        <React.Fragment>
          {/* using standard ScrollView like before but with massive content to prevent FlatList render bugs on Web */}
          <ScrollView
            ref={flatListRef as any}
            showsVerticalScrollIndicator={false}
            snapToInterval={ITEM_HEIGHT}
            decelerationRate="fast"
            onMomentumScrollEnd={handleScroll}
            onScrollEndDrag={handleScroll}
            scrollEventThrottle={16}
            contentContainerStyle={{ paddingVertical: ITEM_HEIGHT }}
          >
            {data.map((item: string, idx: number) => {
              const isSelected = item === selectedValue;
              // Only highlight the item if it's the one we are physically scrolled to, or if it matches value.
              // To be performant, we just match value
              return (
                <View key={idx} style={{ height: ITEM_HEIGHT, justifyContent: 'center', alignItems: 'center' }}>
                  <Text style={{ 
                    fontSize: isSelected ? 22 : 16, 
                    color: isSelected ? '#38BDF8' : '#64748B', 
                    fontWeight: isSelected ? '700' : '500' 
                  }}>
                    {item}
                  </Text>
                </View>
              );
            })}
          </ScrollView>
        </React.Fragment>
      </View>
    </View>
  );
};

const CustomDateTimePicker = ({ visible, type, initialDate, minDate, onClose, onConfirm }: any) => {
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
    onConfirm(finalDate);
  };

  const currentDateStr = getLocalYMD(date);
  const minDateStr = minDate ? getLocalYMD(minDate) : undefined;

  return (
    <Modal visible={visible} transparent animationType="fade">
      <View style={styles.modalOverlay}>
        <View style={styles.modalContent}>
          <Text style={styles.modalTitle}>
            {type === 'start' ? 'Start Date & Time' : 'End Date & Time'}
          </Text>

          <Calendar
            current={currentDateStr}
            minDate={minDateStr}
            onDayPress={(day: any) => setDate(new Date(day.timestamp))}
            markedDates={{
              [currentDateStr]: { selected: true, selectedColor: '#2563EB' }
            }}
            theme={{
              backgroundColor: '#1E293B',
              calendarBackground: '#1E293B',
              textSectionTitleColor: '#94A3B8',
              selectedDayBackgroundColor: '#2563EB',
              selectedDayTextColor: '#ffffff',
              todayTextColor: '#38BDF8',
              dayTextColor: '#F1F5F9',
              textDisabledColor: '#334155',
              monthTextColor: '#FFFFFF',
              arrowColor: '#38BDF8',
            }}
          />

          <View style={styles.timeContainer}>
            <Text style={styles.timeLabel}>Time:</Text>
            <View style={styles.timeInputRow}>
              <TimeScrollPicker items={hoursList} selectedValue={hours} onValueChange={setHours} visible={visible} />
              <Text style={styles.timeColon}>:</Text>
              <TimeScrollPicker items={minutesList} selectedValue={minutes} onValueChange={setMinutes} visible={visible} />
            </View>
          </View>

          <View style={styles.modalActions}>
            <TouchableOpacity style={styles.modalBtnCancel} onPress={onClose}>
              <Text style={styles.modalBtnTextCancel}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.modalBtnConfirm} onPress={handleConfirm}>
              <Text style={styles.modalBtnTextConfirm}>Confirm</Text>
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
    backgroundColor: '#070B13',
  },
  centerContainer: {
    flex: 1,
    backgroundColor: '#070B13',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  loadingText: {
    color: '#94A3B8',
    marginTop: 12,
    fontSize: 14,
  },
  errorTitle: {
    color: '#EF4444',
    fontSize: 16,
    fontWeight: '700',
    marginTop: 12,
    marginBottom: 16,
  },
  backBtn: {
    backgroundColor: '#2563EB',
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
    paddingVertical: 10,
    backgroundColor: '#0F172A',
    borderBottomWidth: 1,
    borderBottomColor: '#1E293B',
  },
  headerBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#1E293B',
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  scrollContent: {
    paddingBottom: 100,
  },
  deviceCard: {
    margin: 16,
    padding: 16,
    backgroundColor: '#0F172A',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#1E293B',
  },
  deviceTitle: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '700',
    marginBottom: 4,
  },
  deviceBrand: {
    color: '#94A3B8',
    fontSize: 13,
    textTransform: 'uppercase',
    marginBottom: 8,
  },
  dailyRate: {
    color: '#38BDF8',
    fontSize: 15,
    fontWeight: '600',
  },
  sectionContainer: {
    marginHorizontal: 16,
    marginBottom: 20,
    padding: 16,
    backgroundColor: '#0F172A',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#1E293B',
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#FFFFFF',
    marginBottom: 16,
  },
  dateSummary: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 16,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: '#1E293B',
  },
  dateBox: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 12,
    backgroundColor: 'rgba(37, 99, 235, 0.1)',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: 'rgba(37, 99, 235, 0.3)',
  },
  dateLabel: {
    color: '#94A3B8',
    fontSize: 12,
    marginBottom: 4,
  },
  dateValue: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
  },
  priceRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  priceLabel: {
    color: '#94A3B8',
    fontSize: 14,
  },
  priceValue: {
    color: '#F1F5F9',
    fontSize: 14,
    fontWeight: '500',
  },
  divider: {
    height: 1,
    backgroundColor: '#1E293B',
    marginVertical: 12,
  },
  totalLabel: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '700',
  },
  totalValue: {
    color: '#38BDF8',
    fontSize: 18,
    fontWeight: '800',
  },
  bottomBar: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: '#0F172A',
    borderTopWidth: 1,
    borderTopColor: '#1E293B',
    paddingHorizontal: 16,
    paddingVertical: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  bottomPriceSub: {
    fontSize: 12,
    color: '#94A3B8',
  },
  bottomPriceMain: {
    fontSize: 20,
    fontWeight: '800',
    color: '#38BDF8',
  },
  confirmBtn: {
    backgroundColor: '#2563EB',
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 12,
  },
  confirmBtnDisabled: {
    backgroundColor: '#1E293B',
  },
  confirmBtnText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '700',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    justifyContent: 'center',
    padding: 20,
  },
  modalContent: {
    backgroundColor: '#1E293B',
    borderRadius: 16,
    padding: 20,
    borderWidth: 1,
    borderColor: '#334155',
  },
  modalTitle: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 16,
    textAlign: 'center',
  },
  timeContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 20,
    marginBottom: 20,
  },
  timeLabel: {
    color: '#94A3B8',
    fontSize: 16,
    marginRight: 12,
  },
  timeInputRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  timeColon: {
    color: '#94A3B8',
    fontSize: 24,
    fontWeight: '700',
    marginHorizontal: 12,
  },
  modalActions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 12,
  },
  modalBtnCancel: {
    flex: 1,
    backgroundColor: '#334155',
    paddingVertical: 12,
    borderRadius: 10,
    alignItems: 'center',
  },
  modalBtnTextCancel: {
    color: '#FFFFFF',
    fontWeight: '600',
    fontSize: 15,
  },
  modalBtnConfirm: {
    flex: 1,
    backgroundColor: '#2563EB',
    paddingVertical: 12,
    borderRadius: 10,
    alignItems: 'center',
  },
  modalBtnTextConfirm: {
    color: '#FFFFFF',
    fontWeight: '600',
    fontSize: 15,
  },
});
