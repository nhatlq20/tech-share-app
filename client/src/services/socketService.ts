import { io, Socket } from 'socket.io-client';
import { API_BASE_URL } from '../config/api';
import { Notification } from '../types';

let socket: Socket | null = null;
let currentUserId: string | null = null;
type NotificationListener = (notification: Notification) => void;
let notificationListeners: NotificationListener[] = [];

export const socketService = {
  /**
   * Đăng ký nhận thông báo realtime từ socket
   */
  onNewNotification: (listener: NotificationListener) => {
    notificationListeners.push(listener);
    return () => {
      notificationListeners = notificationListeners.filter(l => l !== listener);
    };
  },

  /**
   * Kết nối tới Socket.IO Server và gia nhập room của user
   */
  connect: (userId: string) => {
    if (!userId) return;

    if (socket?.connected && currentUserId === userId) {
      return;
    }

    // Nếu đổi user thì ngắt kết nối cũ
    if (socket) {
      socket.disconnect();
      socket = null;
    }

    currentUserId = userId;
    const socketUrl = API_BASE_URL.replace(/\/api\/?$/, '');

    try {
      socket = io(socketUrl, {
        transports: ['websocket', 'polling'],
        reconnection: true,
        reconnectionAttempts: 10,
        reconnectionDelay: 2000,
        timeout: 10000,
      });

      socket.on('connect', () => {
        console.log(`⚡ [Socket.IO Client] Đã kết nối server (${socket?.id})`);
        socket?.emit('join_user', userId);
      });

      socket.on('new_notification', (notification: Notification) => {
        console.log('🔔 [Socket.IO Client] Nhận thông báo mới:', notification.title);
        notificationListeners.forEach(listener => {
          try {
            listener(notification);
          } catch (e) {
            console.warn('Listener error in socketService:', e);
          }
        });
      });

      socket.on('disconnect', (reason) => {
        console.log('🔌 [Socket.IO Client] Đã ngắt kết nối:', reason);
      });

      socket.on('connect_error', (error) => {
        console.warn('⚠️ [Socket.IO Client] Lỗi kết nối:', error.message);
      });
    } catch (error: any) {
      console.warn('⚠️ [Socket.IO Client] Không thể khởi tạo socket:', error.message);
    }
  },

  /**
   * Rời room và ngắt kết nối socket khi đăng xuất
   */
  disconnect: () => {
    if (socket) {
      if (currentUserId) {
        socket.emit('leave_user', currentUserId);
      }
      socket.disconnect();
      socket = null;
      currentUserId = null;
      console.log('⏹️ [Socket.IO Client] Đã ngắt kết nối socket');
    }
  },

  /**
   * Kiểm tra trạng thái kết nối
   */
  isConnected: (): boolean => {
    return socket?.connected ?? false;
  },
};

export default socketService;
