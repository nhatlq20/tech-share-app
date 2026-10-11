import mongoose from 'mongoose';
import Message from '../models/Message.js';
import Booking from '../models/Booking.js';
import User from '../models/User.js';
import Device from '../models/Device.js';
import { createAndSendNotification } from '../services/notificationService.js';
import { getIO } from '../socket.js';

/**
 * GET /api/chats/conversations
 * Lấy danh sách cuộc trò chuyện với khách hàng / chủ thiết bị
 * Sắp xếp theo tin nhắn mới nhất nằm trên cùng (Realtime)
 */
export const getConversations = async (req, res) => {
  try {
    const currentUserId = req.auth?.id || req.auth?.userId || req.auth?._id;
    if (!currentUserId) {
      return res.status(401).json({
        success: false,
        message: 'Unauthorized',
      });
    }

    const { role } = req.query; // 'owner' hoặc 'renter'

    const userObjId = mongoose.Types.ObjectId.isValid(currentUserId)
      ? new mongoose.Types.ObjectId(currentUserId)
      : currentUserId;

    // Tìm tất cả thiết bị thuộc sở hữu của user nếu là owner
    const myDevices = await Device.find({
      $or: [
        { ownerId: currentUserId },
        { ownerId: userObjId },
        { owner: currentUserId },
        { owner: userObjId },
      ],
    }).select('_id');
    const myDeviceIds = myDevices.map((d) => d._id);

    let bookingQuery;
    if (role === 'owner') {
      bookingQuery = {
        $or: [
          { ownerId: currentUserId },
          { ownerId: userObjId },
          ...(myDeviceIds.length > 0 ? [{ deviceId: { $in: myDeviceIds } }] : []),
        ],
      };
    } else if (role === 'renter') {
      bookingQuery = {
        $or: [{ renterId: currentUserId }, { renterId: userObjId }],
      };
    } else {
      bookingQuery = {
        $or: [
          { ownerId: currentUserId },
          { ownerId: userObjId },
          { renterId: currentUserId },
          { renterId: userObjId },
          ...(myDeviceIds.length > 0 ? [{ deviceId: { $in: myDeviceIds } }] : []),
        ],
      };
    }

    const bookings = await Booking.find(bookingQuery)
      .populate('renterId', 'name avatar role phone email isVerified')
      .populate('ownerId', 'name avatar role phone email isVerified')
      .populate('deviceId', 'name title images brand model category')
      .lean();

    if (!bookings || bookings.length === 0) {
      return res.status(200).json({
        success: true,
        data: [],
      });
    }

    const bookingIds = bookings.map((b) => b._id);

    // Aggregation: Lấy tin nhắn mới nhất cho từng booking
    const latestMessagesAgg = await Message.aggregate([
      { $match: { bookingId: { $in: bookingIds } } },
      { $sort: { createdAt: -1 } },
      {
        $group: {
          _id: '$bookingId',
          messageId: { $first: '$_id' },
          senderId: { $first: '$senderId' },
          receiverId: { $first: '$receiverId' },
          type: { $first: '$type' },
          content: { $first: '$content' },
          mediaUrl: { $first: '$mediaUrl' },
          status: { $first: '$status' },
          createdAt: { $first: '$createdAt' },
        },
      },
    ]);

    const latestMessageMap = new Map();
    latestMessagesAgg.forEach((msg) => {
      latestMessageMap.set(String(msg._id), msg);
    });

    // Aggregation: Đếm số lượng tin nhắn chưa đọc mà người nhận là currentUserId
    const unreadAgg = await Message.aggregate([
      {
        $match: {
          bookingId: { $in: bookingIds },
          receiverId: { $in: [userObjId, String(currentUserId)] },
          status: { $ne: 'read' },
        },
      },
      {
        $group: {
          _id: '$bookingId',
          count: { $sum: 1 },
        },
      },
    ]);

    const unreadMap = new Map();
    unreadAgg.forEach((u) => {
      unreadMap.set(String(u._id), u.count);
    });

    const conversations = bookings.map((b) => {
      const bId = String(b._id);
      const isOwner = String(b.ownerId?._id || b.ownerId) === String(currentUserId);
      const otherUser = isOwner ? b.renterId : b.ownerId;
      const device = b.deviceId;
      const latestMsg = latestMessageMap.get(bId);
      const unreadCount = unreadMap.get(bId) || 0;

      let previewText = 'Chưa có tin nhắn';
      if (latestMsg) {
        if (latestMsg.type === 'image') previewText = '📷 [Hình ảnh]';
        else if (latestMsg.type === 'location') previewText = '📍 [Vị trí]';
        else if (latestMsg.content) previewText = latestMsg.content;
      }

      const lastActivityAt = latestMsg?.createdAt
        ? new Date(latestMsg.createdAt).toISOString()
        : new Date(b.updatedAt || b.createdAt).toISOString();

      return {
        bookingId: bId,
        bookingCode: b.bookingCode || '',
        bookingStatus: b.status,
        startDate: b.startDate,
        endDate: b.endDate,
        otherUser: otherUser
          ? {
              _id: String(otherUser._id || otherUser),
              name: otherUser.name || 'User',
              avatar: otherUser.avatar || '',
              phone: otherUser.phone || '',
              isVerified: Boolean(otherUser.isVerified),
              role: otherUser.role || (isOwner ? 'renter' : 'owner'),
            }
          : null,
        device: device
          ? {
              _id: String(device._id || device),
              title: device.title || device.name || 'Thiết bị',
              image: device.images?.[0] || '',
              brand: device.brand || '',
            }
          : null,
        lastMessage: latestMsg
          ? {
              _id: String(latestMsg.messageId),
              text: previewText,
              senderId: String(latestMsg.senderId),
              isFromMe: String(latestMsg.senderId) === String(currentUserId),
              createdAt: latestMsg.createdAt
                ? new Date(latestMsg.createdAt).toISOString()
                : new Date().toISOString(),
              status: latestMsg.status || 'sent',
            }
          : null,
        unreadCount,
        lastActivityAt,
      };
    });

    // Sắp xếp danh sách: Tin nhắn mới nhất nằm trên cùng
    conversations.sort(
      (a, b) => new Date(b.lastActivityAt).getTime() - new Date(a.lastActivityAt).getTime()
    );

    return res.status(200).json({
      success: true,
      data: conversations,
    });
  } catch (error) {
    console.error('❌ [getConversations] Error:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to retrieve conversations',
      error: error.message,
    });
  }
};

/**
 * GET /api/chats/:bookingId
 * Retrieve message history for a specific booking
 * Sorted with newest first for FlatList inverted
 */
export const getChatHistory = async (req, res) => {
  try {
    const { bookingId } = req.params;
    const currentUserId = req.auth?.id || req.auth?.userId || req.auth?._id;

    if (!currentUserId) {
      return res.status(401).json({
        success: false,
        message: 'Unauthorized',
      });
    }

    const booking = await Booking.findById(bookingId)
      .populate('renterId', 'name avatar role phone email')
      .populate('ownerId', 'name avatar role phone email')
      .populate('deviceId', 'title images brand pricePerDay status');

    if (!booking) {
      return res.status(404).json({
        success: false,
        message: 'Booking not found',
      });
    }

    const isRenter = booking.renterId?._id?.toString() === currentUserId.toString();
    const isOwner = booking.ownerId?._id?.toString() === currentUserId.toString();
    const isAdmin = req.auth?.role === 'admin';

    if (!isRenter && !isOwner && !isAdmin) {
      return res.status(403).json({
        success: false,
        message: 'You are not authorized to view messages for this booking.',
      });
    }

    const otherUser = isRenter ? booking.ownerId : booking.renterId;

    // Đánh dấu tất cả tin nhắn gửi đến currentUserId trong booking này là 'read'
    const userObjId = mongoose.Types.ObjectId.isValid(currentUserId)
      ? new mongoose.Types.ObjectId(currentUserId)
      : currentUserId;

    await Message.updateMany(
      {
        bookingId: booking._id,
        $or: [
          { receiverId: userObjId },
          { receiverId: String(currentUserId) },
          { senderId: { $ne: userObjId } },
        ],
        status: { $ne: 'read' },
      },
      {
        $set: { status: 'read' },
      }
    );

    try {
      const io = getIO();
      if (io) {
        io.to(`chat_${booking._id}`).emit('messages_read', {
          bookingId: String(booking._id),
          readBy: String(currentUserId),
        });
        io.to(`user_${currentUserId}`).emit('messages_read', {
          bookingId: String(booking._id),
          readBy: String(currentUserId),
        });
      }
    } catch (socketErr) {
      console.warn('⚠️ [Socket.IO] Failed to emit messages_read:', socketErr.message);
    }

    // Fetch messages sorted newest first (for inverted FlatList)
    const rawMessages = await Message.find({ bookingId })
      .sort({ createdAt: -1 })
      .limit(100);

    const messages = rawMessages.map((m) => ({
      _id: m._id.toString(),
      bookingId: m.bookingId.toString(),
      senderId: m.senderId.toString(),
      receiverId: m.receiverId.toString(),
      messageType: m.type === 'quick_template' ? 'template' : m.type,
      text: m.content || '',
      mediaUrl: m.mediaUrl || '',
      locationData:
        m.location && (m.location.latitude != null || m.location.lat != null)
          ? {
              latitude: Number(m.location.latitude ?? m.location.lat),
              longitude: Number(m.location.longitude ?? m.location.lng),
              address: m.location.address || '',
            }
          : undefined,
      createdAt: m.createdAt ? m.createdAt.toISOString() : new Date().toISOString(),
      status: m.status || 'sent',
    }));

    return res.status(200).json({
      success: true,
      data: {
        booking: {
          _id: booking._id.toString(),
          bookingCode: booking.bookingCode || '',
          status: booking.status,
          startDate: booking.startDate,
          endDate: booking.endDate,
          device: booking.deviceId
            ? {
                _id: booking.deviceId._id.toString(),
                title: booking.deviceId.title || '',
                image: booking.deviceId.images?.[0] || '',
                brand: booking.deviceId.brand || '',
              }
            : null,
        },
        otherUser: otherUser
          ? {
              _id: otherUser._id.toString(),
              name: otherUser.name || '',
              avatar: otherUser.avatar || '',
              role: otherUser.role || '',
              phone: otherUser.phone || '',
            }
          : null,
        messages,
      },
    });
  } catch (error) {
    console.error('❌ [getChatHistory] Error:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to retrieve chat history',
      error: error.message,
    });
  }
};

/**
 * POST /api/chats/:bookingId/messages
 * Save new message to collection and notify recipient
 */
export const sendMessage = async (req, res) => {
  try {
    const { bookingId } = req.params;
    const currentUserId = req.auth?.id || req.auth?.userId || req.auth?._id;

    if (!currentUserId) {
      return res.status(401).json({
        success: false,
        message: 'Unauthorized',
      });
    }

    const booking = await Booking.findById(bookingId);
    if (!booking) {
      return res.status(404).json({
        success: false,
        message: 'Booking not found',
      });
    }

    const isRenter = booking.renterId.toString() === currentUserId.toString();
    const isOwner = booking.ownerId.toString() === currentUserId.toString();

    if (!isRenter && !isOwner) {
      return res.status(403).json({
        success: false,
        message: 'Only the renter or owner can send messages for this booking.',
      });
    }

    const receiverId = isRenter ? booking.ownerId : booking.renterId;
    const { text, content, messageType = 'text', mediaUrl = '', locationData } = req.body;

    const messageContent = (text !== undefined ? text : content) || '';

    // Validate that at least one content format exists
    if (!messageContent.trim() && !mediaUrl && !locationData) {
      return res.status(400).json({
        success: false,
        message: 'Message content, media URL, or location is required.',
      });
    }

    let location = undefined;
    if (locationData && (locationData.latitude != null || locationData.lat != null)) {
      location = {
        latitude: Number(locationData.latitude ?? locationData.lat),
        longitude: Number(locationData.longitude ?? locationData.lng),
        address: locationData.address || '',
      };
    }

    const savedType = messageType === 'template' ? 'quick_template' : messageType;

    const newMessage = await Message.create({
      bookingId,
      senderId: currentUserId,
      receiverId,
      type: savedType,
      content: messageContent,
      mediaUrl: mediaUrl || '',
      location,
      status: 'sent',
    });

    const savedMessageResponse = {
      _id: newMessage._id.toString(),
      bookingId: newMessage.bookingId.toString(),
      senderId: newMessage.senderId.toString(),
      receiverId: newMessage.receiverId.toString(),
      messageType: messageType,
      text: newMessage.content || '',
      mediaUrl: newMessage.mediaUrl || '',
      locationData: location,
      createdAt: newMessage.createdAt.toISOString(),
      status: newMessage.status || 'sent',
    };

    // Emit real-time message via Socket.IO to booking room and receiver room
    try {
      const io = getIO();
      if (io) {
        io.to(`chat_${bookingId}`).emit('new_message', savedMessageResponse);
        io.to(`user_${receiverId}`).emit('new_message', savedMessageResponse);
        console.log(`💬 [Socket.IO] Broadcasted new_message to chat_${bookingId} and user_${receiverId}`);
      }
    } catch (socketErr) {
      console.warn('⚠️ [Socket.IO] Failed to emit message:', socketErr.message);
    }

    // Send push notification to recipient
    try {
      const sender = await User.findById(currentUserId).select('name');
      const senderName = sender?.name || 'Someone';

      let notifBody = messageContent;
      if (messageType === 'image') notifBody = 'Sent a photo attachment.';
      else if (messageType === 'location') notifBody = 'Shared GPS location.';
      else if (messageType === 'template' || messageType === 'quick_template') notifBody = messageContent;

      createAndSendNotification({
        userId: receiverId,
        title: `${senderName} sent a message`,
        body: notifBody || 'You received a new message.',
        type: 'message',
        relatedId: bookingId,
        data: { screen: 'ChatDetail', bookingId: bookingId.toString() },
      }).catch((err) => {
        console.warn('⚠️ [Chat Notification] Warning:', err.message);
      });
    } catch (notifErr) {
      console.warn('⚠️ [Chat Notification] Error:', notifErr.message);
    }

    return res.status(201).json({
      success: true,
      data: savedMessageResponse,
    });
  } catch (error) {
    console.error('❌ [sendMessage] Error:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to send message',
      error: error.message,
    });
  }
};

/**
 * POST /api/chats/upload-image
 * Upload image attachment to Cloudinary
 */
export const uploadChatImage = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: 'Image file is required',
      });
    }

    const cloudName = process.env.CLOUDINARY_CLOUD_NAME;
    const uploadPreset = process.env.CLOUDINARY_UPLOAD_PRESET;
    if (!cloudName || !uploadPreset) {
      return res.status(500).json({
        success: false,
        message: 'Cloudinary configuration is missing',
      });
    }

    const formData = new FormData();
    formData.append(
      'file',
      new Blob([req.file.buffer], { type: req.file.mimetype }),
      req.file.originalname
    );
    formData.append('upload_preset', uploadPreset);
    formData.append('folder', 'techshare/chat');

    const cloudinaryResponse = await fetch(
      `https://api.cloudinary.com/v1_1/${cloudName}/image/upload`,
      { method: 'POST', body: formData }
    );
    const cloudinaryData = await cloudinaryResponse.json();

    if (!cloudinaryResponse.ok || !cloudinaryData.secure_url) {
      console.error('❌ [uploadChatImage] Cloudinary error:', cloudinaryData);
      return res.status(502).json({
        success: false,
        message: cloudinaryData?.error?.message || 'Image upload failed',
      });
    }

    return res.status(200).json({
      success: true,
      data: { url: cloudinaryData.secure_url },
    });
  } catch (error) {
    console.error('❌ [uploadChatImage] Error:', error);
    return res.status(500).json({
      success: false,
      message: 'Server error uploading chat image',
      error: error.message,
    });
  }
};

/**
 * PATCH /api/chats/:bookingId/read
 * Đánh dấu đã đọc tất cả tin nhắn trong một booking
 */
export const markChatMessagesAsRead = async (req, res) => {
  try {
    const { bookingId } = req.params;
    const currentUserId = req.auth?.id || req.auth?.userId || req.auth?._id;

    if (!currentUserId) {
      return res.status(401).json({
        success: false,
        message: 'Unauthorized',
      });
    }

    const userObjId = mongoose.Types.ObjectId.isValid(currentUserId)
      ? new mongoose.Types.ObjectId(currentUserId)
      : currentUserId;

    const bookingObjId = mongoose.Types.ObjectId.isValid(bookingId)
      ? new mongoose.Types.ObjectId(bookingId)
      : bookingId;

    await Message.updateMany(
      {
        $or: [{ bookingId: bookingObjId }, { bookingId: String(bookingId) }],
        $or: [
          { receiverId: userObjId },
          { receiverId: String(currentUserId) },
          { senderId: { $ne: userObjId } },
        ],
        status: { $ne: 'read' },
      },
      {
        $set: { status: 'read' },
      }
    );

    try {
      const io = getIO();
      if (io) {
        io.to(`chat_${bookingId}`).emit('messages_read', {
          bookingId: String(bookingId),
          readBy: String(currentUserId),
        });
        io.to(`user_${currentUserId}`).emit('messages_read', {
          bookingId: String(bookingId),
          readBy: String(currentUserId),
        });
      }
    } catch (socketErr) {
      console.warn('⚠️ [Socket.IO] Failed to emit messages_read:', socketErr.message);
    }

    return res.status(200).json({
      success: true,
      message: 'Messages marked as read',
    });
  } catch (error) {
    console.error('❌ [markChatMessagesAsRead] Error:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to mark messages as read',
      error: error.message,
    });
  }
};
