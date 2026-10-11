import { Expo } from 'expo-server-sdk';
import { doc, setDoc } from 'firebase/firestore';
import { db } from '../config/firebase.js';
import Notification from '../models/Notification.js';
import User from '../models/User.js';

// Initialize Expo push notification instance
const expo = new Expo();

/**
 * Dispatch Push Notifications via Expo Push Service
 * @param {Array<string>} pushTokens - Array of Expo Push Tokens
 * @param {string} title - Notification title
 * @param {string} body - Notification body
 * @param {object} data - Custom payload data (e.g. screen, bookingId)
 */
export const sendExpoPushNotification = async (pushTokens, title, body, data = {}) => {
  if (!pushTokens || pushTokens.length === 0) return;

  const validTokens = pushTokens.filter((token) => Expo.isExpoPushToken(token));
  if (validTokens.length === 0) {
    console.log('⚠️ [ExpoPush] No valid Expo Push Tokens found');
    return;
  }

  const messages = validTokens.map((to) => ({
    to,
    sound: 'default',
    title,
    body,
    data,
    priority: 'high',
    channelId: 'default',
  }));

  const chunks = expo.chunkPushNotifications(messages);
  const tickets = [];

  for (const chunk of chunks) {
    try {
      const ticketChunk = await expo.sendPushNotificationsAsync(chunk);
      tickets.push(...ticketChunk);
    } catch (error) {
      console.error('❌ [ExpoPush] Error sending push notification chunk:', error);
    }
  }

  return tickets;
};

/**
 * Create Database Notification Record + Emit Real-time Socket Event + Send Remote Push Notification
 */
export const createAndSendNotification = async ({
  userId,
  title,
  body,
  type = 'system',
  relatedId = null,
  data = {},
}) => {
  try {
    // 1. Create Notification in MongoDB Atlas
    const notification = await Notification.create({
      userId,
      title,
      body,
      type,
      relatedId,
      isRead: false,
    });

    // 2. Sync to Firebase Firestore for Real-time Cloud updates (non-blocking)
    try {
      const notifId = notification._id.toString();
      setDoc(doc(db, 'notifications', notifId), {
        recipient: String(userId),
        userId: String(userId),
        title,
        body,
        type,
        relatedId: relatedId ? String(relatedId) : null,
        data: data || {},
        isRead: false,
        createdAt: notification.createdAt ? notification.createdAt.toISOString() : new Date().toISOString(),
      })
        .then(() => {
          console.log(`🔥 [Firebase Firestore] Notification synced: ${notifId}`);
        })
        .catch((fbError) => {
          console.warn('⚠️ [Firebase Firestore] Warning:', fbError.message);
        });
    } catch (fbError) {
      console.warn('⚠️ [Firebase Firestore] Error:', fbError.message);
    }

    // 3. Query recipient User to dispatch remote push notification
    const user = await User.findById(userId).select('expoPushToken pushTokens fcmTokens');
    if (user) {
      const allTokens = [
        ...(user.expoPushToken ? [user.expoPushToken] : []),
        ...(user.pushTokens || []),
        ...(user.fcmTokens || []),
      ];

      if (allTokens.length > 0) {
        await sendExpoPushNotification(allTokens, title, body, {
          notificationId: notification._id.toString(),
          type,
          relatedId: relatedId ? relatedId.toString() : null,
          ...data,
        });
      }
    }

    return notification;
  } catch (error) {
    console.error('❌ [NotificationService] Error creating and dispatching notification:', error.message);
    throw error;
  }
};

export default {
  sendExpoPushNotification,
  createAndSendNotification,
};
