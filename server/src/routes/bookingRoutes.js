import express from 'express';
import {
  createBooking,
  getMyBookings,
  getBookingById,
  cancelBooking,
  requestExtension,
  respondExtension,
} from '../controllers/bookingController.js';
import { requireAuth } from '../middlewares/authMiddleware.js';

const router = express.Router();

router.post('/', requireAuth, createBooking);
router.get('/my-bookings', requireAuth, getMyBookings);
router.get('/:id', requireAuth, getBookingById);
router.put('/:id/cancel', requireAuth, cancelBooking);
router.post('/:id/extend', requireAuth, requestExtension);
router.put('/:id/respond-extension', requireAuth, respondExtension);

export default router;
