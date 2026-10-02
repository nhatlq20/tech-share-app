import Review from '../models/Review.js';
import Booking from '../models/Booking.js';
import Device from '../models/Device.js';
import User from '../models/User.js';
import { createAndSendNotification } from '../services/notificationService.js';

// @desc    Create a review for a completed booking
// @route   POST /api/reviews
// @access  Private
export const createReview = async (req, res) => {
  try {
    const renterId = req.auth.id || req.auth._id;
    const { bookingId, rating, comment, ownerRating, ownerFeedback, images } = req.body;

    if (!bookingId) {
      return res.status(400).json({ success: false, message: 'Thiếu mã đơn thuê (bookingId)' });
    }

    const numRating = Number(rating);
    if (!numRating || isNaN(numRating) || numRating < 1 || numRating > 5) {
      return res.status(400).json({ success: false, message: 'Đánh giá sản phẩm phải từ 1 đến 5 sao' });
    }

    if (!comment || !comment.trim()) {
      return res.status(400).json({ success: false, message: 'Vui lòng nhập nội dung đánh giá sản phẩm' });
    }

    const numOwnerRating = ownerRating ? Number(ownerRating) : 5;
    if (isNaN(numOwnerRating) || numOwnerRating < 1 || numOwnerRating > 5) {
      return res.status(400).json({ success: false, message: 'Đánh giá dịch vụ chủ máy phải từ 1 đến 5 sao' });
    }

    // Kiểm tra đơn thuê
    const booking = await Booking.findOne({ _id: bookingId, renterId }).populate('deviceId');
    if (!booking) {
      return res.status(404).json({ success: false, message: 'Không tìm thấy đơn thuê hợp lệ của bạn' });
    }

    if (booking.status !== 'completed') {
      return res.status(400).json({
        success: false,
        message: 'Chỉ có thể đánh giá cho các đơn thuê đã hoàn tất (completed)',
      });
    }

    if (booking.isReviewed) {
      return res.status(400).json({
        success: false,
        message: 'Đơn thuê này đã được đánh giá trước đó',
      });
    }

    const existingReview = await Review.findOne({ bookingId: booking._id });
    if (existingReview) {
      booking.isReviewed = true;
      booking.reviewId = existingReview._id;
      await booking.save();
      return res.status(400).json({
        success: false,
        message: 'Đơn thuê này đã có đánh giá trong hệ thống',
      });
    }

    // Tạo review mới
    const review = await Review.create({
      bookingId: booking._id,
      deviceId: booking.deviceId._id || booking.deviceId,
      renterId,
      ownerId: booking.ownerId,
      rating: numRating,
      comment: comment.trim(),
      ownerRating: numOwnerRating,
      ownerFeedback: ownerFeedback ? ownerFeedback.trim() : '',
      images: Array.isArray(images) ? images : [],
    });

    // Cập nhật booking
    booking.isReviewed = true;
    booking.reviewId = review._id;
    booking.timeline.push({
      status: 'reviewed',
      timestamp: new Date(),
      note: `Khách hàng đã gửi đánh giá (${numRating}★ sản phẩm, ${numOwnerRating}★ dịch vụ)`,
    });
    await booking.save();

    // Tự động tính lại điểm trung bình cho Thiết bị
    try {
      const deviceReviews = await Review.find({ deviceId: booking.deviceId });
      if (deviceReviews.length > 0) {
        const totalRating = deviceReviews.reduce((sum, r) => sum + r.rating, 0);
        const ratingAvg = Number((totalRating / deviceReviews.length).toFixed(1));
        await Device.findByIdAndUpdate(booking.deviceId, {
          ratingAvg,
          ratingCount: deviceReviews.length,
        });
      }
    } catch (err) {
      console.error('Lỗi tính lại rating cho Device:', err.message);
    }

    // Tự động tính lại điểm trung bình cho Chủ máy (User)
    try {
      if (booking.ownerId) {
        const ownerReviews = await Review.find({ ownerId: booking.ownerId });
        if (ownerReviews.length > 0) {
          const totalRating = ownerReviews.reduce((sum, r) => sum + (r.ownerRating || r.rating), 0);
          const ownerAvg = Number((totalRating / ownerReviews.length).toFixed(1));
          await User.findByIdAndUpdate(booking.ownerId, {
            rating: ownerAvg,
            totalReviews: ownerReviews.length,
          });
        }
      }
    } catch (err) {
      console.error('Lỗi tính lại rating cho User:', err.message);
    }

    // Bắn thông báo thời gian thực đến chủ máy
    if (booking.ownerId) {
      createAndSendNotification({
        userId: booking.ownerId,
        title: 'Bạn nhận được đánh giá mới! ⭐',
        body: `Khách hàng vừa để lại đánh giá ${numRating} sao cho thiết bị và dịch vụ của bạn (Đơn #${booking.bookingCode}).`,
        type: 'order',
        relatedId: review._id,
        data: {
          bookingId: booking._id.toString(),
          reviewId: review._id.toString(),
        },
      }).catch((err) => console.error('❌ Lỗi gửi thông báo đánh giá:', err.message));
    }

    res.status(201).json({
      success: true,
      message: 'Cảm ơn bạn đã gửi đánh giá và phản hồi!',
      data: review,
    });
  } catch (error) {
    console.error('Error creating review:', error);
    res.status(500).json({ success: false, message: 'Lỗi máy chủ khi gửi đánh giá' });
  }
};

// @desc    Get reviews for a device
// @route   GET /api/reviews/device/:deviceId
// @access  Public
export const getDeviceReviews = async (req, res) => {
  try {
    const { deviceId } = req.params;
    const reviews = await Review.find({ deviceId })
      .populate('renterId', 'name avatar')
      .sort({ createdAt: -1 });

    res.status(200).json({ success: true, data: reviews });
  } catch (error) {
    console.error('Error getting device reviews:', error);
    res.status(500).json({ success: false, message: 'Lỗi máy chủ khi lấy danh sách đánh giá' });
  }
};

// @desc    Get review for a specific booking
// @route   GET /api/reviews/booking/:bookingId
// @access  Private
export const getBookingReview = async (req, res) => {
  try {
    const { bookingId } = req.params;
    const review = await Review.findOne({ bookingId })
      .populate('renterId', 'name avatar')
      .populate('ownerId', 'name avatar');

    if (!review) {
      return res.status(404).json({ success: false, message: 'Đơn thuê chưa có đánh giá' });
    }

    res.status(200).json({ success: true, data: review });
  } catch (error) {
    console.error('Error getting booking review:', error);
    res.status(500).json({ success: false, message: 'Lỗi máy chủ khi lấy đánh giá đơn thuê' });
  }
};
