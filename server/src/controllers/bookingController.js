import Booking from '../models/Booking.js';
import Device from '../models/Device.js';
import Voucher from '../models/Voucher.js';
import User from '../models/User.js';
import WalletTransaction from '../models/WalletTransaction.js';
import { createAndSendNotification } from '../services/notificationService.js';

// @desc    Create new booking
// @route   POST /api/bookings
// @access  Private
export const createBooking = async (req, res) => {
  try {
    const { deviceId, startDate, endDate, voucherCode, deliveryMethod, deliveryAddress } = req.body;

    if (!deviceId || !startDate || !endDate) {
      return res.status(400).json({ message: 'Thiếu thông tin bắt buộc' });
    }

    const device = await Device.findById(deviceId);
    if (!device) {
      return res.status(404).json({ message: 'Không tìm thấy thiết bị' });
    }

    const start = new Date(startDate);
    const end = new Date(endDate);
    
    if (start >= end) {
      return res.status(400).json({ message: 'Thời gian trả máy phải sau thời gian nhận máy' });
    }

    const diffTime = Math.abs(end - start);
    let totalDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    if (totalDays === 0) totalDays = 1;

    const pricePerDayAtBooking = device.dailyRate;
    const rentalFee = totalDays * pricePerDayAtBooking;
    const depositFee = device.depositValue || 0;

    // Apply long-term discount
    let discountPercent = 0;
    if (totalDays >= 7) {
      discountPercent = 20;
    } else if (totalDays >= 3) {
      discountPercent = 10;
    }

    const longTermDiscountAmount = (rentalFee * discountPercent) / 100;
    let baseAmountAfterDiscount = rentalFee - longTermDiscountAmount;

    // Apply voucher
    let voucherDiscount = 0;
    let appliedVoucherCode = '';

    if (voucherCode) {
      const voucher = await Voucher.findOne({ code: voucherCode.toUpperCase(), isActive: true });
      if (
        voucher &&
        (!voucher.expiryDate || new Date(voucher.expiryDate) >= new Date()) &&
        (!voucher.usageLimit || voucher.usedCount < voucher.usageLimit) &&
        (!voucher.minDays || totalDays >= voucher.minDays)
      ) {
        if (voucher.type === 'percent') {
          voucherDiscount = (baseAmountAfterDiscount * voucher.value) / 100;
          if (voucher.maxDiscount && voucherDiscount > voucher.maxDiscount) {
            voucherDiscount = voucher.maxDiscount;
          }
        } else if (voucher.type === 'fixed') {
          voucherDiscount = voucher.value;
        }

        if (voucherDiscount > baseAmountAfterDiscount) {
          voucherDiscount = baseAmountAfterDiscount;
        }

        appliedVoucherCode = voucher.code;
        voucher.usedCount += 1;
        await voucher.save();
      }
    }

    const totalAmount = baseAmountAfterDiscount - voucherDiscount + depositFee;
    
    const randomSuffix = Math.floor(Math.random() * 1000).toString().padStart(3, '0');
    const bookingCode = 'B' + Date.now().toString().slice(-6) + randomSuffix;

    const booking = await Booking.create({
      bookingCode,
      deviceId,
      renterId: req.auth.id || req.auth._id,
      ownerId: device.ownerId, // assuming device schema has ownerId
      startDate,
      endDate,
      totalDays,
      pricePerDayAtBooking,
      rentalFee,
      discountPercent,
      depositFee,
      voucherCode: appliedVoucherCode,
      voucherDiscount,
      totalAmount,
      deliveryMethod: deliveryMethod || 'pickup',
      deliveryAddress: deliveryAddress || '',
      status: 'pending',
      paymentStatus: 'unpaid',
      timeline: [{ status: 'pending', note: 'Booking created' }]
    });

    // Tự động bắn thông báo tức thì đến chủ máy kèm tên khách thuê
    if (device.ownerId) {
      const renter = await User.findById(req.auth.id || req.auth._id).select('name');
      const renterName = renter?.name || 'Khách thuê';
      createAndSendNotification({
        userId: device.ownerId,
        title: 'Yêu cầu thuê thiết bị mới! 📦',
        body: `Khách hàng ${renterName} vừa gửi yêu cầu thuê thiết bị "${device.name}" (${totalDays} ngày). Mã đơn: #${bookingCode}. Bấm để duyệt ngay.`,
        type: 'order',
        relatedId: booking._id,
        data: {
          bookingId: booking._id.toString(),
          deviceId: device._id.toString(),
          status: 'pending',
        },
      }).catch(err => console.error('❌ Lỗi gửi thông báo cho chủ máy:', err.message));
    }

    res.status(201).json(booking);
  } catch (error) {
    console.error('Error creating booking:', error);
    res.status(500).json({ message: 'Lỗi máy chủ khi tạo booking' });
  }
};

// @desc    Get my bookings
// @route   GET /api/bookings/my-bookings
// @access  Private
export const getMyBookings = async (req, res) => {
  try {
    const renterId = req.auth.id || req.auth._id;
    const { status } = req.query;

    let query = { renterId };
    if (status) {
      query.status = status;
    }

    const bookings = await Booking.find(query)
      .populate('deviceId', 'name images brand model category pricePerDay dailyRate depositValue')
      .populate('ownerId', 'name avatar phone email')
      .sort({ createdAt: -1 });

    res.status(200).json({ success: true, data: bookings });
  } catch (error) {
    console.error('Error getting my bookings:', error);
    res.status(500).json({ success: false, message: 'Lỗi máy chủ khi lấy danh sách đơn' });
  }
};

// @desc    Cancel a booking
// @route   PUT /api/bookings/:id/cancel
// @access  Private
export const cancelBooking = async (req, res) => {
  try {
    const bookingId = req.params.id;
    const { reason } = req.body;
    const userId = req.auth.id || req.auth._id;

    const booking = await Booking.findOne({ _id: bookingId, renterId: userId });
    if (!booking) {
      return res.status(404).json({ success: false, message: 'Không tìm thấy đơn thuê' });
    }

    if (booking.status !== 'pending') {
      return res.status(400).json({ success: false, message: 'Chỉ có thể hủy đơn đang chờ duyệt' });
    }

    booking.status = 'cancelled';
    booking.timeline.push({
      status: 'cancelled',
      note: `Người thuê đã hủy đơn. Lý do: ${reason || 'Không có'}`,
    });

    await booking.save();

    // Bắn thông báo chi tiết cho chủ máy khi khách hủy đơn
    if (booking.ownerId) {
      const renter = await User.findById(userId).select('name');
      const renterName = renter?.name || 'Khách thuê';
      const dev = await Device.findById(booking.deviceId).select('name');
      const deviceName = dev?.name || 'thiết bị';
      createAndSendNotification({
        userId: booking.ownerId,
        title: 'Đơn thuê đã bị hủy ⚠️',
        body: `Khách thuê ${renterName} đã hủy đơn yêu cầu thuê "${deviceName}" (#${booking.bookingCode}). Thiết bị đã tự động mở lại lịch trống.`,
        type: 'order',
        relatedId: booking._id,
        data: {
          bookingId: booking._id.toString(),
          status: 'cancelled',
        },
      }).catch(err => console.error('❌ Lỗi gửi thông báo cho chủ máy:', err.message));
    }

    res.status(200).json({ success: true, data: booking });
  } catch (error) {
    console.error('Error cancelling booking:', error);
    res.status(500).json({ success: false, message: 'Lỗi máy chủ khi hủy đơn' });
  }
};

// @desc    Request rental extension for active booking
// @route   POST /api/bookings/:id/extend
// @access  Private
export const requestExtension = async (req, res) => {
  try {
    const bookingId = req.params.id;
    const { additionalDays, requestedDays } = req.body;
    const userId = req.auth.id || req.auth._id;

    const days = parseInt(additionalDays || requestedDays, 10);
    if (!days || isNaN(days) || days <= 0) {
      return res.status(400).json({
        success: false,
        message: 'Số ngày gia hạn không hợp lệ (tối thiểu 1 ngày)',
      });
    }

    const booking = await Booking.findOne({ _id: bookingId, renterId: userId }).populate('deviceId');
    if (!booking) {
      return res.status(404).json({ success: false, message: 'Không tìm thấy đơn thuê của bạn' });
    }

    if (booking.status !== 'active') {
      return res.status(400).json({
        success: false,
        message: 'Chỉ có thể gửi yêu cầu gia hạn cho đơn thuê đang trong thời gian sử dụng (active)',
      });
    }

    if (booking.extensionRequest && booking.extensionRequest.status === 'pending') {
      return res.status(400).json({
        success: false,
        message: 'Đơn thuê này đang có một yêu cầu gia hạn chờ chủ máy phê duyệt',
      });
    }

    const currentEndDate = new Date(booking.endDate);
    const newEndDate = new Date(currentEndDate.getTime() + days * 24 * 60 * 60 * 1000);
    const dailyRate =
      booking.pricePerDayAtBooking ||
      booking.deviceId?.dailyRate ||
      booking.deviceId?.pricePerDay ||
      (booking.totalDays > 0 ? Math.round(booking.rentalFee / booking.totalDays) : 0);

    const additionalFee = Math.round(days * dailyRate);

    booking.extensionRequest = {
      requestedEndDate: newEndDate,
      requestedDays: days,
      additionalFee,
      status: 'pending',
    };

    booking.timeline.push({
      status: 'extension_requested',
      timestamp: new Date(),
      note: `Yêu cầu gia hạn thêm ${days} ngày (đến ${newEndDate.toLocaleDateString('vi-VN')}), phụ phí: ${additionalFee.toLocaleString('vi-VN')} đ`,
    });

    await booking.save();

    // Gửi thông báo đến chủ máy
    if (booking.ownerId) {
      createAndSendNotification({
        userId: booking.ownerId,
        title: 'Yêu cầu gia hạn đơn thuê! ⏳',
        body: `Khách hàng đề xuất gia hạn thêm ${days} ngày cho đơn #${booking.bookingCode}. Phụ phí: ${additionalFee.toLocaleString('vi-VN')} đ.`,
        type: 'order',
        relatedId: booking._id,
        data: {
          bookingId: booking._id.toString(),
          type: 'extension_request',
        },
      }).catch((err) => console.error('❌ Lỗi gửi thông báo gia hạn cho chủ máy:', err.message));
    }

    res.status(200).json({
      success: true,
      message: 'Đã gửi yêu cầu gia hạn tới chủ máy thành công',
      data: booking,
    });
  } catch (error) {
    console.error('Error requesting extension:', error);
    res.status(500).json({ success: false, message: 'Lỗi máy chủ khi gửi yêu cầu gia hạn' });
  }
};

// @desc    Owner approves or rejects rental extension
// @route   PUT /api/bookings/:id/respond-extension
// @access  Private
export const respondExtension = async (req, res) => {
  try {
    const bookingId = req.params.id;
    const { action, rejectReason } = req.body;
    const ownerId = req.auth.id || req.auth._id;

    const booking = await Booking.findOne({ _id: bookingId, ownerId });
    if (!booking) {
      return res.status(404).json({ success: false, message: 'Không tìm thấy đơn thuê của bạn' });
    }

    if (!booking.extensionRequest || booking.extensionRequest.status !== 'pending') {
      return res.status(400).json({
        success: false,
        message: 'Không có yêu cầu gia hạn nào đang chờ xử lý',
      });
    }

    if (action === 'approve') {
      const extraDays = booking.extensionRequest.requestedDays;
      const extraFee = booking.extensionRequest.additionalFee;

      booking.endDate = booking.extensionRequest.requestedEndDate;
      booking.totalDays = (booking.totalDays || 0) + extraDays;
      booking.rentalFee = (booking.rentalFee || 0) + extraFee;
      booking.totalAmount = (booking.totalAmount || 0) + extraFee;
      booking.extensionRequest.status = 'approved';

      // Reset reminders để hệ thống quét nhắc trước hạn trả mới
      booking.reminder6hSent = false;
      booking.reminder2hSent = false;

      booking.timeline.push({
        status: 'extension_approved',
        timestamp: new Date(),
        note: `Chủ máy đã chấp thuận gia hạn thêm ${extraDays} ngày. Hạn trả mới: ${new Date(booking.endDate).toLocaleDateString('vi-VN')}`,
      });

      await booking.save();

      createAndSendNotification({
        userId: booking.renterId,
        title: 'Yêu cầu gia hạn đã được duyệt! 🎉',
        body: `Chủ máy đã đồng ý gia hạn thêm ${extraDays} ngày cho đơn #${booking.bookingCode}. Hạn trả mới: ${new Date(booking.endDate).toLocaleDateString('vi-VN')}.`,
        type: 'order',
        relatedId: booking._id,
        data: { bookingId: booking._id.toString() },
      }).catch((err) => console.error('❌ Lỗi gửi thông báo cho người thuê:', err.message));

      return res.status(200).json({
        success: true,
        message: 'Đã phê duyệt yêu cầu gia hạn thành công',
        data: booking,
      });
    } else if (action === 'reject') {
      booking.extensionRequest.status = 'rejected';
      booking.timeline.push({
        status: 'extension_rejected',
        timestamp: new Date(),
        note: `Chủ máy đã từ chối yêu cầu gia hạn. Lý do: ${rejectReason || 'Không có'}`,
      });

      await booking.save();

      createAndSendNotification({
        userId: booking.renterId,
        title: 'Yêu cầu gia hạn không được chấp thuận ❌',
        body: `Chủ máy không thể gia hạn thêm cho đơn #${booking.bookingCode}. Vui lòng sắp xếp hoàn trả máy đúng hạn.`,
        type: 'order',
        relatedId: booking._id,
        data: { bookingId: booking._id.toString() },
      }).catch((err) => console.error('❌ Lỗi gửi thông báo từ chối gia hạn:', err.message));

      return res.status(200).json({
        success: true,
        message: 'Đã từ chối yêu cầu gia hạn',
        data: booking,
      });
    } else {
      return res.status(400).json({ success: false, message: 'Hành động không hợp lệ' });
    }
  } catch (error) {
    console.error('Error responding to extension:', error);
    res.status(500).json({ success: false, message: 'Lỗi máy chủ khi phản hồi gia hạn' });
  }
};

// @desc    Get owner's bookings (requests sent to owner's devices)
// @route   GET /api/bookings/owner-bookings
// @access  Private (Owner)
export const getOwnerBookings = async (req, res) => {
  try {
    const ownerId = req.auth.id || req.auth._id;
    const { status } = req.query;

    // Tìm tất cả thiết bị thuộc sở hữu của chủ máy này
    const myDevices = await Device.find({
      $or: [
        { ownerId },
        { owner: ownerId },
      ],
    }).select('_id');
    const myDeviceIds = myDevices.map(d => d._id);

    // Điều kiện: đơn trực tiếp theo ownerId HOẶC đơn của thiết bị thuộc chủ máy
    const ownerMatch = [
      { ownerId },
      ...(myDeviceIds.length > 0 ? [{ deviceId: { $in: myDeviceIds } }] : []),
    ];

    let query = { $or: ownerMatch };
    if (status) {
      query.status = status;
    }

    const bookings = await Booking.find(query)
      .populate('deviceId', 'name title images brand model category pricePerDay dailyRate depositAmount depositValue location addressText')
      .populate('renterId', 'name avatar phone email trustScore isVerified')
      .sort({ createdAt: -1 });

    res.status(200).json({ success: true, data: bookings });
  } catch (error) {
    console.error('Error getting owner bookings:', error);
    res.status(500).json({ success: false, message: 'Lỗi máy chủ khi lấy danh sách đơn của chủ máy' });
  }
};

// @desc    Owner approves or rejects a booking request
// @route   PATCH /api/bookings/:id/status
// @access  Private (Owner)
export const updateBookingStatusByOwner = async (req, res) => {
  try {
    const bookingId = req.params.id;
    const { status, reason } = req.body;
    const ownerId = req.auth.id || req.auth._id;

    if (!['approved', 'rejected', 'active', 'completed'].includes(status)) {
      return res.status(400).json({
        success: false,
        message: 'Trạng thái không hợp lệ. Chỉ có thể duyệt (approved), từ chối (rejected), bàn giao (active) hoặc hoàn tất (completed).',
      });
    }

    // Tìm các thiết bị thuộc sở hữu của owner để cấp quyền duyệt
    const myDevices = await Device.find({
      $or: [
        { ownerId },
        { owner: ownerId },
      ],
    }).select('_id');
    const myDeviceIds = myDevices.map(d => d._id);

    const booking = await Booking.findOne({
      _id: bookingId,
      $or: [
        { ownerId },
        ...(myDeviceIds.length > 0 ? [{ deviceId: { $in: myDeviceIds } }] : []),
      ],
    })
      .populate('deviceId', 'name title images brand')
      .populate('renterId', 'name avatar');

    if (!booking) {
      return res.status(404).json({
        success: false,
        message: 'Không tìm thấy đơn thuê hoặc bạn không phải chủ sở hữu của đơn này',
      });
    }

    const deviceName = booking.deviceId?.name || booking.deviceId?.title || 'thiết bị';
    const renterName = booking.renterId?.name || 'Khách thuê';

    if (status === 'approved') {
      if (booking.status !== 'pending') {
        return res.status(400).json({
          success: false,
          message: `Đơn thuê hiện đang ở trạng thái "${booking.status}", chỉ có thể duyệt đơn đang chờ duyệt (pending).`,
        });
      }

      booking.status = 'approved';
      booking.timeline.push({
        status: 'approved',
        timestamp: new Date(),
        note: 'Chủ máy đã phê duyệt yêu cầu thuê.',
      });

      await booking.save();

      // Gửi thông báo cho người thuê
      createAndSendNotification({
        userId: booking.renterId?._id || booking.renterId,
        title: 'Đơn thuê đã được duyệt! 🎉',
        body: `Chủ máy đã phê duyệt yêu cầu thuê thiết bị "${deviceName}". Mã đơn: #${booking.bookingCode}. Vui lòng chuẩn bị nhận máy theo lịch hẹn.`,
        type: 'order',
        relatedId: booking._id,
        data: {
          bookingId: booking._id.toString(),
          status: 'approved',
        },
      }).catch(err => console.error('❌ Lỗi gửi thông báo duyệt đơn cho renter:', err.message));

      return res.status(200).json({
        success: true,
        message: 'Đã phê duyệt đơn thuê thành công',
        data: booking,
      });
    } else if (status === 'rejected') {
      if (booking.status !== 'pending') {
        return res.status(400).json({
          success: false,
          message: `Đơn thuê hiện đang ở trạng thái "${booking.status}", chỉ có thể từ chối đơn đang chờ duyệt (pending).`,
        });
      }

      booking.status = 'rejected';
      booking.rejectReason = reason || 'Chủ máy bận hoặc thiết bị chưa sẵn sàng';
      booking.timeline.push({
        status: 'rejected',
        timestamp: new Date(),
        note: `Chủ máy đã từ chối yêu cầu thuê. Lý do: ${booking.rejectReason}`,
      });

      await booking.save();

      // Gửi thông báo cho người thuê
      createAndSendNotification({
        userId: booking.renterId?._id || booking.renterId,
        title: 'Đơn thuê bị từ chối ❌',
        body: `Rất tiếc, chủ máy đã từ chối đơn thuê #${booking.bookingCode} (${deviceName}). Lý do: ${booking.rejectReason}.`,
        type: 'order',
        relatedId: booking._id,
        data: {
          bookingId: booking._id.toString(),
          status: 'rejected',
        },
      }).catch(err => console.error('❌ Lỗi gửi thông báo từ chối đơn cho renter:', err.message));

      return res.status(200).json({
        success: true,
        message: 'Đã từ chối đơn thuê',
        data: booking,
      });
    } else if (status === 'active') {
      if (booking.status !== 'approved') {
        return res.status(400).json({
          success: false,
          message: `Chỉ có thể bàn giao đơn đã được duyệt (approved). Trạng thái hiện tại: "${booking.status}".`,
        });
      }

      booking.status = 'active';
      booking.timeline.push({
        status: 'active',
        timestamp: new Date(),
        note: 'Chủ máy và khách thuê đã đối soát bàn giao thiết bị thành công. Đơn thuê kích hoạt.',
      });

      await booking.save();

      // 1. Gửi thông báo cho Người thuê (Renter)
      createAndSendNotification({
        userId: booking.renterId?._id || booking.renterId,
        title: 'Bàn giao thiết bị thành công! 📱',
        body: `Bạn đã nhận thiết bị "${deviceName}". Đơn thuê #${booking.bookingCode} chính thức kích hoạt. Hãy bảo quản máy cẩn thận.`,
        type: 'order',
        relatedId: booking._id,
        data: {
          bookingId: booking._id.toString(),
          status: 'active',
        },
      }).catch(err => console.error('❌ Lỗi gửi thông báo bàn giao cho renter:', err.message));

      // 2. Gửi thông báo cho Chủ máy (Owner)
      createAndSendNotification({
        userId: booking.ownerId,
        title: 'Đã bàn giao thiết bị 🤝',
        body: `Bạn đã bàn giao thiết bị "${deviceName}" cho khách thuê ${renterName}. Trạng thái đơn: Đang thuê.`,
        type: 'order',
        relatedId: booking._id,
        data: {
          bookingId: booking._id.toString(),
          status: 'active',
        },
      }).catch(err => console.error('❌ Lỗi gửi thông báo bàn giao cho owner:', err.message));

      return res.status(200).json({
        success: true,
        message: 'Đã bàn giao thiết bị thành công. Đơn thuê đang hoạt động.',
        data: booking,
      });
    } else if (status === 'completed') {
      if (booking.status !== 'active') {
        return res.status(400).json({
          success: false,
          message: `Chỉ có thể hoàn tất đơn đang thuê (active). Trạng thái hiện tại: "${booking.status}".`,
        });
      }

      booking.status = 'completed';
      booking.timeline.push({
        status: 'completed',
        timestamp: new Date(),
        note: 'Chủ máy đã kiểm tra máy nguyên vẹn và xác nhận nhận lại thiết bị. Đơn thuê hoàn tất.',
      });

      await booking.save();

      const depositAmount = booking.depositFee || 0;
      const rentalIncome = booking.rentalFee || 0;

      // Giải tỏa cọc cho Renter nếu có cọc
      if (depositAmount > 0) {
        await User.findByIdAndUpdate(booking.renterId?._id || booking.renterId, {
          $inc: { walletBalance: depositAmount, walletEscrowBalance: -depositAmount },
        }).catch(err => console.warn('Lỗi cập nhật ví renter:', err.message));

        await WalletTransaction.create({
          userId: booking.renterId?._id || booking.renterId,
          type: 'deposit_refund',
          amount: depositAmount,
          relatedBookingId: booking._id,
          status: 'success',
        }).catch(err => console.warn('Lỗi tạo transaction refund:', err.message));
      }

      // Cộng tiền doanh thu thuê vào ví Owner
      if (rentalIncome > 0) {
        await User.findByIdAndUpdate(booking.ownerId, {
          $inc: { walletBalance: rentalIncome },
        }).catch(err => console.warn('Lỗi cộng ví owner:', err.message));

        await WalletTransaction.create({
          userId: booking.ownerId,
          type: 'rental_income',
          amount: rentalIncome,
          relatedBookingId: booking._id,
          status: 'success',
        }).catch(err => console.warn('Lỗi tạo transaction income:', err.message));
      }

      // 1. Gửi thông báo cho Renter (Kèm thông tin hoàn cọc)
      createAndSendNotification({
        userId: booking.renterId?._id || booking.renterId,
        title: 'Đơn thuê hoàn tất & Hoàn tiền cọc! 💸',
        body: `Đơn thuê #${booking.bookingCode} đã hoàn tất. Tiền cọc ${depositAmount.toLocaleString('vi-VN')} đ đã được giải tỏa hoàn trả về ví của bạn. Đừng quên đánh giá thiết bị nhé!`,
        type: 'order',
        relatedId: booking._id,
        data: {
          bookingId: booking._id.toString(),
          status: 'completed',
        },
      }).catch(err => console.error('❌ Lỗi gửi thông báo hoàn tất cho renter:', err.message));

      // 2. Gửi thông báo cho Owner (Kèm thông tin doanh thu)
      createAndSendNotification({
        userId: booking.ownerId,
        title: 'Đơn thuê hoàn tất thành công! 💰',
        body: `Đã nhận lại thiết bị "${deviceName}". Doanh thu ${rentalIncome.toLocaleString('vi-VN')} đ đã được cộng vào số dư ví khả dụng của bạn.`,
        type: 'order',
        relatedId: booking._id,
        data: {
          bookingId: booking._id.toString(),
          status: 'completed',
        },
      }).catch(err => console.error('❌ Lỗi gửi thông báo hoàn tất cho owner:', err.message));

      return res.status(200).json({
        success: true,
        message: 'Đã hoàn tất đơn thuê và giải tỏa tiền cọc / doanh thu thành công.',
        data: booking,
      });
    }
  } catch (error) {
    console.error('Error updating booking status by owner:', error);
    res.status(500).json({ success: false, message: 'Lỗi máy chủ khi cập nhật trạng thái đơn thuê' });
  }
};

// @desc    Handover booking (chuyển sang active và thông báo 2 bên)
// @route   PATCH /api/bookings/:id/handover
// @access  Private (Owner)
export const handoverBooking = async (req, res) => {
  req.body.status = 'active';
  return updateBookingStatusByOwner(req, res);
};

// @desc    Complete booking (nhận lại máy, hoàn cọc và cộng doanh thu)
// @route   PATCH /api/bookings/:id/complete
// @access  Private (Owner)
export const completeBooking = async (req, res) => {
  req.body.status = 'completed';
  return updateBookingStatusByOwner(req, res);
};

