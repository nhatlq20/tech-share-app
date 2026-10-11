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
  receiveRealtimeNotification,
  incrementUnreadMessages,
  markItemAsRead,
  markNotificationRead,
} from './src/store/slices/notificationSlice';
import { fetchWishlist, clearWishlist } from './src/store/slices/wishlistSlice';
import { socketService } from './src/services/socketService';
import { firebaseNotificationService } from './src/services/firebaseNotificationService';
import { wishlistService } from './src/services/wishlistService';
import { InAppNotificationBanner } from './src/components/common/InAppNotificationBanner';
import { Notification } from './src/types';
import { theme } from './src/constants/theme';
import { STRINGS } from './src/constants/strings';

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

    const uid = String(userId);

    // 1. Kết nối Socket.IO
    socketService.connect(uid);

    // Reset tracking khi user thay đổi
    isInitialFirebaseLoad.current = true;
    knownNotificationIds.current.clear();

    // 2. Lắng nghe thông báo thời gian thực từ Firebase Firestore
    const unsubscribeFirebase = firebaseNotificationService.subscribeUserNotifications(
      uid,
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
            const activeBookingId = socketService.getActiveBookingId();
            if (newUnread.type !== 'message' || String(newUnread.relatedId) !== String(activeBookingId)) {
              setActiveBannerNotif(newUnread);
            }
          }
          notifications.forEach((n) => knownNotificationIds.current.add(String(n._id)));
        }

        // Cập nhật Redux store với danh sách thông báo mới nhất từ Firebase
        dispatch(syncNotificationsFromFirebase(notifications));
      }
    );

    // 3. Lắng nghe thông báo realtime từ Socket.IO
    const unsubscribeSocketNotif = socketService.onNewNotification((notification) => {
      dispatch(receiveRealtimeNotification(notification));
      const notifId = String(notification._id);
      if (!knownNotificationIds.current.has(notifId)) {
        knownNotificationIds.current.add(notifId);
        const activeBookingId = socketService.getActiveBookingId();
        if (notification.type !== 'message' || String(notification.relatedId) !== String(activeBookingId)) {
          setActiveBannerNotif(notification);
        }
      }
    });

    // 4. Lắng nghe tin nhắn mới từ Socket.IO realtime
    const unsubscribeSocketMsg = socketService.onNewMessage((msg) => {
      const isFromOther = String(msg.senderId) !== uid;
      if (isFromOther) {
        dispatch(incrementUnreadMessages());

        const activeBookingId = socketService.getActiveBookingId();
        if (String(activeBookingId) !== String(msg.bookingId)) {
          const fakeNotifId = `msg_${msg._id}`;
          if (!knownNotificationIds.current.has(fakeNotifId)) {
            knownNotificationIds.current.add(fakeNotifId);
            let bodyText = msg.text || '';
            if (msg.messageType === 'image' || msg.mediaUrl) {
              bodyText = 'Sent a photo attachment.';
            } else if (msg.messageType === 'location' || msg.locationData) {
              bodyText = 'Shared GPS location.';
            }

            setActiveBannerNotif({
              _id: fakeNotifId,
              recipient: uid,
              title: STRINGS.CHAT.INCOMING_MESSAGE_TITLE || 'New Message',
              body: bodyText || 'You received a new message.',
              type: 'message',
              relatedId: msg.bookingId,
              data: { bookingId: msg.bookingId },
              isRead: false,
              createdAt: msg.createdAt || new Date().toISOString(),
            });
          }
        }
      }
    });

    // 5. Tải dữ liệu ban đầu
    dispatch(fetchUnreadCount() as any);
    dispatch(fetchNotifications(undefined) as any);
    dispatch(fetchWishlist() as any);

    return () => {
      unsubscribeFirebase();
      unsubscribeSocketNotif();
      unsubscribeSocketMsg();
      socketService.disconnect();
    };
  }, [dispatch, isAuthenticated, userId]);

  const handleBannerPress = (notif: Notification) => {
    setActiveBannerNotif(null);
    if (!notif.isRead) {
      dispatch(markItemAsRead(notif._id));
      dispatch(markNotificationRead(notif._id) as any);
    }
    if (rootNavigationRef.isReady()) {
      if (notif.type === 'message' && (notif.relatedId || notif.data?.bookingId)) {
        const targetBookingId = String(notif.relatedId || notif.data?.bookingId);
        rootNavigationRef.navigate('ChatDetail', { bookingId: targetBookingId });
      } else {
        rootNavigationRef.navigate('Notification');
      }
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

