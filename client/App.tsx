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
    } else {
      socketService.disconnect();
    }
  }, [isAuthenticated, user?.id, dispatch]);

  return <RootNavigator />;
}
