import {
  collection,
  query,
  where,
  onSnapshot,
  getDocs,
  doc,
  updateDoc,
  deleteDoc,
  addDoc,
  writeBatch,
} from 'firebase/firestore';
import { db } from '../config/firebase';
import { Notification, NotificationType } from '../types';

export const firebaseNotificationService = {
  /**
   * Lắng nghe thông báo thời gian thực từ Firebase Firestore cho 1 người dùng
   * @param userId - ID người dùng hiện tại
   * @param onUpdate - Callback khi danh sách thông báo thay đổi
   * @returns Hàm unsubscribe để hủy lắng nghe khi unmount
   */
  subscribeUserNotifications: (
    userId: string,
    onUpdate: (notifications: Notification[]) => void
  ) => {
    if (!userId) {
      onUpdate([]);
      return () => {};
    }

    const notifRef = collection(db, 'notifications');
    // Query các thông báo thuộc về userId hoặc recipient
    const q = query(notifRef, where('recipient', '==', String(userId)));

    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        const notifications: Notification[] = snapshot.docs.map((d) => {
          const data = d.data();
          return {
            _id: d.id,
            recipient: data.recipient || data.userId || userId,
            title: data.title || '',
            body: data.body || '',
            type: (data.type || 'system') as NotificationType,
            relatedId: data.relatedId,
            data: data.data || {},
            isRead: Boolean(data.isRead),
            createdAt:
              data.createdAt ||
              (data.timestamp ? new Date(data.timestamp.toDate()).toISOString() : new Date().toISOString()),
          };
        });

        // Sắp xếp giảm dần theo thời gian mới nhất
        notifications.sort(
          (a, b) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime()
        );

        console.log(`🔥 [Firebase Notification] Nhận ${notifications.length} thông báo realtime cho user_${userId}`);
        onUpdate(notifications);
      },
      (error) => {
        console.warn('⚠️ [Firebase Notification] Lỗi lắng nghe onSnapshot:', error.message);
      }
    );

    return unsubscribe;
  },

  /**
   * Lấy danh sách thông báo 1 lần từ Firebase Firestore
   */
  getNotifications: async (userId: string): Promise<Notification[]> => {
    try {
      if (!userId) return [];
      const notifRef = collection(db, 'notifications');
      const q = query(notifRef, where('recipient', '==', String(userId)));
      const snapshot = await getDocs(q);

      const notifications: Notification[] = snapshot.docs.map((d) => {
        const data = d.data();
        return {
          _id: d.id,
          recipient: data.recipient || data.userId || userId,
          title: data.title || '',
          body: data.body || '',
          type: (data.type || 'system') as NotificationType,
          relatedId: data.relatedId,
          data: data.data || {},
          isRead: Boolean(data.isRead),
          createdAt:
            data.createdAt ||
            (data.timestamp ? new Date(data.timestamp.toDate()).toISOString() : new Date().toISOString()),
        };
      });

      notifications.sort(
        (a, b) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime()
      );

      return notifications;
    } catch (error) {
      console.warn('⚠️ [Firebase Notification] Lỗi getNotifications:', error);
      return [];
    }
  },

  /**
   * Đánh dấu 1 thông báo là đã đọc trên Firebase
   */
  markAsRead: async (notificationId: string): Promise<void> => {
    try {
      const docRef = doc(db, 'notifications', notificationId);
      await updateDoc(docRef, { isRead: true });
      console.log(`🔥 [Firebase Notification] Đã đánh dấu đọc: ${notificationId}`);
    } catch (error) {
      console.warn('⚠️ [Firebase Notification] Lỗi markAsRead:', error);
    }
  },

  /**
   * Đánh dấu tất cả thông báo của user là đã đọc trên Firebase
   */
  markAllAsRead: async (userId: string): Promise<void> => {
    try {
      if (!userId) return;
      const notifRef = collection(db, 'notifications');
      const q = query(
        notifRef,
        where('recipient', '==', String(userId)),
        where('isRead', '==', false)
      );
      const snapshot = await getDocs(q);

      const batch = writeBatch(db);
      snapshot.docs.forEach((docItem) => {
        batch.update(docItem.ref, { isRead: true });
      });

      await batch.commit();
      console.log(`🔥 [Firebase Notification] Đã đánh dấu đọc tất cả cho user_${userId}`);
    } catch (error) {
      console.warn('⚠️ [Firebase Notification] Lỗi markAllAsRead:', error);
    }
  },

  /**
   * Xóa 1 thông báo khỏi Firebase
   */
  deleteNotification: async (notificationId: string): Promise<void> => {
    try {
      const docRef = doc(db, 'notifications', notificationId);
      await deleteDoc(docRef);
      console.log(`🔥 [Firebase Notification] Đã xóa thông báo: ${notificationId}`);
    } catch (error) {
      console.warn('⚠️ [Firebase Notification] Lỗi deleteNotification:', error);
    }
  },

  /**
   * Thêm thông báo mới vào Firebase Firestore
   */
  createNotification: async (data: {
    recipient: string;
    title: string;
    body: string;
    type: NotificationType;
    relatedId?: string;
    data?: any;
  }): Promise<string> => {
    const notifRef = collection(db, 'notifications');
    const docRef = await addDoc(notifRef, {
      recipient: String(data.recipient),
      userId: String(data.recipient),
      title: data.title,
      body: data.body,
      type: data.type || 'system',
      relatedId: data.relatedId || null,
      data: data.data || {},
      isRead: false,
      createdAt: new Date().toISOString(),
    });
    return docRef.id;
  },
};

export default firebaseNotificationService;
