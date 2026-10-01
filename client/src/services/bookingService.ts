import { apiClient } from '../config/api';

export interface ExtensionRequestInfo {
  requestedEndDate?: string;
  requestedDays?: number;
  additionalFee?: number;
  status?: 'none' | 'pending' | 'approved' | 'rejected';
}

export interface Booking {
  _id: string;
  bookingCode: string;
  deviceId: any;
  renterId: string;
  ownerId: any;
  startDate: string;
  endDate: string;
  totalDays: number;
  pricePerDayAtBooking?: number;
  rentalFee?: number;
  depositFee?: number;
  totalAmount: number;
  status: 'pending' | 'approved' | 'active' | 'completed' | 'cancelled' | 'rejected';
  paymentStatus: 'unpaid' | 'deposit_held' | 'paid' | 'refunded' | 'disputed';
  extensionRequest?: ExtensionRequestInfo;
  isReviewed?: boolean;
  reviewId?: string;
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

  getBookingById: async (bookingId: string): Promise<Booking> => {
    const res = await apiClient.get(`/bookings/${bookingId}`);
    return res.data.data;
  },

  cancelBooking: async (bookingId: string, reason: string): Promise<Booking> => {
    const res = await apiClient.put(`/bookings/${bookingId}/cancel`, { reason });
    return res.data.data;
  },

  requestExtension: async (bookingId: string, additionalDays: number): Promise<Booking> => {
    const res = await apiClient.post(`/bookings/${bookingId}/extend`, { additionalDays });
    return res.data.data;
  },

  respondExtension: async (
    bookingId: string,
    action: 'approve' | 'reject',
    rejectReason?: string
  ): Promise<Booking> => {
    const res = await apiClient.put(`/bookings/${bookingId}/respond-extension`, {
      action,
      rejectReason,
    });
    return res.data.data;
  },

  getDeviceBusyDates: async (
    deviceId: string
  ): Promise<{ _id: string; startDate: string; endDate: string; status: string; bookingCode?: string }[]> => {
    const res = await apiClient.get(`/bookings/busy-dates/${deviceId}`);
    return res.data.busyRanges || [];
  },
};
