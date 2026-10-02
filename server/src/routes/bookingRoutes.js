import express from 'express';
import {
  createBooking,
  getMyBookings,
  getOwnerBookings,
  getBookingById,
  updateBookingStatusByOwner,
  handoverBooking,
  completeBooking,
  cancelBooking,
  requestExtension,
  respondExtension,
  getDeviceBusyDates,
} from '../controllers/bookingController.js';
import { requireAuth } from '../middlewares/authMiddleware.js';

const router = express.Router();

router.post('/', requireAuth, createBooking);
router.get('/my-bookings', requireAuth, getMyBookings);
router.get('/owner-bookings', requireAuth, getOwnerBookings);
router.get('/busy-dates/:deviceId', getDeviceBusyDates);
router.get('/:id', requireAuth, getBookingById);
router.patch('/:id/status', requireAuth, updateBookingStatusByOwner);
router.put('/:id/status', requireAuth, updateBookingStatusByOwner);
router.patch('/:id/handover', requireAuth, handoverBooking);
router.post('/:id/handover', requireAuth, handoverBooking);
router.patch('/:id/complete', requireAuth, completeBooking);
router.post('/:id/complete', requireAuth, completeBooking);
router.put('/:id/cancel', requireAuth, cancelBooking);
router.post('/:id/extend', requireAuth, requestExtension);
router.put('/:id/respond-extension', requireAuth, respondExtension);

export default router;
