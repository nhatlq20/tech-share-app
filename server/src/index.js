import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import mongoose from 'mongoose';

const app = express();
const PORT = process.env.PORT || 5000;

app.use(cors());
app.use(express.json());

// Health check endpoint
app.get('/api/health', (req, res) => {
  const isDbConnected = mongoose.connection.readyState === 1;
  res.json({
    status: 'ONLINE',
    project: 'TechShare MMA301 API',
    database: isDbConnected ? 'Connected to MongoDB Atlas' : 'Disconnected',
    dbName: mongoose.connection.name,
    timestamp: new Date().toISOString(),
  });
});

// Kết nối MongoDB Atlas và khởi động Server
const startServer = async () => {
  try {
    console.log('⏳ Đang kết nối tới cơ sở dữ liệu MongoDB Atlas...');
    const conn = await mongoose.connect(process.env.MONGODB_URI);

    console.log('==================================================');
    console.log('🎉 [MongoDB Atlas] KẾT NỐI DATABASE THÀNH CÔNG!');
    console.log(`📡 Host:     ${conn.connection.host}`);
    console.log(`🗄️  Database: ${conn.connection.name}`);
    console.log(`⚡ Port:     ${conn.connection.port}`);
    console.log('==================================================');

    app.listen(PORT, () => {
      console.log(`🚀 [TechShare Server] Đang chạy tại http://localhost:${PORT}`);
      console.log(`🩺 [Health Check]     http://localhost:${PORT}/api/health`);
      console.log('==================================================');
    });
  } catch (error) {
    console.error('❌ [MongoDB Atlas] Kết nối thất bại:', error.message);
    process.exit(1);
  }
};

startServer();
