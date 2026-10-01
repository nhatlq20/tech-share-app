import { apiClient } from '../config/api';
import { OwnerAnalyticsResponse } from '../types';

export interface OwnerAnalyticsDevice {
  _id: string;
  name: string;
  brand?: string;
  category?: string;
  pricePerDay?: number;
  rentalCount?: number;
  ratingAvg?: number;
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
  revenueByDay: OwnerRevenueByDay[];
  devices: OwnerAnalyticsDevice[];
  bookings: OwnerAnalyticsBooking[];
  fleet?: any[];
}

export const EMPTY_OWNER_ANALYTICS: OwnerAnalyticsResponse = {
  overview: {
    totalRevenue: 0,
    activeRentals: 0,
    escrowHolding: 0,
    utilizationRate: 0,
  },
  revenueChart: {
    period: 'week',
    labels: ['CN', 'T2', 'T3', 'T4', 'T5', 'T6', 'T7'],
    datasets: [
      {
        data: [0, 0, 0, 0, 0, 0, 0],
      },
    ],
  },
  fleet: [],
};

export const ownerAnalyticsService = {
  getOwnerAnalytics: async (
    periodOrToken?: 'week' | 'month' | string
  ): Promise<OwnerAnalyticsResponse> => {
    const period = periodOrToken === 'month' ? 'month' : 'week';
    try {
      const response = await apiClient.get('/owner/analytics', {
        params: { period },
      });
      if (response.data && response.data.success && response.data.data) {
        return response.data.data;
      }
    } catch (error) {
      console.warn('⚠️ [ownerAnalyticsService] Lỗi khi tải dữ liệu từ MongoDB:', error);
    }

    return {
      ...EMPTY_OWNER_ANALYTICS,
      revenueChart: {
        period,
        labels:
          period === 'month'
            ? ['Tuần 1', 'Tuần 2', 'Tuần 3', 'Tuần 4']
            : ['CN', 'T2', 'T3', 'T4', 'T5', 'T6', 'T7'],
        datasets: [
          {
            data: period === 'month' ? [0, 0, 0, 0] : [0, 0, 0, 0, 0, 0, 0],
          },
        ],
      },
    };
  },
};
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
