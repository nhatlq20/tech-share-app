import Message from '../models/Message.js';
import Booking from '../models/Booking.js';
import User from '../models/User.js';
import { createAndSendNotification } from '../services/notificationService.js';
import { getIO } from '../socket.js';

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
        type: 'order',
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
