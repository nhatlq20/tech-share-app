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
  
  const [startDate, setStartDate] = useState(null as string | null);
  const [endDate, setEndDate] = useState(null as string | null);
  
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

  const onDayPress = (day: any) => {
    const dateString = day.dateString;
    
    if (!startDate || (startDate && endDate)) {
      // Start a new range
      setStartDate(dateString);
      setEndDate(null);
    } else if (startDate && !endDate) {
      // Select end date
      const start = new Date(startDate);
      const current = new Date(dateString);
      
      if (current < start) {
        // If selected date is before start date, make it the new start date
        setStartDate(dateString);
      } else {
        setEndDate(dateString);
      }
    }
  };

  const generateMarkedDates = () => {
    const marked: any = {};
    if (startDate) {
      marked[startDate] = {
        startingDay: true,
        color: '#2563EB',
        textColor: 'white',
        endingDay: !endDate, // if no end date, it's also ending day to make it rounded
      };
    }
    
    if (startDate && endDate) {
      let curr = new Date(startDate);
      const end = new Date(endDate);
      curr.setDate(curr.getDate() + 1);
      
      while (curr < end) {
        const dStr = curr.toISOString().split('T')[0];
        marked[dStr] = {
          color: 'rgba(37, 99, 235, 0.2)',
          textColor: '#FFFFFF',
        };
        curr.setDate(curr.getDate() + 1);
      }
      
      marked[endDate] = {
        endingDay: true,
        color: '#2563EB',
        textColor: 'white',
      };
    }
    
    return marked;
  };

  const calculateDays = () => {
    if (!startDate || !endDate) return 0;
    const start = new Date(startDate);
    const end = new Date(endDate);
    const diffTime = Math.abs(end.getTime() - start.getTime());
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1; // inclusive of start and end day
    return diffDays;
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
          
          <Calendar
            markingType={'period'}
            markedDates={generateMarkedDates()}
            onDayPress={onDayPress}
            theme={{
              backgroundColor: '#0F172A',
              calendarBackground: '#0F172A',
              textSectionTitleColor: '#94A3B8',
              selectedDayBackgroundColor: '#2563EB',
              selectedDayTextColor: '#ffffff',
              todayTextColor: '#38BDF8',
              dayTextColor: '#F1F5F9',
              textDisabledColor: '#334155',
              monthTextColor: '#FFFFFF',
              indicatorColor: '#38BDF8',
              textDayFontWeight: '500',
              textMonthFontWeight: 'bold',
              textDayHeaderFontWeight: '600',
              textDayFontSize: 14,
              textMonthFontSize: 16,
              textDayHeaderFontSize: 13
            }}
            minDate={new Date().toISOString().split('T')[0]}
          />
          
          <View style={styles.dateSummary}>
            <View style={styles.dateBox}>
              <Text style={styles.dateLabel}>Start Date</Text>
              <Text style={styles.dateValue}>{startDate || 'Select'}</Text>
            </View>
            <Ionicons name="arrow-forward" size={20} color="#94A3B8" />
            <View style={styles.dateBox}>
              <Text style={styles.dateLabel}>End Date</Text>
              <Text style={styles.dateValue}>{endDate || 'Select'}</Text>
            </View>
          </View>
        </View>

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
});
