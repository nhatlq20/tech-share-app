import Booking from '../models/Booking.js';
import Device from '../models/Device.js';
import Voucher from '../models/Voucher.js';

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

    res.status(201).json(booking);
  } catch (error) {
    console.error('Error creating booking:', error);
    res.status(500).json({ message: 'Lỗi máy chủ khi tạo booking' });
  }
};
