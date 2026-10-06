import mongoose from 'mongoose';
import {
  User,
  Account,
  Device,
  Booking,
  Dispute,
  EkycRequest,
  WalletTransaction,
  Notification,
  Voucher,
} from '../models/index.js';
import { createAndSendNotification } from '../services/notificationService.js';

/**
 * 1. GET /api/admin/analytics
 * Thống kê tổng quan nền tảng cho Dashboard Admin
 */
export const getAnalytics = async (req, res) => {
  try {
    // 1. Số lượng thành viên
    const totalUsers = await User.countDocuments({});
    const verifiedUsers = await User.countDocuments({ isVerified: true });

    // 2. Số lượng thiết bị
    const totalDevices = await Device.countDocuments({ isDeleted: false });
    const rentedDevices = await Device.countDocuments({ status: 'rented', isDeleted: false });
    const availableDevices = await Device.countDocuments({ status: 'available', isDeleted: false });

    // 3. Đơn thuê hoạt động
    const activeBookings = await Booking.countDocuments({
      status: { $in: ['active', 'approved'] },
    });
    const completedBookingsCount = await Booking.countDocuments({ status: 'completed' });

    // 4. Doanh thu hoàn tất (tính từ rentalFee của các đơn completed)
    const revenueAgg = await Booking.aggregate([
      { $match: { status: 'completed' } },
      {
        $group: {
          _id: null,
          totalRentalFee: { $sum: '$rentalFee' },
          totalAmount: { $sum: '$totalAmount' },
          count: { $sum: 1 },
        },
      },
    ]);

    const totalRentalRevenue = revenueAgg[0]?.totalRentalFee || 0;
    // Phí sàn giả định 10% trên doanh thu hoàn tất
    const platformCommission = Math.round(totalRentalRevenue * 0.1);

    // 5. Phân bổ danh mục thiết bị
    const categoryStats = await Device.aggregate([
      { $match: { isDeleted: false } },
      { $group: { _id: '$category', count: { $sum: 1 } } },
      { $sort: { count: -1 } },
    ]);

    const categoryDistribution = categoryStats.map(item => ({
      category: item._id,
      count: item.count,
      percentage: totalDevices > 0 ? Math.round((item.count / totalDevices) * 100) : 0,
    }));

    // 6. Số lượng việc cần xử lý gấp
    const pendingDisputesCount = await Dispute.countDocuments({ status: 'pending' });
    const pendingEkycCount = await EkycRequest.countDocuments({ status: 'pending' });

    return res.status(200).json({
      success: true,
      data: {
        totalUsers,
        verifiedUsers,
        totalDevices,
        rentedDevices,
        availableDevices,
        activeBookings,
        completedBookingsCount,
        totalRentalRevenue,
        platformCommission,
        categoryDistribution,
        pendingTasks: {
          disputes: pendingDisputesCount,
          ekyc: pendingEkycCount,
          total: pendingDisputesCount + pendingEkycCount,
        },
      },
    });
  } catch (error) {
    console.error('❌ [Admin getAnalytics] Lỗi:', error);
    return res.status(500).json({
      success: false,
      message: 'Không thể lấy dữ liệu thống kê quản trị.',
      error: error.message,
    });
  }
};

/**
 * 2. GET /api/admin/users
 * Lấy danh sách người dùng cho trang quản lý người dùng
 */
export const getUsers = async (req, res) => {
  try {
    const [users, bookingCounts] = await Promise.all([
      User.find({})
      .select('name email phone role avatar isVerified trustScore rating ownerRating totalReviews isActive createdAt')
      .sort({ createdAt: -1 })
      .lean(),
      Booking.aggregate([
        {
          $project: {
            userIds: [
              { $ifNull: ['$renterId', null] },
              { $ifNull: ['$ownerId', null] },
            ],
          },
        },
        { $unwind: '$userIds' },
        { $match: { userIds: { $ne: null } } },
        { $group: { _id: '$userIds', rentalCount: { $sum: 1 } } },
      ]),
    ]);
    const accounts = await Account.find({
      $or: [
        { userId: { $in: users.map(user => user._id) } },
        { email: { $in: users.map(user => user.email).filter(Boolean) } },
      ],
    })
      .select('userId email isActive lockReason')
      .lean();
    const accountByUserId = new Map();
    const accountByEmail = new Map();
    accounts.forEach(account => {
      if (account.userId) accountByUserId.set(account.userId.toString(), account);
      if (account.email) accountByEmail.set(account.email.toLowerCase(), account);
    });
    const rentalCountsByUserId = new Map(
      bookingCounts.map(item => [item._id.toString(), item.rentalCount])
    );

    const usersWithStats = users.map(user => {
      const account =
        accountByUserId.get(user._id.toString()) ||
        accountByEmail.get((user.email || '').toLowerCase());
      return {
        id: user._id.toString(),
        name: user.name || '',
        email: user.email || '',
        phone: user.phone || '',
        role: user.role || 'renter',
        avatar: user.avatar || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=400',
        isVerified: Boolean(user.isVerified),
        trustScore: Number(user.trustScore ?? 100),
        rating: Number(user.rating ?? 5.0),
        ownerRating: Number(user.ownerRating ?? 5.0),
        totalReviews: Number(user.totalReviews ?? 0),
        totalReview: Number(user.totalReviews ?? 0),
        isActive: account ? account.isActive !== false : user.isActive !== false,
        lockReason: account?.lockReason || '',
        rentalCount: rentalCountsByUserId.get(user._id.toString()) || 0,
      };
    });

    return res.status(200).json({
      success: true,
      count: usersWithStats.length,
      data: usersWithStats,
    });
  } catch (error) {
    console.error('❌ [Admin getUsers] Lỗi:', error);
    return res.status(500).json({
      success: false,
      message: 'Không thể tải danh sách người dùng.',
      error: error.message,
    });
  }
};

/**
 * 3. PATCH /api/admin/users/:id/toggle-status
 * Khóa hoặc mở khóa tài khoản người dùng
 */
export const toggleUserStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { isActive, lockReason } = req.body;

    const user = await User.findById(id);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'Không tìm thấy người dùng.',
      });
    }

    if (user.role === 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Không thể khóa hoặc mở khóa tài khoản quản trị viên.',
      });
    }

    if (typeof isActive !== 'boolean') {
      return res.status(400).json({
        success: false,
        message: 'Trạng thái tài khoản không hợp lệ.',
      });
    }

    const normalizedReason = typeof lockReason === 'string' ? lockReason.trim() : '';
    if (!isActive && !normalizedReason) {
      return res.status(400).json({
        success: false,
        message: 'Vui lòng nhập lý do khóa tài khoản.',
      });
    }

    const accountConditions = [{ userId: user._id }];
    if (user.email) accountConditions.push({ email: user.email.toLowerCase() });
    const accountUpdate = await Account.updateMany({ $or: accountConditions }, {
      $set: {
        isActive,
        lockReason: isActive ? '' : normalizedReason,
      },
    });

    if (accountUpdate.matchedCount === 0) {
      return res.status(404).json({
        success: false,
        message: 'Không tìm thấy tài khoản đăng nhập tương ứng trong collection accounts.',
      });
    }

    user.isActive = isActive;
    await user.save();

    return res.status(200).json({
      success: true,
      message: user.isActive ? 'Tài khoản đã được mở khóa.' : 'Tài khoản đã bị khóa.',
      data: {
        id: user._id.toString(),
        isActive: user.isActive,
        lockReason: isActive ? '' : normalizedReason,
      },
    });
  } catch (error) {
    console.error('❌ [Admin toggleUserStatus] Lỗi:', error);
    return res.status(500).json({
      success: false,
      message: 'Không thể cập nhật trạng thái tài khoản.',
      error: error.message,
    });
  }
};

/**
 * 4. GET /api/admin/disputes
 * Lấy danh sách tranh chấp cọc
 */
export const getDisputes = async (req, res) => {
  try {
    const { status } = req.query;
    const filter = {};
    if (status && status !== 'all') {
      filter.status = status;
    }

    const disputes = await Dispute.find(filter)
      .populate({
        path: 'bookingId',
        select:
          'bookingCode deviceId renterId ownerId startDate endDate totalDays rentalFee depositFee status paymentStatus handoverPhotos',
        populate: [
          { path: 'deviceId', select: 'name brand images category pricePerDay depositAmount' },
          { path: 'renterId', select: 'name avatar phone trustScore rating' },
          { path: 'ownerId', select: 'name avatar phone trustScore rating' },
        ],
      })
      .populate('raisedBy', 'name avatar phone')
      .populate('resolvedBy', 'name')
      .sort({ createdAt: -1 });

    return res.status(200).json({
      success: true,
      count: disputes.length,
      data: disputes,
    });
  } catch (error) {
    console.error('❌ [Admin getDisputes] Lỗi:', error);
    return res.status(500).json({
      success: false,
      message: 'Không thể tải danh sách tranh chấp cọc.',
      error: error.message,
    });
  }
};

/**
 * 3. POST /api/admin/disputes/:id/resolve
 * Phán quyết tranh chấp cọc và điều chuyển tiền ký quỹ Escrow
 */
export const resolveDispute = async (req, res) => {
  try {
    const { id } = req.params;
    const { decision, finalDeductAmount, note } = req.body;

    if (!['full_refund', 'partial_deduct', 'full_deduct'].includes(decision)) {
      return res.status(400).json({
        success: false,
        message:
          "Quyết định không hợp lệ. Phải là một trong: 'full_refund', 'partial_deduct', 'full_deduct'.",
      });
    }

    const dispute = await Dispute.findById(id);
    if (!dispute) {
      return res.status(404).json({
        success: false,
        message: 'Không tìm thấy hồ sơ tranh chấp.',
      });
    }

    if (dispute.status === 'resolved') {
      return res.status(400).json({
        success: false,
        message: 'Tranh chấp này đã được ban hành phán quyết trước đó.',
      });
    }

    const booking = await Booking.findById(dispute.bookingId);
    if (!booking) {
      return res.status(404).json({
        success: false,
        message: 'Không tìm thấy đơn thuê liên quan đến tranh chấp.',
      });
    }

    const depositFee = booking.depositFee || 0;
    let deductAmount = 0;
    let refundAmount = depositFee;

    if (decision === 'full_refund') {
      deductAmount = 0;
      refundAmount = depositFee;
    } else if (decision === 'full_deduct') {
      deductAmount = depositFee;
      refundAmount = 0;
    } else if (decision === 'partial_deduct') {
      const parsedAmount = Number(finalDeductAmount) || 0;
      if (parsedAmount < 0 || parsedAmount > depositFee) {
        return res.status(400).json({
          success: false,
          message: `Số tiền khấu trừ không hợp lệ. Phải nằm trong khoảng từ 0 đ đến ${depositFee.toLocaleString()} đ.`,
        });
      }
      deductAmount = parsedAmount;
      refundAmount = depositFee - deductAmount;
    }

    // 1. Cập nhật số dư ví Renter & Owner
    const renter = await User.findById(booking.renterId);
    const owner = await User.findById(booking.ownerId);

    if (renter) {
      // Giải phóng số dư ký quỹ của Renter
      renter.walletEscrowBalance = Math.max(0, (renter.walletEscrowBalance || 0) - depositFee);
      // Hoàn trả lại số tiền còn lại vào ví khả dụng của Renter
      if (refundAmount > 0) {
        renter.walletBalance = (renter.walletBalance || 0) + refundAmount;
      }
      await renter.save();

      // Ghi lịch sử giao dịch hoàn cọc cho Renter
      if (refundAmount > 0) {
        await WalletTransaction.create({
          userId: renter._id,
          type: 'deposit_refund',
          amount: refundAmount,
          balanceAfter: renter.walletBalance,
          relatedBookingId: booking._id,
          status: 'success',
        });
      }
    }

    if (owner && deductAmount > 0) {
      // Chuyển tiền bồi thường khấu trừ cọc vào ví khả dụng của Owner
      owner.walletBalance = (owner.walletBalance || 0) + deductAmount;
      await owner.save();

      // Ghi lịch sử giao dịch nhận bồi thường cho Owner
      await WalletTransaction.create({
        userId: owner._id,
        type: 'dispute_compensation',
        amount: deductAmount,
        balanceAfter: owner.walletBalance,
        relatedBookingId: booking._id,
        status: 'success',
      });
    }

    // 2. Cập nhật hồ sơ Dispute
    dispute.status = 'resolved';
    dispute.adminDecision = decision;
    dispute.finalDeductAmount = deductAmount;
    dispute.resolvedBy = req.user?._id || new mongoose.Types.ObjectId('64e0a12f9b1c2b001a111111');
    dispute.resolvedAt = new Date();
    await dispute.save();

    // 3. Cập nhật đơn Booking
    booking.disputeStatus = 'resolved';
    booking.disputeNote = note || `Phán quyết Admin: ${decision} (Khấu trừ: ${deductAmount}đ, Hoàn lại: ${refundAmount}đ)`;
    booking.timeline.push({
      status: 'dispute_resolved',
      timestamp: new Date(),
      note: `Trọng tài TechShare đã phân xử tranh chấp: hoàn ${refundAmount.toLocaleString()}đ cho khách, đền bù ${deductAmount.toLocaleString()}đ cho chủ máy.`,
    });
    await booking.save();

    // 4. Bắn thông báo real-time và push cho 2 bên
    if (renter) {
      await createAndSendNotification({
        userId: renter._id,
        title: 'Phán quyết tranh chấp tiền cọc ⚖️',
        body: `Đơn #${booking.bookingCode} đã có phán quyết từ Admin: Bạn được hoàn ${refundAmount.toLocaleString()} đ tiền cọc.`,
        type: 'system',
        relatedId: booking._id,
        data: { bookingId: booking._id.toString() },
      });
    }
    if (owner) {
      await createAndSendNotification({
        userId: owner._id,
        title: 'Phán quyết tranh chấp tiền cọc ⚖️',
        body: `Đơn #${booking.bookingCode} đã có phán quyết từ Admin: Bạn nhận được ${deductAmount.toLocaleString()} đ tiền bồi thường thiệt hại.`,
        type: 'system',
        relatedId: booking._id,
        data: { bookingId: booking._id.toString() },
      });
    }

    return res.status(200).json({
      success: true,
      message: 'Ban hành phán quyết và điều chuyển tiền ký quỹ thành công!',
      data: {
        disputeId: dispute._id,
        decision,
        depositFee,
        deductAmount,
        refundAmount,
        resolvedAt: dispute.resolvedAt,
      },
    });
  } catch (error) {
    console.error('❌ [Admin resolveDispute] Lỗi:', error);
    return res.status(500).json({
      success: false,
      message: 'Không thể giải quyết tranh chấp cọc.',
      error: error.message,
    });
  }
};

/**
 * 4. GET /api/admin/ekyc
 * Lấy danh sách hồ sơ eKYC
 */
export const getEkycRequests = async (req, res) => {
  try {
    const { status } = req.query;
    const filter = {};
    if (status && status !== 'all') {
      filter.status = status;
    }

    const requests = await EkycRequest.find(filter)
      .populate('userId', 'name avatar phone email address trustScore isVerified badges')
      .populate('reviewedBy', 'name')
      .sort({ createdAt: -1 });

    return res.status(200).json({
      success: true,
      count: requests.length,
      data: requests,
    });
  } catch (error) {
    console.error('❌ [Admin getEkycRequests] Lỗi:', error);
    return res.status(500).json({
      success: false,
      message: 'Không thể tải danh sách hồ sơ eKYC.',
      error: error.message,
    });
  }
};

/**
 * 5. PATCH /api/admin/ekyc/:id/approve
 * Phê duyệt hồ sơ eKYC và cấp Tích xanh
 */
export const approveEkyc = async (req, res) => {
  try {
    const { id } = req.params;

    const request = await EkycRequest.findById(id);
    if (!request) {
      return res.status(404).json({
        success: false,
        message: 'Không tìm thấy yêu cầu eKYC.',
      });
    }

    request.status = 'approved';
    request.rejectReason = '';
    request.reviewedBy = req.user?._id || new mongoose.Types.ObjectId('64e0a12f9b1c2b001a111111');
    request.reviewedAt = new Date();
    await request.save();

    // Approving renter verification proves identity but does not change the user's role.
    const user = await User.findById(request.userId);
    if (user) {
      user.isVerified = true;
      if (request.address) {
        user.address = request.address;
      }
      const isOwnerApplication = request.verificationPurpose !== 'renter';
      if (isOwnerApplication && user.role !== 'admin') {
        user.role = 'owner';
      }
      if (!user.badges) user.badges = [];
      if (!user.badges.includes('verified_identity')) {
        user.badges.push('verified_identity');
      }
      user.trustScore = Math.min(100, (user.trustScore || 100) + 10);
      await user.save();

      if (isOwnerApplication) {
        const ownerRole = await mongoose.connection.db.collection('roles').findOne({ code: 'owner' });
        if (ownerRole) {
          await Account.updateOne(
            { $or: [{ userId: user._id }, { email: user.email }] },
            { roleId: ownerRole._id }
          );
        }
      }

      // Bắn thông báo chúc mừng
      await createAndSendNotification({
        userId: user._id,
        title: 'Hồ sơ eKYC đã được phê duyệt! 🎉',
        body: isOwnerApplication
          ? 'Chúc mừng bạn! Hồ sơ CCCD đã được xác thực thành công. Bạn đã nhận được Tích Xanh Uy Tín và được nâng cấp thành Chủ máy (Owner) có quyền đăng thiết bị cho thuê trên TechShare.'
          : 'Chúc mừng bạn! Danh tính của bạn đã được xác thực thành công. Bạn có thể thuê thiết bị trên TechShare.',
        type: 'system',
      });
    }

    return res.status(200).json({
      success: true,
      message:
        request.verificationPurpose === 'renter'
          ? 'Đã phê duyệt xác thực người dùng thực thành công.'
          : 'Đã phê duyệt eKYC, cấp Tích xanh và nâng cấp thành Chủ máy (Owner) thành công!',
      data: request,
    });
  } catch (error) {
    console.error('❌ [Admin approveEkyc] Lỗi:', error);
    return res.status(500).json({
      success: false,
      message: 'Không thể phê duyệt eKYC.',
      error: error.message,
    });
  }
};

/**
 * 6. PATCH /api/admin/ekyc/:id/reject
 * Từ chối hồ sơ eKYC kèm lý do
 */
export const rejectEkyc = async (req, res) => {
  try {
    const { id } = req.params;
    const { rejectReason } = req.body;

    const request = await EkycRequest.findById(id);
    if (!request) {
      return res.status(404).json({
        success: false,
        message: 'Không tìm thấy yêu cầu eKYC.',
      });
    }

    request.status = 'rejected';
    request.rejectReason = rejectReason || 'Ảnh giấy tờ tùy thân bị mờ hoặc không trùng khớp.';
    request.reviewedBy = req.user?._id || new mongoose.Types.ObjectId('64e0a12f9b1c2b001a111111');
    request.reviewedAt = new Date();
    await request.save();

    const user = await User.findById(request.userId);
    if (user) {
      user.isVerified = false;
      await user.save();

      await createAndSendNotification({
        userId: user._id,
        title: 'Hồ sơ eKYC chưa được phê duyệt ⚠️',
        body: `Hồ sơ xác minh căn cước của bạn đã bị từ chối. Lý do: ${request.rejectReason}. Vui lòng chụp lại ảnh rõ nét và gửi lại.`,
        type: 'system',
      });
    }

    return res.status(200).json({
      success: true,
      message: 'Đã từ chối hồ sơ eKYC.',
      data: request,
    });
  } catch (error) {
    console.error('❌ [Admin rejectEkyc] Lỗi:', error);
    return res.status(500).json({
      success: false,
      message: 'Không thể từ chối eKYC.',
      error: error.message,
    });
  }
};

/**
 * 7. GET /api/admin/devices
 * Danh sách thiết bị phục vụ kiểm duyệt
 */
export const getAdminDevices = async (req, res) => {
  try {
    const { q, category, status } = req.query;
    const filter = { isDeleted: false };

    if (q) {
      filter.$or = [
        { name: { $regex: q, $options: 'i' } },
        { brand: { $regex: q, $options: 'i' } },
      ];
    }
    if (category && category !== 'all') {
      filter.category = category;
    }
    if (status && status !== 'all') {
      filter.status = status;
    }

    const devices = await Device.find(filter)
      .populate('ownerId', 'name avatar phone rating')
      .sort({ createdAt: -1 });

    return res.status(200).json({
      success: true,
      count: devices.length,
      data: devices,
    });
  } catch (error) {
    console.error('❌ [Admin getAdminDevices] Lỗi:', error);
    return res.status(500).json({
      success: false,
      message: 'Không thể tải danh sách thiết bị kiểm duyệt.',
      error: error.message,
    });
  }
};

/**
 * 8. DELETE /api/admin/devices/:id
 * Xóa mềm thiết bị vi phạm chính sách sàn (isDeleted = true, status = hidden)
 */
export const deleteDevice = async (req, res) => {
  try {
    const { id } = req.params;

    const device = await Device.findById(id);
    if (!device) {
      return res.status(404).json({
        success: false,
        message: 'Không tìm thấy thiết bị cần xóa.',
      });
    }

    device.isDeleted = true;
    device.status = 'hidden';
    await device.save();

    // Thông báo cho chủ máy
    await Notification.create({
      userId: device.ownerId,
      title: 'Thiết bị đã bị gỡ khỏi sàn ⚠️',
      body: `Thiết bị "${device.name}" của bạn đã bị Quản trị viên gỡ bỏ do vi phạm quy định cộng đồng TechShare.`,
      type: 'system',
    });

    return res.status(200).json({
      success: true,
      message: `Thiết bị "${device.name}" đã được xóa mềm thành công (isDeleted: true).`,
      data: {
        id: device._id,
        name: device.name,
        isDeleted: device.isDeleted,
      },
    });
  } catch (error) {
    console.error('❌ [Admin deleteDevice] Lỗi:', error);
    return res.status(500).json({
      success: false,
      message: 'Không thể xóa thiết bị.',
      error: error.message,
    });
  }
};

/**
 * 9. GET /api/admin/vouchers
 * Lấy danh sách voucher
 */
export const getAdminVouchers = async (req, res) => {
  try {
    const vouchers = await Voucher.find().sort({ createdAt: -1 });
    return res.status(200).json({ success: true, data: vouchers });
  } catch (error) {
    return res.status(500).json({ success: false, message: 'Lỗi lấy danh sách voucher', error: error.message });
  }
};

/**
 * 10. POST /api/admin/vouchers
 * Tạo voucher mới
 */
export const createVoucher = async (req, res) => {
  try {
    const voucher = await Voucher.create(req.body);
    return res.status(201).json({ success: true, message: 'Tạo voucher thành công', data: voucher });
  } catch (error) {
    return res.status(500).json({ success: false, message: 'Lỗi tạo voucher', error: error.message });
  }
};

/**
 * 11. PUT /api/admin/vouchers/:id
 * Cập nhật voucher
 */
export const updateVoucher = async (req, res) => {
  try {
    const voucher = await Voucher.findByIdAndUpdate(req.params.id, req.body, { new: true, runValidators: true });
    if (!voucher) return res.status(404).json({ success: false, message: 'Không tìm thấy voucher' });
    return res.status(200).json({ success: true, message: 'Cập nhật voucher thành công', data: voucher });
  } catch (error) {
    return res.status(500).json({ success: false, message: 'Lỗi cập nhật voucher', error: error.message });
  }
};

/**
 * 12. DELETE /api/admin/vouchers/:id
 * Xóa voucher
 */
export const deleteVoucher = async (req, res) => {
  try {
    const voucher = await Voucher.findByIdAndDelete(req.params.id);
    if (!voucher) return res.status(404).json({ success: false, message: 'Không tìm thấy voucher' });
    return res.status(200).json({ success: true, message: 'Xóa voucher thành công' });
  } catch (error) {
    return res.status(500).json({ success: false, message: 'Lỗi xóa voucher', error: error.message });
  }
};
