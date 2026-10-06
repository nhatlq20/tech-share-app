import express from 'express';
import { requireAuth } from '../middlewares/authMiddleware.js';
import {
  getAnalytics,
  getUsers,
  toggleUserStatus,
  getDisputes,
  resolveDispute,
  getEkycRequests,
  approveEkyc,
  rejectEkyc,
  getAdminDevices,
  deleteDevice,
  getAdminVouchers,
  createVoucher,
  updateVoucher,
  deleteVoucher,
} from '../controllers/adminController.js';

const router = express.Router();
const requireAdmin = (req, res, next) => {
  if (req.auth?.role !== 'admin' && !req.auth?.roles?.includes('admin')) {
    return res.status(403).json({
      success: false,
      message: 'Bạn không có quyền quản lý người dùng.',
    });
  }
  next();
};

// 1. Thống kê số liệu nền tảng
router.get('/analytics', getAnalytics);

// 2. Quản lý người dùng
router.get('/users', requireAuth, requireAdmin, getUsers);
router.patch('/users/:id/toggle-status', requireAuth, requireAdmin, toggleUserStatus);

// 3. Quản lý tranh chấp cọc
router.get('/disputes', getDisputes);
router.post('/disputes/:id/resolve', resolveDispute);

// 4. Quản lý duyệt hồ sơ eKYC
router.get('/ekyc', getEkycRequests);
router.patch('/ekyc/:id/approve', approveEkyc);
router.patch('/ekyc/:id/reject', rejectEkyc);

// 5. Kiểm duyệt thiết bị
router.get('/devices', getAdminDevices);
router.delete('/devices/:id', deleteDevice);

// 6. Quản lý Voucher
router.get('/vouchers', getAdminVouchers);
router.post('/vouchers', createVoucher);
router.put('/vouchers/:id', updateVoucher);
router.delete('/vouchers/:id', deleteVoucher);

export default router;
