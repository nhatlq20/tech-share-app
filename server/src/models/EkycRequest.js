import mongoose from 'mongoose';

const ekycRequestSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'User reference is required'],
      unique: true,
      index: true,
    },
    idCardNumber: {
      type: String,
      trim: true,
      default: '',
    },
    idCardFrontUrl: {
      type: String,
      required: [true, 'ID card front image URL is required'],
    },
    idCardBackUrl: {
      type: String,
      required: [true, 'ID card back image URL is required'],
    },
    selfieUrl: {
      type: String,
      default: '',
    },
    status: {
      type: String,
      enum: ['pending', 'approved', 'rejected'],
      default: 'pending',
    },
    rejectReason: {
      type: String,
      default: '',
    },
    reviewedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null,
    },
    reviewedAt: {
      type: Date,
    },
  },
  {
    timestamps: { createdAt: true, updatedAt: false },
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

const EkycRequest =
  mongoose.models.EkycRequest || mongoose.model('EkycRequest', ekycRequestSchema);

export default EkycRequest;
