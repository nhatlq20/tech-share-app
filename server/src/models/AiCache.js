import mongoose from 'mongoose';

const aiCacheSchema = new mongoose.Schema(
  {
    type: {
      type: String,
      enum: ['review_summary', 'comparison', 'consultant'],
      required: [true, 'Cache type is required'],
    },
    inputHash: {
      type: String,
      required: [true, 'Input hash is required'],
      index: true,
    },
    resultJson: {
      type: mongoose.Schema.Types.Mixed,
      required: [true, 'AI result data is required'],
    },
    expiresAt: {
      type: Date,
      required: [true, 'Expiration date is required'],
    },
  },
  {
    timestamps: { createdAt: true, updatedAt: false },
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

// TTL Index: MongoDB automatically clears expired documents when expiresAt is reached
aiCacheSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

const AiCache = mongoose.models.AiCache || mongoose.model('AiCache', aiCacheSchema);

export default AiCache;
