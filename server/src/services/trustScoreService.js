import mongoose from 'mongoose';
import Review from '../models/Review.js';
import User from '../models/User.js';

/**
 * Tính toán và cập nhật điểm uy tín cho chủ máy (owner) từ collection 'reviews':
 * 1. Kiểm tra ownerId xem có đúng format ObjectId và user có tồn tại không.
 * 2. Lấy các bản ghi đánh giá từ collection 'reviews' theo ownerId.
 * 3. Điểm sản phẩm (rating): trung bình rating sản phẩm (thang 5*).
 * 4. Điểm uy tín người cho thuê (ownerRating): trung bình ownerRating (thang 5*).
 * 5. Điểm tín nhiệm (trustScore): tính dựa trên trung bình 2 điểm và quy đổi ra thang 100.
 *    Công thức: avg = (rating + ownerRating) / 2
 *               trustScore = Math.round((avg / 5) * 100)
 * 6. Tổng số đánh giá (totalReviews / totalReview): tổng số lượng đánh giá thực tế.
 * 7. Lưu lại 4 trường vào User trong MongoDB.
 *
 * @param {string|mongoose.Types.ObjectId} ownerId - ID của chủ máy cần tính điểm
 * @returns {Promise<Object>} 4 trường dữ liệu tính toán và user document đã cập nhật
 */
export const calculateAndUpdateOwnerReputation = async (ownerId) => {
  if (!ownerId) {
    throw new Error('Mã chủ máy (ownerId) là bắt buộc để tính điểm uy tín');
  }

  // 1. Kiểm tra ownerId hợp lệ
  const validOwnerId = mongoose.Types.ObjectId.isValid(ownerId)
    ? new mongoose.Types.ObjectId(ownerId)
    : null;

  if (!validOwnerId) {
    throw new Error('Định dạng ownerId không hợp lệ');
  }

  const user = await User.findById(validOwnerId);
  if (!user) {
    throw new Error(`Không tìm thấy người dùng với ID: ${ownerId}`);
  }

  // 2. Lấy danh sách đánh giá từ collection reviews
  const ownerReviews = await Review.find({
    ownerId: validOwnerId,
    $or: [
      { comment: { $exists: true, $ne: '' } },
      { rating: { $exists: true, $gte: 1 } },
    ],
  });

  const totalReviews = ownerReviews.length;

  let rating = 5.0;
  let ownerRating = 5.0;
  let trustScore = 100;

  if (totalReviews > 0) {
    // 3. Điểm sản phẩm thang điểm 5*
    const sumRating = ownerReviews.reduce((sum, r) => sum + (Number(r.rating) || 5), 0);
    rating = Number((sumRating / totalReviews).toFixed(1));

    // 4. Điểm uy tín người cho thuê thang điểm 5*
    const sumOwnerRating = ownerReviews.reduce(
      (sum, r) => sum + (Number(r.ownerRating) || Number(r.rating) || 5),
      0
    );
    ownerRating = Number((sumOwnerRating / totalReviews).toFixed(1));

    // 5. Trust score tính dựa trên trung bình 2 điểm và quy đổi ra thang điểm 100
    // Thang điểm 5: avg = (rating + ownerRating) / 2
    // Quy ra thang 100: (avg / 5) * 100 = avg * 20
    const avgScore5 = (rating + ownerRating) / 2;
    trustScore = Math.max(0, Math.min(100, Math.round((avgScore5 / 5) * 100)));
  }

  // 6. Cập nhật 4 trường vào User model
  const updatedUser = await User.findByIdAndUpdate(
    validOwnerId,
    {
      $set: {
        rating,
        ownerRating,
        trustScore,
        totalReviews,
      },
    },
    { new: true, runValidators: true }
  );

  return {
    success: true,
    ownerId: validOwnerId.toString(),
    rating,
    ownerRating,
    trustScore,
    totalReviews,
    totalReview: totalReviews,
    user: updatedUser,
  };
};

/**
 * Tính toán lại điểm uy tín cho tất cả chủ máy / người dùng có đánh giá
 */
export const recalculateAllUsersReputation = async () => {
  const distinctOwnerIds = await Review.distinct('ownerId');
  const results = [];

  for (const ownerId of distinctOwnerIds) {
    if (ownerId) {
      try {
        const res = await calculateAndUpdateOwnerReputation(ownerId);
        results.push(res);
      } catch (err) {
        console.error(`Lỗi tính lại uy tín cho user ${ownerId}:`, err.message);
      }
    }
  }

  return results;
};
