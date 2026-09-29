import Booking from '../models/Booking.js';
import { createAndSendNotification } from './notificationService.js';

let schedulerInterval = null;

/**
 * Quét các đơn hàng đang thuê (active) để kiểm tra hạn trả và gửi thông báo nhắc nhở
 */
export const checkReturnReminders = async () => {
  try {
    const now = new Date();
    // Tìm các đơn đang active
    const activeBookings = await Booking.find({ status: 'active' });

    for (const booking of activeBookings) {
      if (!booking.endDate) continue;

      const endDate = new Date(booking.endDate);
      const diffHours = (endDate.getTime() - now.getTime()) / (1000 * 60 * 60);

      // 1. Nhắc nhở trước 6 tiếng (còn trong khoảng <= 6 tiếng và > 2 tiếng)
      if (diffHours <= 6 && diffHours > 2 && !booking.reminder6hSent) {
        await createAndSendNotification({
          userId: booking.renterId,
          title: 'Nhắc nhở: Sắp đến hạn trả thiết bị! ⏳',
          body: `Đơn #${booking.bookingCode} sẽ đến hạn trả trong vòng 6 giờ tới. Vui lòng chuẩn bị và liên hệ chủ máy bàn giao đúng hạn.`,
          type: 'reminder',
          relatedId: booking._id,
          data: { bookingId: booking._id.toString() },
        });

        booking.reminder6hSent = true;
        await booking.save();
        console.log(`🔔 [Scheduler] Đã gửi thông báo nhắc 6h cho đơn #${booking.bookingCode}`);
      }

      // 2. Nhắc nhở khẩn cấp trước 2 tiếng (còn trong khoảng <= 2 tiếng và > 0)
      if (diffHours <= 2 && diffHours > 0 && !booking.reminder2hSent) {
        await createAndSendNotification({
          userId: booking.renterId,
          title: 'Khẩn cấp: Chỉ còn 2 giờ đến hạn trả máy! ⚠️',
          body: `Đơn #${booking.bookingCode} chỉ còn chưa đầy 2 giờ nữa là tới hạn hoàn trả. Vui lòng tiến hành trả máy để tránh phát sinh phụ phí phạt trễ hạn.`,
          type: 'reminder',
          relatedId: booking._id,
          data: { bookingId: booking._id.toString() },
        });

        booking.reminder2hSent = true;
        await booking.save();
        console.log(`🚨 [Scheduler] Đã gửi thông báo khẩn cấp 2h cho đơn #${booking.bookingCode}`);
      }
    }
  } catch (error) {
    console.error('❌ [checkReturnReminders] Lỗi khi quét hạn trả máy:', error.message);
  }
};

/**
 * Khởi động Scheduler chạy định kỳ mỗi 15 phút
 */
export const startReminderScheduler = (intervalMs = 15 * 60 * 1000) => {
  if (schedulerInterval) return;

  console.log('⏰ [Scheduler] Khởi chạy dịch vụ quét nhắc hạn trả máy tự động (Issue #38)');
  
  // Chạy ngay 1 lần khi server start sau 5 giây để db sẵn sàng
  setTimeout(() => {
    checkReturnReminders();
  }, 5000);

  schedulerInterval = setInterval(() => {
    checkReturnReminders();
  }, intervalMs);
};

/**
 * Dừng Scheduler khi server tắt
 */
export const stopReminderScheduler = () => {
  if (schedulerInterval) {
    clearInterval(schedulerInterval);
    schedulerInterval = null;
    console.log('⏹️ [Scheduler] Đã dừng dịch vụ nhắc hạn');
  }
};

export default {
  checkReturnReminders,
  startReminderScheduler,
  stopReminderScheduler,
};
