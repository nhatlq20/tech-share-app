import express from 'express';
import {
  getAnalytics,
  getDisputes,
  resolveDispute,
  getEkycRequests,
  approveEkyc,
  rejectEkyc,
  getAdminDevices,
  deleteDevice,
} from '../controllers/adminController.js';

const router = express.Router();

// 1. Thống kê số liệu nền tảng
router.get('/analytics', getAnalytics);

// 2. Quản lý tranh chấp cọc
router.get('/disputes', getDisputes);
router.post('/disputes/:id/resolve', resolveDispute);

// 3. Quản lý duyệt hồ sơ eKYC
router.get('/ekyc', getEkycRequests);
router.patch('/ekyc/:id/approve', approveEkyc);
router.patch('/ekyc/:id/reject', rejectEkyc);

// 4. Kiểm duyệt thiết bị
router.get('/devices', getAdminDevices);
router.delete('/devices/:id', deleteDevice);

export default router;
