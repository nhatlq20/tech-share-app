import { apiClient } from '../config/api';
import {
  ChatHistoryResponse,
  ChatMessage,
  ChatMessageType,
  LocationData,
} from '../types';

export interface SendMessagePayload {
  text?: string;
  messageType: ChatMessageType;
  mediaUrl?: string;
  locationData?: LocationData;
}

export interface ChatConversationItem {
  bookingId: string;
  bookingCode: string;
  bookingStatus: string;
  startDate?: string;
  endDate?: string;
  otherUser: {
    _id: string;
    name: string;
    avatar?: string;
    phone?: string;
    isVerified?: boolean;
    role?: string;
  } | null;
  device: {
    _id: string;
    title: string;
    image?: string;
    brand?: string;
  } | null;
  lastMessage: {
    _id: string;
    text: string;
    senderId: string;
    isFromMe: boolean;
    createdAt: string;
    status: string;
  } | null;
  unreadCount: number;
  lastActivityAt: string;
}

export const chatService = {
  /**
   * GET /api/chats/conversations
   * Retrieve conversation list with newest message on top
   */
  getConversations: async (role?: string): Promise<ChatConversationItem[]> => {
    const response = await apiClient.get('/chats/conversations', {
      params: role ? { role } : {},
    });
    if (response.data && response.data.success) {
      return response.data.data;
    }
    throw new Error(response.data?.message || 'Failed to load conversations');
  },

  /**
   * GET /api/chats/:bookingId
   * Retrieve message history for a booking
   */
  getChatHistory: async (bookingId: string): Promise<ChatHistoryResponse> => {
    const response = await apiClient.get(`/chats/${bookingId}`);
    if (response.data && response.data.success) {
      return response.data.data;
    }
    throw new Error(response.data?.message || 'Failed to load chat history');
  },

  /**
   * POST /api/chats/:bookingId/messages
   * Send a new chat message
   */
  sendMessage: async (
    bookingId: string,
    payload: SendMessagePayload
  ): Promise<ChatMessage> => {
    const response = await apiClient.post(`/chats/${bookingId}/messages`, payload);
    if (response.data && response.data.success) {
      return response.data.data;
    }
    throw new Error(response.data?.message || 'Failed to send message');
  },

  /**
   * PATCH /api/chats/:bookingId/read
   * Mark all incoming messages in a booking as read
   */
  markChatAsRead: async (bookingId: string): Promise<void> => {
    try {
      await apiClient.patch(`/chats/${bookingId}/read`);
    } catch (err: any) {
      console.warn('Failed to mark chat as read:', err?.message);
    }
  },

  /**
   * Upload image attachment for chat via multipart form-data
   */
  uploadChatImage: async (
    imageUri: string,
    fileName = `chat-${Date.now()}.jpg`,
    mimeType = 'image/jpeg'
  ): Promise<string> => {
    const formData = new FormData();
    formData.append('image', {
      uri: imageUri,
      name: fileName,
      type: mimeType,
    } as any);

    const response = await apiClient.post('/chats/upload-image', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });

    if (response.data && response.data.success && response.data.data?.url) {
      return response.data.data.url;
    }

    throw new Error(response.data?.message || 'Failed to upload chat image');
  },
};

export default chatService;
