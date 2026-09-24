import express from 'express';
import { requireAuth } from '../middlewares/authMiddleware.js';
import { uploadAvatar, uploadEkycDoc, uploadEkycBothCards } from '../middlewares/uploadMiddleware.js';
import {
  getMyProfile,
  updateMyProfile,
  uploadMyAvatar,
  getMyEkyc,
  submitEkyc,
  uploadEkycImage,
} from '../controllers/profileController.js';

const router = express.Router();

router.use(requireAuth);
router.get('/me', getMyProfile);
router.post('/me/avatar', uploadAvatar, uploadMyAvatar);
router.patch('/me', updateMyProfile);

// eKYC routes for user
router.get('/ekyc', getMyEkyc);
router.post('/ekyc', uploadEkycBothCards, submitEkyc);
router.post('/ekyc/upload', uploadEkycDoc, uploadEkycImage);

export default router;
