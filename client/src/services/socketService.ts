import { io, Socket } from 'socket.io-client';
import { API_BASE_URL } from '../config/api';
import { Notification, ChatMessage } from '../types';

let socket: Socket | null = null;
let currentUserId: string | null = null;
let activeBookingId: string | null = null;

type NotificationListener = (notification: Notification) => void;
type MessageListener = (message: ChatMessage) => void;

let notificationListeners: NotificationListener[] = [];
let messageListeners: MessageListener[] = [];

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
   * Đăng ký nhận tin nhắn chat realtime từ socket
   */
  onNewMessage: (listener: MessageListener) => {
    messageListeners.push(listener);
    return () => {
      messageListeners = messageListeners.filter(l => l !== listener);
    };
  },

  /**
   * Gia nhập room chat của đơn thuê cụ thể
   */
  joinChat: (bookingId: string) => {
    if (!bookingId) return;
    activeBookingId = bookingId;
    if (socket?.connected) {
      socket.emit('join_chat', bookingId);
      console.log(`💬 [Socket.IO Client] Joined chat_${bookingId}`);
    }
  },

  /**
   * Rời room chat khi thoát màn hình chat
   */
  leaveChat: (bookingId: string) => {
    if (!bookingId) return;
    if (activeBookingId === bookingId) {
      activeBookingId = null;
    }
    if (socket?.connected) {
      socket.emit('leave_chat', bookingId);
      console.log(`🚪 [Socket.IO Client] Left chat_${bookingId}`);
    }
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
        if (activeBookingId) {
          socket?.emit('join_chat', activeBookingId);
          console.log(`💬 [Socket.IO Client] Re-joined chat_${activeBookingId}`);
        }
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

      socket.on('new_message', (message: ChatMessage) => {
        console.log('💬 [Socket.IO Client] Nhận tin nhắn mới:', message._id);
        messageListeners.forEach(listener => {
          try {
            listener(message);
          } catch (e) {
            console.warn('Listener error in onNewMessage:', e);
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
