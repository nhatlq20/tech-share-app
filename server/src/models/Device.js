import mongoose from 'mongoose';

const deviceSchema = new mongoose.Schema(
  {
    owner: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'Chủ sở hữu thiết bị là bắt buộc'],
      index: true,
    },
    title: {
      type: String,
      required: [true, 'Tên thiết bị là bắt buộc'],
      trim: true,
      index: 'text', // Hỗ trợ full-text search
    },
    brand: {
      type: String,
      required: [true, 'Thương hiệu là bắt buộc'],
      trim: true,
      index: true,
    },
    category: {
      type: String,
      required: [true, 'Danh mục thiết bị là bắt buộc'],
      enum: ['smartphone', 'laptop', 'camera', 'drone', 'audio', 'accessory'],
      index: true,
    },
    dailyRate: {
      type: Number,
      required: [true, 'Giá thuê mỗi ngày là bắt buộc'],
      min: [10000, 'Giá thuê tối thiểu là 10.000 VNĐ/ngày'],
      index: true,
    },
    depositValue: {
      type: Number,
      required: [true, 'Tiền đặt cọc là bắt buộc'],
      min: 0,
    },
    images: {
      type: [String],
      required: [true, 'Phải có ít nhất 1 ảnh thiết bị'],
      validate: [val => Array.isArray(val) && val.length > 0, 'Phải tải lên ít nhất 1 ảnh'],
    },
    specs: {
      type: Map,
      of: String,
      default: {}, // Ví dụ: { "Chip": "Apple M3 Max", "RAM": "36GB", "Camera": "48MP" }
    },
    description: {
      type: String,
      required: [true, 'Mô tả thiết bị là bắt buộc'],
      index: 'text',
    },
    location: {
      type: {
        type: String,
        enum: ['Point'],
        default: 'Point',
      },
      coordinates: {
        type: [Number], // [lng, lat]
        required: [true, 'Toạ độ thiết bị là bắt buộc'],
      },
      address: {
        type: String,
        required: [true, 'Địa chỉ hiển thị là bắt buộc'],
      },
    },
    status: {
      type: String,
      enum: ['available', 'rented', 'maintenance', 'hidden'],
      default: 'available',
      index: true,
    },
    rating: {
      type: Number,
      default: 5.0,
      min: 1.0,
      max: 5.0,
    },
    reviewCount: {
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
    viewsCount: {
      type: Number,
      default: 0,
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

// GeoJSON 2dsphere index: Phục vụ tìm kiếm bán kính quanh toạ độ ($nearSphere)
deviceSchema.index({ location: '2dsphere' });
// Compound index: Tối ưu bộ lọc danh mục và khoảng giá
deviceSchema.index({ category: 1, dailyRate: 1, status: 1 });

const Device = mongoose.models.Device || mongoose.model('Device', deviceSchema);

export default Device;
