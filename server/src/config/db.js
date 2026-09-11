import mongoose from 'mongoose';

/**
 * Kết nối tới cơ sở dữ liệu MongoDB Atlas
 * @returns {Promise<typeof mongoose>}
 */
export const connectDB = async () => {
  const mongoUri = process.env.MONGODB_URI;

  if (!mongoUri) {
    throw new Error('MONGODB_URI chưa được thiết lập trong file .env');
  }

  try {
    const conn = await mongoose.connect(mongoUri);
    return conn;
  } catch (error) {
    console.error('❌ Lỗi kết nối MongoDB Atlas:', error.message);
    throw error;
  }
};
