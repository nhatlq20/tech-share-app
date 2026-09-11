import mongoose from 'mongoose';

const reviewSchema = new mongoose.Schema(
  {
    booking: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Booking',
      required: [true, 'Đơn thuê tham chiếu là bắt buộc'],
      unique: true, // Mỗi đơn thuê chỉ đánh giá 1 lần
    },
    device: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Device',
      required: [true, 'Thiết bị đánh giá là bắt buộc'],
      index: true,
    },
    reviewer: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'Người đánh giá là bắt buộc'],
    },
    targetUser: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'Đối tượng được đánh giá là bắt buộc'],
      index: true,
    },
    rating: {
      type: Number,
      required: [true, 'Số sao đánh giá là bắt buộc'],
      min: [1, 'Đánh giá tối thiểu 1 sao'],
      max: [5, 'Đánh giá tối đa 5 sao'],
    },
    comment: {
      type: String,
      required: [true, 'Nội dung nhận xét là bắt buộc'],
      maxlength: [1000, 'Nội dung nhận xét không quá 1000 ký tự'],
    },
    images: [{ type: String }],
  },
  {
    timestamps: true,
    toJSON: {
      virtuals: true,
      transform: (doc, ret) => {
        delete ret.__v;
        return ret;
      },
    },
    toObject: { virtuals: true },
  }
);

const Review = mongoose.models.Review || mongoose.model('Review', reviewSchema);

export default Review;
