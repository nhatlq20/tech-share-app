import { apiClient } from '../config/api';

export interface Booking {
  _id: string;
  bookingCode: string;
  deviceId: any;
  renterId: string;
  ownerId: string;
  startDate: string;
  endDate: string;
  totalDays: number;
  totalAmount: number;
  status: 'pending' | 'approved' | 'active' | 'completed' | 'cancelled';
  paymentStatus: 'unpaid' | 'paid' | 'refunded';
  createdAt: string;
}

export const bookingService = {
  createBooking: async (payload: any) => {
    const res = await apiClient.post('/bookings', payload);
    return res.data;
  },

  getMyBookings: async (status?: string): Promise<Booking[]> => {
    const res = await apiClient.get('/bookings/my-bookings', {
      params: status ? { status } : {},
    });
    return res.data.data;
  },

  cancelBooking: async (bookingId: string, reason: string): Promise<Booking> => {
    const res = await apiClient.put(`/bookings/${bookingId}/cancel`, { reason });
    return res.data.data;
  },
};
