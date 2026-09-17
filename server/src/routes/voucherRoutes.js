import express from 'express';
import { validateVoucher } from '../controllers/voucherController.js';
import { requireAuth } from '../middlewares/authMiddleware.js';

const router = express.Router();

router.post('/validate', requireAuth, validateVoucher);

export default router;
