import { apiClient } from '../config/api';
import { OwnerAnalyticsResponse } from '../types';

export const FALLBACK_OWNER_ANALYTICS_WEEK: OwnerAnalyticsResponse = {
  overview: {
    totalRevenue: 42500000,
    activeRentals: 2,
    escrowHolding: 15000000,
    utilizationRate: 74.2,
  },
  revenueChart: {
    period: 'week',
    labels: ['T2', 'T3', 'T4', 'T5', 'T6', 'T7', 'CN'],
    datasets: [
      {
        data: [1200000, 1800000, 2400000, 3100000, 2800000, 4500000, 3900000],
      },
    ],
  },
  fleet: [
    {
      _id: '64e0a12f9b1c2b001a000003',
      name: 'Sony Alpha A7 IV Mirrorless + Lens 24-70mm GM II',
      brand: 'Sony',
      category: 'camera',
      imageUrl: 'https://images.unsplash.com/photo-1516035069371-29a1b244cc32?w=800',
      pricePerDay: 450000,
      rentalCount: 18,
      ratingAvg: 4.9,
      revenueTotal: 18500000,
      status: 'available',
    },
    {
      _id: '64e0a12f9b1c2b001a000001',
      name: 'iPhone 15 Pro Max 256GB Natural Titanium',
      brand: 'Apple',
      category: 'smartphone',
      imageUrl: 'https://images.unsplash.com/photo-1695048133142-1a20484d2569?w=800',
      pricePerDay: 250000,
      rentalCount: 24,
      ratingAvg: 4.9,
      revenueTotal: 14200000,
      status: 'rented',
    },
    {
      _id: '64e0a12f9b1c2b001a000002',
      name: 'MacBook Pro 16 inch M3 Max 36GB RAM 1TB',
      brand: 'Apple',
      category: 'laptop',
      imageUrl: 'https://images.unsplash.com/photo-1517336714731-489689fd1ca8?w=800',
      pricePerDay: 550000,
      rentalCount: 9,
      ratingAvg: 5.0,
      revenueTotal: 9800000,
      status: 'available',
    },
  ],
};

export const FALLBACK_OWNER_ANALYTICS_MONTH: OwnerAnalyticsResponse = {
  ...FALLBACK_OWNER_ANALYTICS_WEEK,
  revenueChart: {
    period: 'month',
    labels: ['Tuần 1', 'Tuần 2', 'Tuần 3', 'Tuần 4'],
    datasets: [
      {
        data: [7800000, 9500000, 11400000, 13800000],
      },
    ],
  },
};

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

type OwnerAnalyticsApiResponse = {
  success: boolean;
  message?: string;
  data?: OwnerAnalyticsData;
};

export const ownerAnalyticsService = {
  getOwnerAnalytics: async (tokenOrPeriod: string | 'week' | 'month'): Promise<any> => {
    if (tokenOrPeriod === 'week' || tokenOrPeriod === 'month') {
      try {
        const response = await apiClient.get('/devices/owner/analytics', {
          params: { period: tokenOrPeriod },
        });
        if (response.data && response.data.success) {
          return response.data.data;
        }
        return tokenOrPeriod === 'month' ? FALLBACK_OWNER_ANALYTICS_MONTH : FALLBACK_OWNER_ANALYTICS_WEEK;
      } catch (error) {
        return tokenOrPeriod === 'month' ? FALLBACK_OWNER_ANALYTICS_MONTH : FALLBACK_OWNER_ANALYTICS_WEEK;
      }
    }

    const response = await apiClient.get<OwnerAnalyticsApiResponse>('/owner/analytics', {
      headers: { Authorization: `Bearer ${tokenOrPeriod}` },
    });

    if (!response.data.success || !response.data.data) {
      throw new Error(response.data.message || 'Unable to load owner analytics.');
    }

    return response.data.data;
  },
};
