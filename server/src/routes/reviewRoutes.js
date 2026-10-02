import express from 'express';
import {
  createReview,
  getDeviceReviews,
  getBookingReview,
} from '../controllers/reviewController.js';
import { requireAuth } from '../middlewares/authMiddleware.js';

const router = express.Router();

router.post('/', requireAuth, createReview);
router.get('/device/:deviceId', getDeviceReviews);
router.get('/booking/:bookingId', requireAuth, getBookingReview);

export default router;
