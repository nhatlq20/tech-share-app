import express from 'express';
import {
  createReview,
  getDeviceReviews,
  getBookingReview,
  ownerRateRenter,
  getMyOwnerReviews,
} from '../controllers/reviewController.js';
import { requireAuth } from '../middlewares/authMiddleware.js';

const router = express.Router();

router.post('/', requireAuth, createReview);
router.get('/device/:deviceId', getDeviceReviews);
router.get('/my-owner-reviews', requireAuth, getMyOwnerReviews);
router.get('/booking/:bookingId', requireAuth, getBookingReview);
router.patch('/:reviewId/owner-rate', requireAuth, ownerRateRenter);

export default router;
