import Voucher from '../models/Voucher.js';

// @desc    Validate a voucher code
// @route   POST /api/vouchers/validate
// @access  Private
export const validateVoucher = async (req, res) => {
  try {
    const { code, rentalDays } = req.body;

    if (!code) {
      return res.status(400).json({ message: 'Vui lòng nhập mã voucher' });
    }

    const voucher = await Voucher.findOne({ code: code.toUpperCase(), isActive: true });

    if (!voucher) {
      return res.status(404).json({ message: 'Mã voucher không tồn tại hoặc đã hết hạn' });
    }

    // Check expiry
    if (voucher.expiryDate && new Date(voucher.expiryDate) < new Date()) {
      return res.status(400).json({ message: 'Mã voucher đã hết hạn' });
    }

    // Check usage limit
    if (voucher.usageLimit && voucher.usedCount >= voucher.usageLimit) {
      return res.status(400).json({ message: 'Mã voucher đã hết số lượng sử dụng' });
    }

    // Check min days requirement
    if (voucher.minDays && rentalDays && rentalDays < voucher.minDays) {
      return res.status(400).json({ message: `Mã voucher yêu cầu thuê tối thiểu ${voucher.minDays} ngày` });
    }

    res.status(200).json({
      message: 'Áp dụng mã voucher thành công',
      voucher: {
        code: voucher.code,
        type: voucher.type,
        value: voucher.value,
        maxDiscount: voucher.maxDiscount,
      }
    });

  } catch (error) {
    console.error('Error validating voucher:', error);
    res.status(500).json({ message: 'Lỗi máy chủ khi kiểm tra voucher' });
  }
};
