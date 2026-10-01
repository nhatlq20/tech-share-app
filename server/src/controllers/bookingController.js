import Booking from '../models/Booking.js';
import Device from '../models/Device.js';
import Voucher from '../models/Voucher.js';
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

    // Tự động bắn thông báo tức thì đến chủ máy
    if (device.ownerId) {
      createAndSendNotification({
        userId: device.ownerId,
        title: 'Yêu cầu thuê thiết bị mới! 📦',
        body: `Có khách hàng vừa gửi yêu cầu thuê thiết bị "${device.name}" (${totalDays} ngày). Mã đơn: #${bookingCode}.`,
        type: 'order',
        relatedId: booking._id,
        data: {
          bookingId: booking._id.toString(),
          deviceId: device._id.toString(),
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

    // Optionally notify the owner
    if (booking.ownerId) {
      createAndSendNotification({
        userId: booking.ownerId,
        title: 'Đơn thuê đã bị hủy ❌',
        body: `Khách hàng vừa hủy đơn yêu cầu thuê thiết bị. Mã đơn: #${booking.bookingCode}.`,
        type: 'order',
        relatedId: booking._id,
        data: {
          bookingId: booking._id.toString(),
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
