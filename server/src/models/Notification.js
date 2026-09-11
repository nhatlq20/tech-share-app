import mongoose from 'mongoose';

const notificationSchema = new mongoose.Schema(
  {
    recipient: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'Người nhận thông báo là bắt buộc'],
      index: true,
    },
    title: {
      type: String,
      required: [true, 'Tiêu đề thông báo là bắt buộc'],
      trim: true,
    },
    body: {
      type: String,
      required: [true, 'Nội dung thông báo là bắt buộc'],
    },
    type: {
      type: String,
      enum: ['booking_request', 'booking_approved', 'booking_cancelled', 'reminder', 'system'],
      default: 'system',
    },
    data: {
      bookingId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Booking',
      },
      deviceId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Device',
      },
    },
    isRead: {
      type: Boolean,
      default: false,
      index: true,
    },
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

notificationSchema.index({ recipient: 1, isRead: 1, createdAt: -1 });

const Notification = mongoose.models.Notification || mongoose.model('Notification', notificationSchema);

export default Notification;
