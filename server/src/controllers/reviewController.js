import Review from '../models/Review.js';
import Booking from '../models/Booking.js';
import Device from '../models/Device.js';
import User from '../models/User.js';
import { createAndSendNotification } from '../services/notificationService.js';
import { calculateAndUpdateOwnerReputation } from '../services/trustScoreService.js';

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

    let review;
    const existingReview = await Review.findOne({ bookingId: booking._id });
    if (existingReview) {
      if (existingReview.comment && existingReview.comment.trim()) {
        booking.isReviewed = true;
        booking.reviewId = existingReview._id;
        await booking.save();
        return res.status(400).json({
          success: false,
          message: 'Đơn thuê này đã có đánh giá trong hệ thống',
        });
      }
      // Cập nhật đánh giá vào bản ghi đã tạo khi chủ máy chấm điểm trước
      existingReview.rating = numRating;
      existingReview.comment = comment.trim();
      existingReview.ownerRating = numOwnerRating;
      existingReview.ownerFeedback = ownerFeedback ? ownerFeedback.trim() : '';
      existingReview.images = Array.isArray(images) ? images : [];
      await existingReview.save();
      review = existingReview;
    } else {
      // Tạo review mới
      review = await Review.create({
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
    }

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
      const deviceReviews = await Review.find({
        deviceId: booking.deviceId,
        comment: { $exists: true, $ne: '' },
      });
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

    // Tự động tính lại điểm uy tín cho Chủ máy (User) từ collection reviews
    try {
      if (booking.ownerId) {
        await calculateAndUpdateOwnerReputation(booking.ownerId);
      }
    } catch (err) {
      console.error('Lỗi tính lại điểm uy tín cho Chủ máy:', err.message);
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
    const reviews = await Review.find({
      deviceId,
      comment: { $exists: true, $ne: '' },
    })
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

// @desc    Owner rates renter trust score after completed booking
// @route   PATCH /api/reviews/:reviewId/owner-rate
// @access  Private (Owner only)
export const ownerRateRenter = async (req, res) => {
  try {
    const ownerId = req.auth.id || req.auth._id;
    const { reviewId } = req.params;
    const { renterTrustRating, renterFeedback } = req.body;

    const numRating = Number(renterTrustRating);
    if (!numRating || isNaN(numRating) || numRating < 1 || numRating > 5) {
      return res.status(400).json({ success: false, message: 'Đánh giá ý thức phải từ 1 đến 5 sao' });
    }

    let review = await Review.findOne({
      $or: [{ _id: reviewId }, { bookingId: reviewId }],
      ownerId,
    });

    if (!review) {
      // Nếu chưa có review, kiểm tra đơn thuê completed của chủ máy
      const booking = await Booking.findOne({ _id: reviewId, ownerId });
      if (!booking) {
        return res.status(404).json({ success: false, message: 'Không tìm thấy đơn thuê hoặc đánh giá hợp lệ' });
      }
      if (booking.status !== 'completed') {
        return res.status(400).json({ success: false, message: 'Chỉ có thể chấm điểm ý thức cho đơn đã hoàn tất' });
      }

      review = await Review.create({
        bookingId: booking._id,
        deviceId: booking.deviceId,
        renterId: booking.renterId,
        ownerId: booking.ownerId,
        rating: 5,
        comment: '',
        ownerRating: 5,
        ownerFeedback: '',
        renterTrustRating: numRating,
        renterFeedback: renterFeedback ? renterFeedback.trim() : '',
      });

      booking.reviewId = review._id;
      await booking.save();
    } else {
      if (review.renterTrustRating) {
        return res.status(400).json({ success: false, message: 'Bạn đã đánh giá ý thức khách thuê cho đơn này rồi' });
      }

      // Lưu đánh giá từ chủ máy vào Review document
      review.renterTrustRating = numRating;
      review.renterFeedback = renterFeedback ? renterFeedback.trim() : '';
      await review.save();
    }

    // Tính lại trustScore cho khách thuê (0-100 scale)
    // Map: 5★=+2, 4★=+1, 3★=0, 2★=-5, 1★=-10
    const TRUST_DELTA = { 5: 2, 4: 1, 3: 0, 2: -5, 1: -10 };
    const delta = TRUST_DELTA[numRating] ?? 0;

    if (delta !== 0) {
      try {
        const renter = await User.findById(review.renterId);
        if (renter) {
          const currentScore = renter.trustScore ?? 100;
          const newScore = Math.max(0, Math.min(100, currentScore + delta));
          await User.findByIdAndUpdate(review.renterId, { trustScore: newScore });
        }
      } catch (err) {
        console.error('Lỗi cập nhật trustScore cho khách thuê:', err.message);
      }
    }

    // Gửi thông báo cho khách thuê
    try {
      const booking = await Booking.findById(review.bookingId);
      if (booking && booking.renterId) {
        const starEmoji = numRating >= 4 ? '⭐' : numRating >= 3 ? '🙂' : '⚠️';
        const deltaText = delta > 0 ? `Điểm tín nhiệm +${delta} 🏆` : delta < 0 ? `Điểm tín nhiệm ${delta} ⚠️` : 'Điểm tín nhiệm không đổi.';
        createAndSendNotification({
          userId: booking.renterId,
          title: `Chủ máy đã đánh giá ý thức của bạn ${starEmoji}`,
          body: `Đơn #${booking.bookingCode}: ${numRating} sao ý thức. ${deltaText}`,
          type: 'order',
          relatedId: review._id,
          data: { bookingId: booking._id.toString(), reviewId: review._id.toString() },
        }).catch((err) => console.error('❌ Lỗi gửi thông báo owner-rate:', err.message));
      }
    } catch (err) {
      console.error('Lỗi gửi thông báo:', err.message);
    }

    res.status(200).json({
      success: true,
      message: 'Đánh giá ý thức khách thuê đã được ghi nhận',
      data: { renterTrustRating: numRating, delta },
    });
  } catch (error) {
    console.error('Error in ownerRateRenter:', error);
    res.status(500).json({ success: false, message: 'Lỗi máy chủ khi đánh giá ý thức khách thuê' });
  }
};

// @desc    Get all reviews where current user is the owner (for rate-renter flow)
// @route   GET /api/reviews/my-owner-reviews
// @access  Private
export const getMyOwnerReviews = async (req, res) => {
  try {
    const ownerId = req.auth.id || req.auth._id;
    const reviews = await Review.find({ ownerId })
      .populate('renterId', 'name avatar trustScore')
      .populate('deviceId', 'name title images')
      .populate('bookingId', 'bookingCode startDate endDate')
      .sort({ createdAt: -1 });
    res.status(200).json({ success: true, data: reviews });
  } catch (error) {
    console.error('Error in getMyOwnerReviews:', error);
    res.status(500).json({ success: false, message: 'Lỗi máy chủ' });
  }
};

// @desc    Recalculate reputation (rating, ownerRating, trustScore, totalReviews) for owner
// @route   POST /api/reviews/recalculate-reputation/:ownerId?
// @access  Private
export const recalculateOwnerReputationController = async (req, res) => {
  try {
    const ownerId = req.params.ownerId || req.body.ownerId || req.auth.id || req.auth._id;
    const result = await calculateAndUpdateOwnerReputation(ownerId);
    res.status(200).json({
      success: true,
      message: 'Tính toán lại điểm uy tín thành công từ collection reviews',
      data: result,
    });
  } catch (error) {
    console.error('Error recalculating owner reputation:', error);
    res.status(500).json({ success: false, message: error.message || 'Lỗi máy chủ khi tính lại điểm uy tín' });
  }
};

