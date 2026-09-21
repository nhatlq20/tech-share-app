import mongoose from 'mongoose';

const userSchema = new mongoose.Schema(
  {
    accountId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Account',
      index: true,
    },
    name: {
      type: String,
      required: [true, 'Full name is required'],
      trim: true,
      minlength: [2, 'Full name must be at least 2 characters'],
      maxlength: [60, 'Full name cannot exceed 60 characters'],
    },
    email: {
      type: String,
      unique: true,
      lowercase: true,
      trim: true,
      match: [/^\w+([.-]?\w+)*@\w+([.-]?\w+)*(\.\w{2,3})+$/, 'Invalid email address'],
    },
    passwordHash: {
      type: String,
      minlength: [6, 'Password must be at least 6 characters'],
      select: false,
    },
    phone: {
      type: String,
      trim: true,
      default: '',
    },
    address: {
      type: String,
      default: '',
    },
    avatar: {
      type: String,
      default: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=400',
    },
    role: {
      type: String,
      enum: ['admin', 'owner', 'renter'],
      default: 'renter',
    },

    isVerified: {
      type: Boolean,
      default: false,
    },
    trustScore: {
      type: Number,
      default: 100,
      min: 0,
      max: 100,
    },
    badges: [{ type: String }],

    referralCode: {
      type: String,
      unique: true,
      sparse: true,
    },
    referredBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null,
    },

    wishlist: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Device',
      },
    ],

    walletBalance: {
      type: Number,
      default: 0,
      min: 0,
    },
    walletEscrowBalance: {
      type: Number,
      default: 0,
      min: 0,
    },

    expoPushToken: {
      type: String,
      default: '',
    },
    pushTokens: [{ type: String }],
    fcmTokens: [{ type: String }],

    biometricEnabled: {
      type: Boolean,
      default: false,
    },

    location: {
      type: {
        type: String,
        enum: ['Point'],
        default: 'Point',
      },
      coordinates: {
        type: [Number], // [lng, lat]
        default: [105.7826, 21.0285],
      },
    },

    rating: {
      type: Number,
      default: 5.0,
      min: 1.0,
      max: 5.0,
    },
    totalReviews: {
      type: Number,
      default: 0,
    },

    isActive: {
      type: Boolean,
      default: true,
    },
  },
  {
    timestamps: true,
    collection: 'users',
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

// Virtual reference to Account
userSchema.virtual('account', {
  ref: 'Account',
  localField: 'accountId',
  foreignField: '_id',
  justOne: true,
});

// Virtual helpers for backward compatibility
userSchema.virtual('favoriteDevices').get(function () {
  return this.wishlist;
}).set(function (val) {
  this.wishlist = val;
});

// Indexes
userSchema.index({ location: '2dsphere' });
userSchema.index({ trustScore: -1 });

const User = mongoose.models.User || mongoose.model('User', userSchema);

export default User;
