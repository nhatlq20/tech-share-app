import express from 'express';
import { requireAuth } from '../middlewares/authMiddleware.js';
import { uploadAvatar } from '../middlewares/uploadMiddleware.js';
import { getMyProfile, updateMyProfile, uploadMyAvatar } from '../controllers/profileController.js';

const router = express.Router();

router.use(requireAuth);
router.get('/me', getMyProfile);
router.post('/me/avatar', uploadAvatar, uploadMyAvatar);
router.patch('/me', updateMyProfile);

export default router;
