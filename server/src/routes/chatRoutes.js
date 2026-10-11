import express from 'express';
import { requireAuth } from '../middlewares/authMiddleware.js';
import { uploadDeviceImage } from '../middlewares/uploadMiddleware.js';
import {
  getChatHistory,
  sendMessage,
  uploadChatImage,
} from '../controllers/chatController.js';

const router = express.Router();

// Upload image attachment
router.post('/upload-image', requireAuth, uploadDeviceImage, uploadChatImage);

// 1. GET /api/chats/:bookingId - Lấy lịch sử tin nhắn
router.get('/:bookingId', requireAuth, getChatHistory);

// 2. POST /api/chats/:bookingId/messages - Gửi tin nhắn mới
router.post('/:bookingId/messages', requireAuth, sendMessage);

export default router;
