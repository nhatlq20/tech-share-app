import express from 'express';
import { createBooking, getMyBookings, cancelBooking } from '../controllers/bookingController.js';
import { requireAuth } from '../middlewares/authMiddleware.js';

const router = express.Router();

router.post('/', requireAuth, createBooking);
router.get('/my-bookings', requireAuth, getMyBookings);
router.put('/:id/cancel', requireAuth, cancelBooking);

export default router;
