import express from 'express';
import { getOwnerAnalytics } from '../controllers/ownerAnalyticsController.js';

const router = express.Router();

/**
 * GET /api/devices/owner/analytics
 * GET /api/owner/analytics
 * Không yêu cầu bước xác thực (phần Auth do thành viên khác đảm nhiệm)
 */
router.get('/owner/analytics', getOwnerAnalytics);
router.get('/analytics', getOwnerAnalytics);

export default router;
