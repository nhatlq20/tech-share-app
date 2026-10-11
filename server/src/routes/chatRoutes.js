import express from 'express';
import { requireAuth } from '../middlewares/authMiddleware.js';
import { uploadDeviceImage } from '../middlewares/uploadMiddleware.js';
import {
  getConversations,
  getChatHistory,
  sendMessage,
  uploadChatImage,
  markChatMessagesAsRead,
} from '../controllers/chatController.js';

const router = express.Router();

// Upload image attachment
router.post('/upload-image', requireAuth, uploadDeviceImage, uploadChatImage);

// 1. GET /api/chats/conversations - Lấy danh sách cuộc trò chuyện (tin nhắn mới nhất nằm trên)
router.get('/conversations', requireAuth, getConversations);

// 2. GET /api/chats/:bookingId - Lấy lịch sử tin nhắn
router.get('/:bookingId', requireAuth, getChatHistory);

// 3. POST /api/chats/:bookingId/messages - Gửi tin nhắn mới
router.post('/:bookingId/messages', requireAuth, sendMessage);

// 4. PATCH /api/chats/:bookingId/read - Đánh dấu tin nhắn đã đọc
router.patch('/:bookingId/read', requireAuth, markChatMessagesAsRead);

export default router;
