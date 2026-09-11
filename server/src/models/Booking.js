import mongoose from 'mongoose';

const bookingSchema = new mongoose.Schema(
  {
    bookingCode: {
      type: String,
      unique: true,
      required: true,
      index: true,
    },
    device: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Device',
      required: [true, 'Thiết bị đặt thuê là bắt buộc'],
      index: true,
    },
    renter: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'Người thuê là bắt buộc'],
      index: true,
    },
    owner: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'Chủ thiết bị là bắt buộc'],
      index: true,
    },
    startDate: {
      type: Date,
      required: [true, 'Ngày bắt đầu thuê là bắt buộc'],
    },
    endDate: {
      type: Date,
      required: [true, 'Ngày kết thúc thuê là bắt buộc'],
    },
    totalDays: {
      type: Number,
      required: true,
      min: 1,
    },
    dailyRate: {
      type: Number,
      required: true,
    },
    rentalFee: {
      type: Number,
      required: true,
    },
    depositValue: {
      type: Number,
      required: true,
      default: 0,
    },
    totalAmount: {
      type: Number,
      required: true,
    },
    status: {
      type: String,
      enum: [
        'pending',
        'approved',
        'handover_in_progress',
        'active',
        'returned',
        'completed',
        'cancelled',
        'rejected',
      ],
      default: 'pending',
      index: true,
    },
    paymentStatus: {
      type: String,
      enum: ['unpaid', 'deposit_held', 'paid', 'refunded'],
      default: 'unpaid',
    },
    deliveryAddress: {
      recipientName: { type: String, required: true },
      phone: { type: String, required: true },
      address: { type: String, required: true },
    },
    note: {
      type: String,
      default: '',
    },
    handoverPhotos: {
      beforeRental: [{ type: String }],
      afterRental: [{ type: String }],
    },
    timeline: [
      {
        status: { type: String, required: true },
        updatedAt: { type: Date, default: Date.now },
        note: { type: String, default: '' },
      },
    ],
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

// Compound indexes
bookingSchema.index({ renter: 1, status: 1, createdAt: -1 });
bookingSchema.index({ owner: 1, status: 1, createdAt: -1 });
bookingSchema.index({ device: 1, startDate: 1, endDate: 1 });

const Booking = mongoose.models.Booking || mongoose.model('Booking', bookingSchema);

export default Booking;
