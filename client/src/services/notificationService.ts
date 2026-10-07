import { apiClient, getApiAuthToken } from '../config/api';
import { Notification } from '../types';

export const FALLBACK_NOTIFICATIONS: Notification[] = [
  {
    _id: 'notif_seed_01',
    recipient: 'user_renter_01',
    title: 'Booking #TS-8821 Approved 🎉',
    body: 'Owner Minh Tuan approved your rental request for iPhone 15 Pro Max. You can now arrange device handover!',
    type: 'order',
    isRead: false,
    createdAt: new Date(Date.now() - 15 * 60 * 1000).toISOString(), // 15 mins ago
  },
  {
    _id: 'notif_seed_02',
    recipient: 'user_renter_01',
    title: 'Reminder: Return Deadline Approaching! ⏳',
    body: 'Your rental for Sony Alpha A7 IV ends at 18:00 today. Please arrange punctual return.',
    type: 'reminder',
    isRead: false,
    createdAt: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(), // 2 hours ago
  },
  {
    _id: 'notif_seed_03',
    recipient: 'user_renter_01',
    title: 'eKYC Application Approved! ✅',
    body: 'Congratulations! Your citizen ID has been verified successfully. You have received the Verified Badge.',
    type: 'system',
    isRead: true,
    createdAt: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(), // 1 day ago
  },
  {
    _id: 'notif_seed_04',
    recipient: 'user_renter_01',
    title: 'Exclusive Promo TECHSHARE50 🎁',
    body: 'Get 50,000 VND off on any tech device rental this week.',
    type: 'promo',
    isRead: true,
    createdAt: new Date(Date.now() - 48 * 60 * 60 * 1000).toISOString(), // 2 days ago
  },
];

const getHeaders = (token?: string) => {
  const authToken = token || getApiAuthToken();
  return authToken ? { Authorization: `Bearer ${authToken}` } : {};
};

export const notificationService = {
  /**
   * Lấy danh sách thông báo của người dùng
   */
  getNotifications: async (
    params?: { type?: string; page?: number; limit?: number; unreadOnly?: boolean },
    token?: string
  ): Promise<{ data: Notification[]; unreadCount: number; total: number }> => {
    try {
      const response = await apiClient.get('/notifications', {
        params,
        headers: getHeaders(token),
      });

      if (response.data && response.data.success) {
        return {
          data: response.data.data,
          unreadCount: response.data.meta?.unreadCount ?? 0,
          total: response.data.meta?.total ?? response.data.data.length,
        };
      }
      return {
        data: FALLBACK_NOTIFICATIONS,
        unreadCount: FALLBACK_NOTIFICATIONS.filter((n) => !n.isRead).length,
        total: FALLBACK_NOTIFICATIONS.length,
      };
    } catch (error) {
      console.warn('⚠️ [notificationService.getNotifications] Dùng dữ liệu fallback:', error);
      return {
        data: FALLBACK_NOTIFICATIONS,
        unreadCount: FALLBACK_NOTIFICATIONS.filter((n) => !n.isRead).length,
        total: FALLBACK_NOTIFICATIONS.length,
      };
    }
  },

  /**
   * Lấy số lượng thông báo chưa đọc
   */
  getUnreadCount: async (token?: string): Promise<number> => {
    try {
      const response = await apiClient.get('/notifications/unread-count', {
        headers: getHeaders(token),
      });
      if (response.data && response.data.success) {
        return response.data.unreadCount;
      }
      return FALLBACK_NOTIFICATIONS.filter((n) => !n.isRead).length;
    } catch (error) {
      return FALLBACK_NOTIFICATIONS.filter((n) => !n.isRead).length;
    }
  },

  /**
   * Đánh dấu 1 thông báo là đã đọc
   */
  markAsRead: async (id: string, token?: string): Promise<boolean> => {
    try {
      const response = await apiClient.patch(`/notifications/${id}/read`, {}, {
        headers: getHeaders(token),
      });
      return response.data?.success ?? true;
    } catch (error) {
      console.warn(`⚠️ [notificationService.markAsRead] Fallback mark read: ${id}`);
      return true;
    }
  },

  /**
   * Đánh dấu toàn bộ thông báo là đã đọc
   */
  markAllAsRead: async (token?: string): Promise<boolean> => {
    try {
      const response = await apiClient.patch('/notifications/read-all', {}, {
        headers: getHeaders(token),
      });
      return response.data?.success ?? true;
    } catch (error) {
      console.warn('⚠️ [notificationService.markAllAsRead] Fallback mark all read');
      return true;
    }
  },

  /**
   * Xóa 1 thông báo
   */
  deleteNotification: async (id: string, token?: string): Promise<boolean> => {
    try {
      const response = await apiClient.delete(`/notifications/${id}`, {
        headers: getHeaders(token),
      });
      return response.data?.success ?? true;
    } catch (error) {
      console.warn(`⚠️ [notificationService.deleteNotification] Fallback delete: ${id}`);
      return true;
    }
  },

  /**
   * Đăng ký Expo Push Token lên Server
   */
  registerPushToken: async (pushToken: string, token?: string): Promise<void> => {
    try {
      await apiClient.post('/notifications/push-token', { token: pushToken }, {
        headers: getHeaders(token),
      });
      console.log('✅ [notificationService] Đã gửi Push Token lên server');
    } catch (error) {
      console.warn('⚠️ [notificationService] Chưa thể gửi push token lên server');
    }
  },
};

export default notificationService;
