/**
 * App.tsx — Root entry point của TechShare Mobile App
 *
 * Kiến trúc điều hướng:
 * - React Navigation 7 với Role-Based Conditional Routing (RootNavigator)
 * - Khách/Chưa đăng nhập: AuthStackNavigator (Login / Register)
 * - Quản trị viên (Role === 'admin'): AdminDrawerNavigator (Left Drawer, Không có Bottom Tab)
 * - Người dùng/Chủ máy (Role !== 'admin'): MainBottomTabNavigator (4 Bottom Tabs)
 *
 * Theme: Tuân thủ 100% theme-skill.md (src/constants/theme.ts)
 */

import React, { useEffect } from 'react';
import { StatusBar, LogBox } from 'react-native';

LogBox.ignoreLogs(['Require cycle:']);
import { SafeAreaProvider } from 'react-native-safe-area-context';
import React, { useEffect, useState, useMemo } from 'react';
import {
  StyleSheet,
  View,
  StatusBar,
  BackHandler,
} from 'react-native';
import {
  SafeAreaProvider,
  useSafeAreaInsets,
} from 'react-native-safe-area-context';
import { Provider, useDispatch, useSelector } from 'react-redux';
import { store, RootState } from './src/store';
import { theme } from './src/constants/theme';
import { RootNavigator } from './src/navigation/RootNavigator';
import { socketService } from './src/services/socketService';
import {
  fetchUnreadCount,
  fetchNotifications,
  receiveRealtimeNotification,
} from './src/store/slices/notificationSlice';

// ─── Types ────────────────────────────────────────────────────────────────────
export type { ScreenType } from './src/types';

// ── Screens ──────────────────────────────────────────────────────────────────
import { HomeScreen } from './src/screens/home/HomeScreen';
import { DeviceDetailScreen } from './src/screens/device/DeviceDetailScreen';
import { PostDeviceScreen } from './src/screens/device/PostDeviceScreen';
import { LoginScreen } from './src/screens/auth/LoginScreen';
import { RegisterScreen } from './src/screens/auth/RegisterScreen';
import { ProfileScreen } from './src/screens/user/ProfileScreen';
import { MyDevicesScreen } from './src/screens/user/MyDevicesScreen';
import { BookingCreateScreen } from './src/screens/booking/BookingCreateScreen';
import { MyBookingsScreen } from './src/screens/booking/MyBookingsScreen';
import { MapScreen } from './src/screens/map/MapScreen';
import { OwnerDashboardScreen } from './src/screens/owner/OwnerDashboardScreen';
import { AdminDashboardScreen } from './src/screens/admin/AdminDashboardScreen';

// ── Navigation Components ─────────────────────────────────────────────────────
import { BottomTabNavigator } from './src/components/navigation/BottomTabNavigator';

// ─── Types ────────────────────────────────────────────────────────────────────

export type ScreenType =
  | 'home'
  | 'bookings'
  | 'map'
  | 'postDevice'
  | 'myDevices'
  | 'owner'
  | 'admin'
  | 'login'
  | 'register'
  | 'profile';

/** Các tab xuất hiện trên Bottom Tab Bar */
const BOTTOM_TAB_SCREENS: ScreenType[] = ['home', 'bookings', 'map', 'profile'];

const ReduxProvider = Provider as any;

// ─── Root Component ───────────────────────────────────────────────────────────

export default function App() {
  return (
    <ReduxProvider store={store}>
      <SafeAreaProvider>
        <StatusBar barStyle="dark-content" backgroundColor={theme.card} />
        <AppContent />
      </SafeAreaProvider>
    </ReduxProvider>
  );
}

// ─── AppContent Lifecycle & Socket Manager ────────────────────────────────────

function AppContent() {
  const dispatch = useDispatch();
  const { isAuthenticated, user } = useSelector((state: RootState) => state.auth);

  // Kết nối Socket.IO và nạp thông báo khi người dùng đăng nhập
  useEffect(() => {
    if (isAuthenticated && user?.id) {
      socketService.connect(user.id);
      dispatch(fetchUnreadCount() as any);
      dispatch(fetchNotifications(undefined) as any);

      const unsubscribe = socketService.onNewNotification((notification) => {
        dispatch(receiveRealtimeNotification(notification));
      });
      return unsubscribe;
  // Active tab cho BottomTabNavigator — login/register/admin/owner map về tab profile
  const activeTab: ScreenType = useMemo(() => {
    if (
      effectiveScreen === 'login' ||
      effectiveScreen === 'register' ||
      effectiveScreen === 'admin' ||
      effectiveScreen === 'myDevices' ||
      effectiveScreen === 'owner'
    ) {
      return 'profile';
    }
    if (BOTTOM_TAB_SCREENS.includes(effectiveScreen)) {
      return effectiveScreen;
    }
    return 'home';
  }, [effectiveScreen]);

  useEffect(() => {
    if (effectiveScreen !== 'myDevices') return;

    const subscription = BackHandler.addEventListener('hardwareBackPress', () => {
      setCurrentScreen('profile');
      return true;
    });
    return () => subscription.remove();
  }, [effectiveScreen]);

  // Ẩn Bottom Tab khi xem chi tiết hoặc đặt thuê
  const showBottomTab =
    selectedDeviceId === null && bookingDeviceId === null;

  // ── Handlers ────────────────────────────────────────────────────────────────

  const handleNavigateToDeviceDetail = (deviceId: string) => {
    setSelectedDeviceId(deviceId);
  };

  const handleBackFromDetail = () => setSelectedDeviceId(null);

  const goToLogin = () => setCurrentScreen('login');
  const goToHome = () => setCurrentScreen('home');
  const goToPostDevice = () => setCurrentScreen('postDevice');

  const handleLogout = () => {
    dispatch(clearAuth());
    setCurrentScreen('home');
    setSelectedDeviceId(null);
  };

  const handleTabPress = (tab: ScreenType) => {
    if (tab === 'profile' && !isAuthenticated) {
      setCurrentScreen('login');
    } else {
      socketService.disconnect();
    }
  }, [isAuthenticated, user?.id, dispatch]);

  return <RootNavigator />;
  /**
   * Sau khi LoginScreen/RegisterScreen xác thực thành công,
   * điều hướng dựa trên role của user vừa được lưu vào Redux.
   * Nhận `role` từ response API (tránh phụ thuộc vào Redux timing).
   */
  const handleNavigateAfterAuth = (role?: string) => {
    const normalizedRole = role?.toLowerCase();

    if (normalizedRole === 'admin') {
      setCurrentScreen('admin');
    } else if (normalizedRole === 'owner') {
      setCurrentScreen('owner');
    } else {
      setCurrentScreen('home');
    }
  };

  const handlePressChat = () => {
    // TODO: navigate to ChatListScreen khi Nhật implement
    console.log('[Nav] Chat pressed');
  };

  const handlePressNotifications = () => {
    // TODO: navigate to NotificationScreen khi Nhật implement
    console.log('[Nav] Notifications pressed');
  };

  // ── Render ───────────────────────────────────────────────────────────────────

  return (
    <View style={[styles.root, { paddingTop: insets.top }]}>
      <StatusBar
        barStyle="dark-content"
        backgroundColor={theme.card}
      />

      {/* ── Màn hình nội dung ── */}
      <View style={styles.screenContainer}>
        {bookingDeviceId ? (
          <BookingCreateScreen
            deviceId={bookingDeviceId}
            onBack={() => setBookingDeviceId(null)}
          />
        ) : selectedDeviceId ? (
          <DeviceDetailScreen
            deviceId={selectedDeviceId}
            onBack={handleBackFromDetail}
            onBookNow={(id) => setBookingDeviceId(id)}
          />
        ) : (
          <>
            {effectiveScreen === 'home' && (
              <HomeScreen
                onNavigateToDeviceDetail={handleNavigateToDeviceDetail}
                onNavigateToSearch={() => console.log('[Nav] Search')}
                onNavigateToNotifications={handlePressNotifications}
                onNavigateToChat={handlePressChat}
                unreadMessages={2}
                unreadNotifications={5}
              />
            )}

            {effectiveScreen === 'bookings' && (
              <MyBookingsScreen
                onNavigateToDeviceDetail={handleNavigateToDeviceDetail}
                onNavigateToHome={goToHome}
              />
            )}

            {effectiveScreen === 'map' && (
              <MapScreen
                onNavigateToDeviceDetail={handleNavigateToDeviceDetail}
                onNavigateToHome={goToHome}
              />
            )}

            {effectiveScreen === 'postDevice' && (
              <PostDeviceScreen onBack={goToHome} onPublished={goToHome} />
            )}

            {effectiveScreen === 'owner' && (
              <OwnerDashboardScreen
                onBackToHome={goToHome}
                onNavigateToDeviceDetail={handleNavigateToDeviceDetail}
              />
            )}

            {effectiveScreen === 'admin' && (
              <AdminDashboardScreen onBackToHome={goToHome} />
            )}

            {effectiveScreen === 'login' && (
              <LoginScreen
                onNavigateToRegister={() => setCurrentScreen('register')}
                onNavigateToHome={handleNavigateAfterAuth}
              />
            )}

            {effectiveScreen === 'register' && (
              <RegisterScreen
                onNavigateToLogin={() => setCurrentScreen('login')}
                onRegisterSuccess={handleNavigateAfterAuth}
              />
            )}

            {effectiveScreen === 'profile' && (
              <ProfileScreen
                onLogout={handleLogout}
                onNavigateToLogin={goToLogin}
                onNavigateToPostDevice={goToPostDevice}
                onNavigateToMyDevices={() => setCurrentScreen('myDevices')}
                onNavigateToOwnerDashboard={() => setCurrentScreen('owner')}
                onNavigateToAdminDashboard={() => setCurrentScreen('admin')}
              />
            )}
            {effectiveScreen === 'myDevices' && (
              <MyDevicesScreen onBack={() => setCurrentScreen('profile')} />
            )}
          </>
        )}
      </View>

      {/* ── Bottom Tab Navigator ── */}
      {showBottomTab && (
        <BottomTabNavigator
          activeTab={activeTab}
          onTabPress={handleTabPress}
          safeAreaBottom={insets.bottom}
          pendingBookingsCount={0} // TODO: wire to Redux bookings state
        />
      )}
    </View>
  );
}
