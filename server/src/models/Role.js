import mongoose from 'mongoose';

const roleSchema = new mongoose.Schema(
  {
    code: {
      type: String,
      required: [true, 'Role code is required'],
      unique: true,
      lowercase: true,
      trim: true,
      enum: {
        values: ['renter', 'owner', 'admin'],
        message: '{VALUE} is not a valid role code',
      },
    },
    name: {
      type: String,
      required: [true, 'Role name is required'],
      trim: true,
    },
    description: {
      type: String,
      default: '',
      trim: true,
    },
    permissions: [
      {
        type: String,
        trim: true,
      },
    ],
    isActive: {
      type: Boolean,
      default: true,
    },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

const Role = mongoose.models.Role || mongoose.model('Role', roleSchema);

export default Role;
