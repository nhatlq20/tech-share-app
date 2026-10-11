import React, { useEffect, useState, useRef } from 'react';
import { LogBox, StatusBar } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { Provider, useDispatch, useSelector } from 'react-redux';
import { RootNavigator, rootNavigationRef } from './src/navigation/RootNavigator';
import { RootState, store } from './src/store';
import {
  fetchNotifications,
  fetchUnreadCount,
  syncNotificationsFromFirebase,
} from './src/store/slices/notificationSlice';
import { fetchWishlist, clearWishlist } from './src/store/slices/wishlistSlice';
import { socketService } from './src/services/socketService';
import { firebaseNotificationService } from './src/services/firebaseNotificationService';
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
  const knownNotificationIds = useRef(new Set<string>());
  const isInitialFirebaseLoad = useRef(true);

  useEffect(() => {
    if (!isAuthenticated || !userId) {
      socketService.disconnect();
      wishlistService.clearCache();
      dispatch(clearWishlist());
      return;
    }

    // Reset tracking khi user thay đổi
    isInitialFirebaseLoad.current = true;
    knownNotificationIds.current.clear();

    // 1. Lắng nghe thông báo thời gian thực từ Firebase Firestore
    const unsubscribeFirebase = firebaseNotificationService.subscribeUserNotifications(
      String(userId),
      (notifications) => {
        if (isInitialFirebaseLoad.current) {
          notifications.forEach((n) => knownNotificationIds.current.add(String(n._id)));
          isInitialFirebaseLoad.current = false;
        } else {
          // Bắt thông báo mới tinh chưa đọc để hiển thị banner toast nổi
          const newUnread = notifications.find(
            (n) => !n.isRead && !knownNotificationIds.current.has(String(n._id))
          );
          if (newUnread) {
            setActiveBannerNotif(newUnread);
          }
          notifications.forEach((n) => knownNotificationIds.current.add(String(n._id)));
        }

        // Cập nhật Redux store với danh sách thông báo mới nhất từ Firebase
        dispatch(syncNotificationsFromFirebase(notifications));
      }
    );

    // 2. Tải dữ liệu ban đầu
    dispatch(fetchUnreadCount() as any);
    dispatch(fetchNotifications(undefined) as any);
    dispatch(fetchWishlist() as any);

    return () => {
      unsubscribeFirebase();
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

