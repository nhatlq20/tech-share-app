import mongoose from 'mongoose';

const accountSchema = new mongoose.Schema(
  {
    username: String,
    email: {
      type: String,
      lowercase: true,
      trim: true,
    },
    passwordHash: {
      type: String,
      select: false,
    },
    roleId: mongoose.Schema.Types.ObjectId,
    isActive: {
      type: Boolean,
      default: true,
    },
  },
  {
    collection: 'accounts',
    timestamps: true,
  }
);

const Account = mongoose.models.Account || mongoose.model('Account', accountSchema);

export default Account;
