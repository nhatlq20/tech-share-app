import mongoose from 'mongoose';

const disputeSchema = new mongoose.Schema(
  {
    bookingId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Booking',
      required: [true, 'Booking reference is required'],
      index: true,
    },
    raisedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'Claimant reference is required'],
    },
    reason: {
      type: String,
      required: [true, 'Dispute reason is required'],
      trim: true,
    },
    evidenceImages: [{ type: String }],
    requestedDeductAmount: {
      type: Number,
      default: 0,
    },
    status: {
      type: String,
      enum: ['pending', 'resolved'],
      default: 'pending',
    },
    adminDecision: {
      type: String,
      enum: ['full_refund', 'partial_deduct', 'full_deduct'],
    },
    finalDeductAmount: {
      type: Number,
      default: 0,
    },
    resolvedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null,
    },
    resolvedAt: {
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

const Dispute = mongoose.models.Dispute || mongoose.model('Dispute', disputeSchema);

export default Dispute;
