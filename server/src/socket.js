import { Server } from 'socket.io';

let io = null;

/**
 * Khởi tạo thực thể Socket.IO và gán vào HTTP Server
 * @param {import('http').Server} httpServer
 */
export const initSocket = (httpServer) => {
  io = new Server(httpServer, {
    cors: {
      origin: '*',
      methods: ['GET', 'POST', 'PATCH', 'DELETE'],
    },
  });

  io.on('connection', (socket) => {
    console.log(`🔌 [Socket.IO] Client connected: ${socket.id}`);

    // Client emit sau khi login để gia nhập room cá nhân
    socket.on('join_user', (userId) => {
      if (userId) {
        socket.join(`user_${userId}`);
        console.log(`👤 [Socket.IO] Socket ${socket.id} joined room user_${userId}`);
      }
    });

    socket.on('leave_user', (userId) => {
      if (userId) {
        socket.leave(`user_${userId}`);
        console.log(`👋 [Socket.IO] Socket ${socket.id} left room user_${userId}`);
      }
    });

    socket.on('disconnect', () => {
      console.log(`🔌 [Socket.IO] Client disconnected: ${socket.id}`);
    });
  });

  return io;
};

/**
 * Trả về thực thể Socket.IO singleton để các service/controller emit sự kiện
 * @returns {import('socket.io').Server | null}
 */
export const getIO = () => io;

export default {
  initSocket,
  getIO,
};
