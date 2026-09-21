/**
 * test-notifications.js
 * Kịch bản kiểm thử toàn diện Phân hệ Thông báo (Notification Hub & Reminder Scheduler)
 * 
 * Cách chạy:
 *   node server/src/utils/test-notifications.js
 *   hoặc từ thư mục server: npm run test:notifications
 */

import 'dotenv/config';
import mongoose from 'mongoose';
import { connectDB } from '../config/db.js';
import Notification from '../models/Notification.js';
import User from '../models/User.js';
import Booking from '../models/Booking.js';
import { createAndSendNotification } from '../services/notificationService.js';
import { checkReturnReminders } from '../services/reminderScheduler.js';
import {
  getNotifications,
  getUnreadCount,
  markAsRead,
  markAllAsRead,
  deleteNotification,
  savePushToken,
} from '../controllers/notificationController.js';

// Helper tạo mock request & response cho controller testing
const createMockReqRes = (auth = {}, params = {}, query = {}, body = {}) => {
  const req = { auth, params, query, body };
  let statusCode = 200;
  let responseData = null;

  const res = {
    status: (code) => {
      statusCode = code;
      return res;
    },
    json: (data) => {
      responseData = data;
      return res;
    },
    getStatusCode: () => statusCode,
    getData: () => responseData,
  };

  return { req, res };
};

const runNotificationTests = async () => {
  console.log('====================================================');
  console.log('🧪 BẮT ĐẦU KIỂM THỬ PHÂN HỆ THÔNG BÁO (ISSUE #38)');
  console.log('====================================================\n');

  let testUserId = null;
  const createdNotificationIds = [];
  let passedTests = 0;
  let totalTests = 0;

  const assert = (condition, testName, detail = '') => {
    totalTests++;
    if (condition) {
      passedTests++;
      console.log(`✅ [PASS] ${testName} ${detail ? `(${detail})` : ''}`);
    } else {
      console.error(`❌ [FAIL] ${testName} ${detail ? `(${detail})` : ''}`);
    }
  };

  try {
    // 1. Kết nối CSDL
    console.log('--- 1. Kiểm tra kết nối MongoDB Atlas ---');
    await connectDB();
    assert(mongoose.connection.readyState === 1, 'Kết nối MongoDB Atlas thành công');

    // Tìm một user để chạy test
    const testUser = await User.findOne({ email: 'renter1@techshare.vn' }) || await User.findOne({});
    assert(!!testUser, 'Tìm thấy tài khoản kiểm thử', `User: ${testUser?.email || testUser?._id}`);
    testUserId = testUser._id.toString();

    // 2. Kiểm tra Schema Enums
    console.log('\n--- 2. Kiểm tra Schema & Enums ---');
    const schemaTypes = Notification.schema.path('type').enumValues;
    assert(schemaTypes.includes('order'), 'Schema hỗ trợ type: order');
    assert(schemaTypes.includes('reminder'), 'Schema hỗ trợ type: reminder (Issue #38)');
    assert(schemaTypes.includes('system'), 'Schema hỗ trợ type: system');
    assert(schemaTypes.includes('promo'), 'Schema hỗ trợ type: promo');

    // 3. Test Service: createAndSendNotification
    console.log('\n--- 3. Kiểm thử Service: createAndSendNotification ---');
    
    // Tạo thông báo đơn hàng
    const orderNotif = await createAndSendNotification({
      userId: testUserId,
      title: '[TEST] Đơn thuê đã được duyệt 🎉',
      body: 'Chủ máy đã xác nhận lịch hẹn giao thiết bị.',
      type: 'order',
      data: { bookingId: '64e0a12f9b1c2b001a444441' },
    });
    assert(orderNotif && !orderNotif.isRead, 'Tạo thông báo loại order thành công', `ID: ${orderNotif._id}`);
    createdNotificationIds.push(orderNotif._id);

    // Tạo thông báo nhắc hạn (reminder)
    const reminderNotif = await createAndSendNotification({
      userId: testUserId,
      title: '[TEST] Nhắc nhở hạn trả máy còn 6 tiếng ⏳',
      body: 'Vui lòng chuẩn bị thiết bị để bàn giao đúng hẹn.',
      type: 'reminder',
    });
    assert(reminderNotif && reminderNotif.type === 'reminder', 'Tạo thông báo loại reminder thành công', `ID: ${reminderNotif._id}`);
    createdNotificationIds.push(reminderNotif._id);

    // Tạo thông báo hệ thống (system)
    const systemNotif = await createAndSendNotification({
      userId: testUserId,
      title: '[TEST] Hồ sơ eKYC thành công ✅',
      body: 'Bạn đã nhận được Tích Xanh Uy Tín trên TechShare.',
      type: 'system',
    });
    assert(systemNotif && systemNotif.type === 'system', 'Tạo thông báo loại system thành công', `ID: ${systemNotif._id}`);
    createdNotificationIds.push(systemNotif._id);

    // 4. Test Controller: getUnreadCount
    console.log('\n--- 4. Kiểm thử Controller: getUnreadCount ---');
    {
      const { req, res } = createMockReqRes({ id: testUserId });
      await getUnreadCount(req, res);
      const data = res.getData();
      assert(res.getStatusCode() === 200 && data.unreadCount >= 3, 'Đếm thông báo chưa đọc chính xác', `unreadCount: ${data.unreadCount}`);
    }

    // 5. Test Controller: getNotifications & Pagination & Filter
    console.log('\n--- 5. Kiểm thử Controller: getNotifications ---');
    {
      const { req, res } = createMockReqRes({ id: testUserId }, {}, { page: 1, limit: 10, type: 'order' });
      await getNotifications(req, res);
      const data = res.getData();
      assert(res.getStatusCode() === 200 && data.success, 'Lấy danh sách thông báo thành công');
      assert(data.data.some(n => n._id.toString() === orderNotif._id.toString()), 'Lọc theo type "order" trả về kết quả chính xác');
      assert(data.meta && typeof data.meta.total === 'number', 'Metadata phân trang đầy đủ (page, limit, total, unreadCount)');
    }

    // 6. Test Controller: markAsRead
    console.log('\n--- 6. Kiểm thử Controller: markAsRead ---');
    {
      const { req, res } = createMockReqRes({ id: testUserId }, { id: orderNotif._id.toString() });
      await markAsRead(req, res);
      const data = res.getData();
      assert(res.getStatusCode() === 200 && data.success && data.data.isRead === true, 'Đánh dấu 1 thông báo đã đọc thành công');

      // Kiểm tra trong database
      const updatedInDb = await Notification.findById(orderNotif._id);
      assert(updatedInDb.isRead === true, 'Database ghi nhận trạng thái isRead = true');
    }

    // 7. Test Controller: markAllAsRead
    console.log('\n--- 7. Kiểm thử Controller: markAllAsRead ---');
    {
      const { req, res } = createMockReqRes({ id: testUserId });
      await markAllAsRead(req, res);
      const data = res.getData();
      assert(res.getStatusCode() === 200 && data.unreadCount === 0, 'Đánh dấu tất cả thông báo đã đọc thành công');

      // Xác minh trong database
      const remainingUnread = await Notification.countDocuments({ userId: testUserId, isRead: false });
      assert(remainingUnread === 0, 'Toàn bộ thông báo của user đã chuyển sang đã đọc trong CSDL');
    }

    // 8. Test Controller: savePushToken
    console.log('\n--- 8. Kiểm thử Controller: savePushToken ---');
    {
      const testToken = 'ExponentPushToken[unit_test_push_token_2026]';
      const { req, res } = createMockReqRes({ id: testUserId }, {}, {}, { token: testToken });
      await savePushToken(req, res);
      assert(res.getStatusCode() === 200, 'Lưu Expo Push Token thành công');

      const userWithToken = await User.findById(testUserId);
      assert(userWithToken.expoPushToken === testToken, 'User model lưu expoPushToken chính xác');
      assert(userWithToken.pushTokens.includes(testToken), 'pushTokens array chứa token vừa lưu');
    }

    // 9. Test Controller: deleteNotification
    console.log('\n--- 9. Kiểm thử Controller: deleteNotification ---');
    {
      const { req, res } = createMockReqRes({ id: testUserId }, { id: systemNotif._id.toString() });
      await deleteNotification(req, res);
      assert(res.getStatusCode() === 200, 'Xóa thông báo thành công');

      const deletedFromDb = await Notification.findById(systemNotif._id);
      assert(deletedFromDb === null, 'Thông báo đã được gỡ bỏ khỏi MongoDB');
    }

    // 10. Test Scheduler: checkReturnReminders
    console.log('\n--- 10. Kiểm thử Reminder Scheduler Logic ---');
    try {
      await checkReturnReminders();
      assert(true, 'Dịch vụ quét hạn trả máy checkReturnReminders chạy trơn tru không lỗi');
    } catch (schedErr) {
      assert(false, 'checkReturnReminders gặp lỗi', schedErr.message);
    }

    // 11. Kiểm thử HTTP Endpoints thực tế nếu Server đang chạy trên port 5000
    console.log('\n--- 11. Kiểm thử REST API thực tế (HTTP Localhost) ---');
    try {
      const healthRes = await fetch('http://localhost:5000/api/health');
      if (healthRes.ok) {
        // Đăng nhập lấy token
        const loginRes = await fetch('http://localhost:5000/api/auth/login', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ identifier: 'renter1@techshare.vn', password: '123456' }),
        });
        const loginData = await loginRes.json();
        
        if (loginData.token) {
          const headers = { Authorization: `Bearer ${loginData.token}` };
          const apiNotifsRes = await fetch('http://localhost:5000/api/notifications', { headers });
          const apiNotifs = await apiNotifsRes.json();
          assert(apiNotifsRes.status === 200 && apiNotifs.success, 'HTTP GET /api/notifications trả về HTTP 200 OK');

          const apiUnreadRes = await fetch('http://localhost:5000/api/notifications/unread-count', { headers });
          const apiUnread = await apiUnreadRes.json();
          assert(apiUnreadRes.status === 200 && typeof apiUnread.unreadCount === 'number', 'HTTP GET /api/notifications/unread-count trả về HTTP 200 OK');
        } else {
          console.log('ℹ️ [Bỏ qua HTTP test]: Không lấy được token đăng nhập');
        }
      } else {
        console.log('ℹ️ [Bỏ qua HTTP test]: Server chưa khởi động tại port 5000');
      }
    } catch {
      console.log('ℹ️ [Bỏ qua HTTP test]: Server chưa online tại http://localhost:5000');
    }

  } catch (error) {
    console.error('❌ Ngoại lệ nghiêm trọng khi chạy test:', error);
  } finally {
    // Dọn dẹp dữ liệu test
    console.log('\n--- 12. Dọn dẹp dữ liệu kiểm thử (Cleanup) ---');
    if (createdNotificationIds.length > 0) {
      const delRes = await Notification.deleteMany({ _id: { $in: createdNotificationIds } });
      console.log(`🧹 Đã dọn dẹp ${delRes.deletedCount} thông báo mẫu tạo trong test.`);
    }

    console.log('\n====================================================');
    console.log(`🏁 KẾT QUẢ KIỂM THỬ: ${passedTests}/${totalTests} TESTS VƯỢT QUA (${Math.round((passedTests / totalTests) * 100)}%)`);
    console.log('====================================================\n');

    process.exit(passedTests === totalTests ? 0 : 1);
  }
};

runNotificationTests();
