import React, { useEffect } from 'react';
import { LogBox, StatusBar } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { Provider, useDispatch, useSelector } from 'react-redux';
import { RootNavigator } from './src/navigation/RootNavigator';
import { RootState, store } from './src/store';
import {
  fetchNotifications,
  fetchUnreadCount,
  receiveRealtimeNotification,
} from './src/store/slices/notificationSlice';
import { socketService } from './src/services/socketService';
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

  useEffect(() => {
    if (!isAuthenticated || !user?.id) {
      socketService.disconnect();
      return;
    }

    socketService.connect(user.id);
    dispatch(fetchUnreadCount() as any);
    dispatch(fetchNotifications(undefined) as any);

    const unsubscribe = socketService.onNewNotification((notification) => {
      dispatch(receiveRealtimeNotification(notification));
    });

    return () => {
      unsubscribe();
      socketService.disconnect();
    };
  }, [dispatch, isAuthenticated, user?.id]);

  return <RootNavigator />;
}
