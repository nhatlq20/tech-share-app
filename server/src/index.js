import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import mongoose from 'mongoose';
import authRoutes from './routes/authRoutes.js';
import deviceRoutes from './routes/deviceRoutes.js';
import profileRoutes from './routes/profileRoutes.js';
import { errorHandler, notFound } from './middlewares/errorHandler.js';
import { connectDB } from './config/db.js';

const app = express();
const PORT = Number(process.env.PORT) || 5000;
let httpServer;

app.use(cors());
app.use(express.json({ limit: '1mb' }));

app.use('/api/auth', authRoutes);
app.use('/api/profile', profileRoutes);

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

// API Routes
app.use('/api/devices', deviceRoutes);

// 404 & Error Handler Middlewares
app.use(notFound);
app.use(errorHandler);

// Kết nối MongoDB Atlas và khởi động Server
const startServer = async () => {
  try {
    console.log('⏳ Đang kết nối tới cơ sở dữ liệu MongoDB...');
    const conn = await connectDB();

    console.log('==================================================');
    console.log('🎉 [MongoDB] KẾT NỐI DATABASE THÀNH CÔNG!');
    console.log(`📡 Host:     ${conn.connection.host}`);
    console.log(`🗄️  Database: ${conn.connection.name}`);
    console.log(`⚡ Port:     ${conn.connection.port}`);
    console.log('==================================================');

    httpServer = app.listen(PORT, () => {
      console.log(`🚀 [TechShare Server] Đang chạy tại http://localhost:${PORT}`);
      console.log(`🩺 [Health Check]     http://localhost:${PORT}/api/health`);
      console.log(`🔐 [Login API]       http://localhost:${PORT}/api/auth/login`);
      console.log('==================================================');
    });

    httpServer.on('error', error => {
      if (error.code === 'EADDRINUSE') {
        console.error(`❌ Port ${PORT} đang được sử dụng.`);
        console.error('Hãy dừng server cũ trước khi chạy lại:');
        console.error(`  Windows PowerShell: Get-NetTCPConnection -LocalPort ${PORT} -State Listen`);
        console.error('  Sau đó: Stop-Process -Id <PID> -Force');
      } else {
        console.error('❌ HTTP server error:', error.message);
      }

      void shutdown(1);
    });
  } catch (error) {
    console.error('❌ [MongoDB] Kết nối thất bại:', error.message);
    await shutdown(1);
  }
};

const shutdown = async (exitCode = 0) => {
  try {
    if (httpServer) {
      await new Promise(resolve => httpServer.close(resolve));
      httpServer = null;
    }

    if (mongoose.connection.readyState !== 0) {
      await mongoose.connection.close();
    }
  } finally {
    process.exit(exitCode);
  }
};

process.once('SIGINT', () => {
  console.log('\n🛑 Đang dừng TechShare Server...');
  void shutdown(0);
});

process.once('SIGTERM', () => {
  void shutdown(0);
});

process.on('unhandledRejection', error => {
  console.error('❌ Unhandled promise rejection:', error);
  void shutdown(1);
});

startServer();
