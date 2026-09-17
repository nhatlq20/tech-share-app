import express from 'express';
import { createBooking } from '../controllers/bookingController.js';
import { requireAuth } from '../middlewares/authMiddleware.js';

const router = express.Router();

router.post('/', requireAuth, createBooking);

export default router;
