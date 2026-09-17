import express from 'express';
import { requireAuth } from '../middlewares/authMiddleware.js';
import { getMyProfile, updateMyProfile } from '../controllers/profileController.js';

const router = express.Router();

router.use(requireAuth);
router.get('/me', getMyProfile);
router.patch('/me', updateMyProfile);

export default router;
