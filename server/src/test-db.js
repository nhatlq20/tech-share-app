import 'dotenv/config';
import { connectDB } from './config/db.js';

console.log('Đang kiểm tra kết nối tới MongoDB Atlas...');

try {
  const conn = await connectDB();
  console.log('--------------------------------------------------');
  console.log('KẾT NỐI MONGODB THÀNH CÔNG!');
  console.log(`Port:     ${conn.connection.port}`);
  console.log('--------------------------------------------------');
  process.exit(0);
} catch (error) {
  console.error('Lỗi kết nối:', error.message);
  process.exit(1);
}
