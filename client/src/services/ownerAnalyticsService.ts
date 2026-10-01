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
  totalDevices: number;
  totalBookings: number;
  rentedDevices: number;
  revenueByDay: OwnerRevenueByDay[];
  devices: OwnerAnalyticsDevice[];
  bookings: OwnerAnalyticsBooking[];
}


type OwnerAnalyticsApiResponse = {
  success: boolean;
  message?: string;
  data?: OwnerAnalyticsData;
};

export const ownerAnalyticsService = {
  getOwnerAnalytics: async (token: string): Promise<OwnerAnalyticsData> => {
    const response = await apiClient.get<OwnerAnalyticsApiResponse>('/owner/analytics', {
      headers: { Authorization: `Bearer ${token}` },
    });

    if (!response.data.success || !response.data.data) {
      throw new Error(response.data.message || 'Unable to load owner analytics.');
    }

    return response.data.data;
  },
};
