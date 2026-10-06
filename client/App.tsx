import React, { useEffect, useState } from 'react';
import { LogBox, StatusBar } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { Provider, useDispatch, useSelector } from 'react-redux';
import { RootNavigator, rootNavigationRef } from './src/navigation/RootNavigator';
import { RootState, store } from './src/store';
import {
  fetchNotifications,
  fetchUnreadCount,
  receiveRealtimeNotification,
} from './src/store/slices/notificationSlice';
import { fetchWishlist, clearWishlist } from './src/store/slices/wishlistSlice';
import { socketService } from './src/services/socketService';
import { wishlistService } from './src/services/wishlistService';
import { InAppNotificationBanner } from './src/components/common/InAppNotificationBanner';
import { Notification } from './src/types';
import { theme } from './src/constants/theme';

LogBox.ignoreLogs(['Require cycle:']);

const ReduxProvider = Provider as any;

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

function AppContent() {
  const dispatch = useDispatch();
  const { isAuthenticated, user } = useSelector((state: RootState) => state.auth);
  const [activeBannerNotif, setActiveBannerNotif] = useState(null as Notification | null);

  const userId = user?.id || (user as any)?._id;

  useEffect(() => {
    if (!isAuthenticated || !userId) {
      socketService.disconnect();
      wishlistService.clearCache();
      dispatch(clearWishlist());
      return;
    }

    socketService.connect(userId);
    dispatch(fetchUnreadCount() as any);
    dispatch(fetchNotifications(undefined) as any);
    dispatch(fetchWishlist() as any);

    const unsubscribe = socketService.onNewNotification((notification) => {
      // 1. Cập nhật Redux store: thêm thông báo và tăng unreadCount nhảy số ngay lập tức
      dispatch(receiveRealtimeNotification(notification));

      // 2. Hiển thị banner thông báo nổi (floating toast) ở trên cùng màn hình
      setActiveBannerNotif(notification);
    });

    return () => {
      unsubscribe();
      socketService.disconnect();
    };
  }, [dispatch, isAuthenticated, userId]);

  const handleBannerPress = (notif: Notification) => {
    setActiveBannerNotif(null);
    if (rootNavigationRef.isReady()) {
      rootNavigationRef.navigate('Notification');
    }
  };

  return (
    <>
      <RootNavigator />
      <InAppNotificationBanner
        notification={activeBannerNotif}
        onPress={handleBannerPress}
        onDismiss={() => setActiveBannerNotif(null)}
      />
    </>
  );
}

