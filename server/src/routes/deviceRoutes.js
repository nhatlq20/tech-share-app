import express from 'express';
import { getDevices } from '../controllers/deviceController.js';

const router = express.Router();

// GET /api/devices
router.get('/', getDevices);

export default router;
