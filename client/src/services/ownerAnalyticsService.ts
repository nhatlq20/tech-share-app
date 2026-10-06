import { apiClient } from '../config/api';

export interface OwnerAnalyticsDevice {
  _id: string;
  name: string;
  brand?: string;
  category?: string;
  pricePerDay?: number;
  rentalCount?: number;
  ratingAvg?: number;
  revenueTotal?: number;
  status: string;
  images?: string[];
}

export interface OwnerAnalyticsBooking {
  _id: string;
  rentalFee: number;
  startDate: string;
  endDate: string;
  updatedAt?: string;
  status: string;
  deviceId: string | { _id: string; name?: string };
  renterId: string | { _id: string; name?: string };
}

export interface OwnerRevenueByDay {
  date: string;
  day: string;
  revenue: number;
}

export interface OwnerAnalyticsData {
  ownerId: string;
  totalRevenue: number;
  monthlyRevenue?: number;
  monthlyGrowth?: number;
  totalDevices: number;
  totalBookings: number;
  completedBookingsCount?: number;
  activeRentals?: number;
  rentedDevices: number;
  availableDevices?: number;
  utilizationRate?: number;
  walletBalance?: number;
  escrowHolding?: number;
  rating?: number;
  ownerRating?: number;
  trustScore?: number;
  totalReviews?: number;
  totalReview?: number;
  revenueByDay: OwnerRevenueByDay[];
  devices: OwnerAnalyticsDevice[];
  bookings: OwnerAnalyticsBooking[];
}

export type OwnerAnalyticsApiResponse = {
  success: boolean;
  message?: string;
  data?: OwnerAnalyticsData;
};

export const ownerAnalyticsService = {
  getOwnerAnalytics: async (token?: string): Promise<OwnerAnalyticsData> => {
    const headers = token ? { Authorization: `Bearer ${token}` } : undefined;
    const response = await apiClient.get<OwnerAnalyticsApiResponse>('/owner/analytics', {
      headers,
    });

    if (!response.data || !response.data.success || !response.data.data) {
      throw new Error(response.data?.message || 'Không thể tải thống kê từ MongoDB');
    }

    return response.data.data;
  },
};
