import mongoose from 'mongoose';

const otpSchema = new mongoose.Schema(
  {
    email: {
      type: String,
      required: true,
      lowercase: true,
      trim: true,
      index: true,
    },
    otp: {
      type: String,
      required: true,
      trim: true,
    },
    purpose: {
      type: String,
      default: 'register',
      enum: ['register', 'reset_password'],
    },
    expiresAt: {
      type: Date,
      required: true,
      index: { expires: 0 }, // MongoDB TTL index automatically deletes document once expiresAt is reached
    },
  },
  {
    collection: 'otps',
    timestamps: true,
  }
);

// Compound index for fast lookup
otpSchema.index({ email: 1, purpose: 1 });

const Otp = mongoose.models.Otp || mongoose.model('Otp', otpSchema);

export default Otp;
