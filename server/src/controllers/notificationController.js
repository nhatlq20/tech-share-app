import Notification from '../models/Notification.js';
import User from '../models/User.js';

/**
 * @desc    Lấy danh sách thông báo của người dùng đăng nhập
 * @route   GET /api/notifications
 * @access  Private
 */
export const getNotifications = async (req, res) => {
  try {
    const userId = req.auth?.id || req.auth?._id;
    const { page = 1, limit = 20, type, unreadOnly } = req.query;

    const query = { userId };
    if (type && type !== 'all') {
      query.type = type;
    }
    if (unreadOnly === 'true') {
      query.isRead = false;
    }

    const pageNum = Math.max(1, Number(page) || 1);
    const limitNum = Math.min(100, Math.max(1, Number(limit) || 20));
    const skip = (pageNum - 1) * limitNum;

    const [notifications, total, unreadCount] = await Promise.all([
      Notification.find(query).sort({ createdAt: -1 }).skip(skip).limit(limitNum),
      Notification.countDocuments(query),
      Notification.countDocuments({ userId, isRead: false }),
    ]);

    return res.status(200).json({
      success: true,
      data: notifications,
      meta: {
        page: pageNum,
        limit: limitNum,
        total,
        unreadCount,
        totalPages: Math.ceil(total / limitNum),
      },
    });
  } catch (error) {
    console.error('❌ [getNotifications] Error:', error);
    return res.status(500).json({
      success: false,
      message: 'Lỗi máy chủ khi lấy danh sách thông báo',
      error: error.message,
    });
  }
};

/**
 * @desc    Lấy số lượng thông báo chưa đọc của người dùng
 * @route   GET /api/notifications/unread-count
 * @access  Private
 */
export const getUnreadCount = async (req, res) => {
  try {
    const userId = req.auth?.id || req.auth?._id;
    const unreadCount = await Notification.countDocuments({ userId, isRead: false });

    return res.status(200).json({
      success: true,
      unreadCount,
    });
  } catch (error) {
    console.error('❌ [getUnreadCount] Error:', error);
    return res.status(500).json({
      success: false,
      message: 'Lỗi máy chủ khi đếm thông báo chưa đọc',
      error: error.message,
    });
  }
};

/**
 * @desc    Đánh dấu 1 thông báo là đã đọc
 * @route   PATCH /api/notifications/:id/read
 * @access  Private
 */
export const markAsRead = async (req, res) => {
  try {
    const userId = req.auth?.id || req.auth?._id;
    const { id } = req.params;

    const notification = await Notification.findOneAndUpdate(
      { _id: id, userId },
      { $set: { isRead: true } },
      { new: true }
    );

    if (!notification) {
      return res.status(404).json({
        success: false,
        message: 'Không tìm thấy thông báo hoặc bạn không có quyền',
      });
    }

    const unreadCount = await Notification.countDocuments({ userId, isRead: false });

    return res.status(200).json({
      success: true,
      data: notification,
      unreadCount,
    });
  } catch (error) {
    console.error('❌ [markAsRead] Error:', error);
    return res.status(500).json({
      success: false,
      message: 'Lỗi máy chủ khi cập nhật thông báo',
      error: error.message,
    });
  }
};

/**
 * @desc    Đánh dấu toàn bộ thông báo của người dùng là đã đọc
 * @route   PATCH /api/notifications/read-all
 * @access  Private
 */
export const markAllAsRead = async (req, res) => {
  try {
    const userId = req.auth?.id || req.auth?._id;

    await Notification.updateMany({ userId, isRead: false }, { $set: { isRead: true } });

    return res.status(200).json({
      success: true,
      message: 'Đã đánh dấu tất cả thông báo là đã đọc',
      unreadCount: 0,
    });
  } catch (error) {
    console.error('❌ [markAllAsRead] Error:', error);
    return res.status(500).json({
      success: false,
      message: 'Lỗi máy chủ khi đánh dấu tất cả đã đọc',
      error: error.message,
    });
  }
};

/**
 * @desc    Xóa 1 thông báo
 * @route   DELETE /api/notifications/:id
 * @access  Private
 */
export const deleteNotification = async (req, res) => {
  try {
    const userId = req.auth?.id || req.auth?._id;
    const { id } = req.params;

    const notification = await Notification.findOneAndDelete({ _id: id, userId });

    if (!notification) {
      return res.status(404).json({
        success: false,
        message: 'Không tìm thấy thông báo cần xóa',
      });
    }

    const unreadCount = await Notification.countDocuments({ userId, isRead: false });

    return res.status(200).json({
      success: true,
      message: 'Đã xóa thông báo thành công',
      unreadCount,
    });
  } catch (error) {
    console.error('❌ [deleteNotification] Error:', error);
    return res.status(500).json({
      success: false,
      message: 'Lỗi máy chủ khi xóa thông báo',
      error: error.message,
    });
  }
};

/**
 * @desc    Lưu hoặc cập nhật Expo Push Token cho người dùng
 * @route   POST /api/notifications/push-token
 * @access  Private
 */
export const savePushToken = async (req, res) => {
  try {
    const userId = req.auth?.id || req.auth?._id;
    const { token } = req.body;

    if (!token || typeof token !== 'string') {
      return res.status(400).json({
        success: false,
        message: 'Expo Push Token không hợp lệ',
      });
    }

    await User.findByIdAndUpdate(userId, {
      $set: { expoPushToken: token.trim() },
      $addToSet: { pushTokens: token.trim() },
    });

    return res.status(200).json({
      success: true,
      message: 'Đã lưu Expo Push Token thành công',
    });
  } catch (error) {
    console.error('❌ [savePushToken] Error:', error);
    return res.status(500).json({
      success: false,
      message: 'Lỗi máy chủ khi lưu push token',
      error: error.message,
    });
  }
};

export default {
  getNotifications,
  getUnreadCount,
  markAsRead,
  markAllAsRead,
  deleteNotification,
  savePushToken,
};
