import { apiClient } from '../config/api';

export interface CreateReviewPayload {
  bookingId: string;
  rating: number; // 1 - 5 (Thiết bị)
  comment: string;
  ownerRating: number; // 1 - 5 (Chủ máy)
  ownerFeedback?: string;
  images?: string[];
}

export interface ReviewItem {
  _id: string;
  bookingId: string;
  deviceId: any;
  renterId: any;
  ownerId: any;
  rating: number;
  comment: string;
  ownerRating: number;
  ownerFeedback?: string;
  images: string[];
  createdAt: string;
}

export const reviewService = {
  createReview: async (payload: CreateReviewPayload) => {
    const res = await apiClient.post('/reviews', payload);
    return res.data;
  },

  getDeviceReviews: async (deviceId: string): Promise<ReviewItem[]> => {
    const res = await apiClient.get(`/reviews/device/${deviceId}`);
    return res.data.data;
  },

  getBookingReview: async (bookingId: string): Promise<ReviewItem> => {
    const res = await apiClient.get(`/reviews/booking/${bookingId}`);
    return res.data.data;
  },
};
