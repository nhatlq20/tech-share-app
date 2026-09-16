import mongoose from 'mongoose';

const deviceSchema = new mongoose.Schema(
  {
    ownerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'Device owner is required'],
      index: true,
    },

    name: {
      type: String,
      required: [true, 'Device name is required'],
      trim: true,
    },
    brand: {
      type: String,
      required: [true, 'Brand is required'],
      trim: true,
      index: true,
    },
    category: {
      type: String,
      required: [true, 'Category is required'],
      enum: ['smartphone', 'laptop', 'camera', 'drone', 'audio', 'gaming', 'accessory'],
      index: true,
    },
    yearOfManufacture: {
      type: Number,
    },
    condition: {
      type: String,
      enum: ['new99', 'used95', 'scratched'],
      default: 'new99',
    },
    description: {
      type: String,
      required: [true, 'Description is required'],
    },

    images: {
      type: [String],
      required: [true, 'At least 1 device image is required'],
      validate: [
        val => Array.isArray(val) && val.length > 0 && val.length <= 8,
        'Image count must be between 1 and 8 images',
      ],
    },
    specs: {
      type: Map,
      of: String,
      default: {},
    },
    accessories: [{ type: String }],

    pricePerDay: {
      type: Number,
      required: [true, 'Daily rental price is required'],
      min: [10000, 'Minimum daily rental price is 10,000 VND'],
    },
    depositAmount: {
      type: Number,
      required: [true, 'Deposit amount is required'],
      min: [0, 'Deposit amount cannot be negative'],
    },

    location: {
      type: {
        type: String,
        enum: ['Point'],
        default: 'Point',
      },
      coordinates: {
        type: [Number], // [lng, lat]
        required: [true, 'Device coordinates are required'],
      },
    },
    addressText: {
      type: String,
      required: [true, 'Display address is required'],
    },

    status: {
      type: String,
      enum: ['available', 'maintenance', 'hidden', 'rented'],
      default: 'available',
      index: true,
    },
    blockedDates: [
      {
        startDate: { type: Date, required: true },
        endDate: { type: Date, required: true },
        reason: { type: String, default: '' },
      },
    ],

    ratingAvg: {
      type: Number,
      default: 5.0,
      min: 1.0,
      max: 5.0,
    },
    ratingCount: {
      type: Number,
      default: 0,
    },
    rentalCount: {
      type: Number,
      default: 0,
    },
    revenueTotal: {
      type: Number,
      default: 0,
    },

    aiAnalysis: {
      summary: { type: String, default: '' },
      pros: [{ type: String }],
      cons: [{ type: String }],
      rentalRecommendation: { type: String, default: '' },
      analyzedAt: { type: Date },
    },

    isDeleted: {
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

// Virtual aliases for backward compatibility
deviceSchema.virtual('title').get(function () {
  return this.name;
}).set(function (val) {
  this.name = val;
});
deviceSchema.virtual('owner').get(function () {
  return this.ownerId;
}).set(function (val) {
  this.ownerId = val;
});
deviceSchema.virtual('dailyRate').get(function () {
  return this.pricePerDay;
}).set(function (val) {
  this.pricePerDay = val;
});
deviceSchema.virtual('depositValue').get(function () {
  return this.depositAmount;
}).set(function (val) {
  this.depositAmount = val;
});
deviceSchema.virtual('rating').get(function () {
  return this.ratingAvg;
});
deviceSchema.virtual('reviewCount').get(function () {
  return this.ratingCount;
});
deviceSchema.virtual('viewsCount').get(function () {
  return this.rentalCount;
});

// GeoJSON 2dsphere index for radius queries
deviceSchema.index({ location: '2dsphere' });
// Compound index
deviceSchema.index({ category: 1, status: 1 });
// Text search index
deviceSchema.index({ name: 'text', brand: 'text', description: 'text' });

const Device = mongoose.models.Device || mongoose.model('Device', deviceSchema);

export default Device;
