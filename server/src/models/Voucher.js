import mongoose from 'mongoose';

const voucherSchema = new mongoose.Schema(
  {
    code: {
      type: String,
      unique: true,
      required: [true, 'Voucher code is required'],
      uppercase: true,
      trim: true,
    },
    type: {
      type: String,
      enum: ['fixed', 'percent'],
      required: [true, 'Voucher discount type is required'],
    },
    value: {
      type: Number,
      required: [true, 'Discount value is required'],
      min: [0, 'Discount value cannot be negative'],
    },
    minDays: {
      type: Number,
      default: 0,
    },
    maxDiscount: {
      type: Number,
    },
    expiryDate: {
      type: Date,
    },
    usageLimit: {
      type: Number,
    },
    usedCount: {
      type: Number,
      default: 0,
    },
    perUserLimit: {
      type: Number,
      default: 1,
    },
    isActive: {
      type: Boolean,
      default: true,
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

const Voucher = mongoose.models.Voucher || mongoose.model('Voucher', voucherSchema);

export default Voucher;
