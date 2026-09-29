import express from 'express';
import {
  getNotifications,
  getUnreadCount,
  markAsRead,
  markAllAsRead,
  deleteNotification,
  savePushToken,
} from '../controllers/notificationController.js';
import { requireAuth } from '../middlewares/authMiddleware.js';

const router = express.Router();

// Tất cả endpoints đều yêu cầu đăng nhập
router.use(requireAuth);

router.get('/', getNotifications);
router.get('/unread-count', getUnreadCount);
router.patch('/read-all', markAllAsRead);
router.patch('/:id/read', markAsRead);
router.delete('/:id', deleteNotification);
router.post('/push-token', savePushToken);

export default router;
