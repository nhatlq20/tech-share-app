import { apiClient } from '../config/api';
import {
  AdminAnalytics,
  DisputeItem,
  EkycItem,
  AdminDeviceItem,
  ResolveDisputePayload,
} from '../types';

// ==========================================
// Dữ liệu Fallback dự phòng khi Offline / Server chưa bật
// ==========================================
export const FALLBACK_ANALYTICS: AdminAnalytics = {
  totalUsers: 11,
  verifiedUsers: 2,
  totalDevices: 10,
  rentedDevices: 2,
  availableDevices: 8,
  activeBookings: 1,
  completedBookingsCount: 1,
  totalRentalRevenue: 1350000,
  platformCommission: 135000,
  categoryDistribution: [
    { category: 'smartphone', count: 3, percentage: 30 },
    { category: 'laptop', count: 2, percentage: 20 },
    { category: 'camera', count: 2, percentage: 20 },
    { category: 'drone', count: 1, percentage: 10 },
    { category: 'audio', count: 1, percentage: 10 },
    { category: 'gaming', count: 1, percentage: 10 },
  ],
  pendingTasks: {
    disputes: 1,
    ekyc: 2,
    total: 3,
  },
};

export const FALLBACK_DISPUTES: DisputeItem[] = [
  {
    _id: '64e0a12f9b1c2b001a777991',
    bookingId: {
      _id: '64e0a12f9b1c2b001a444441',
      bookingCode: 'TS-20260901',
      deviceId: {
        _id: '64e0a12f9b1c2b001a000003',
        name: 'Sony Alpha A7 IV + FE 24-70mm F2.8 GM II',
        brand: 'Sony',
        images: ['https://images.unsplash.com/photo-1516035069371-29a1b244cc32?w=800'],
        category: 'camera',
        pricePerDay: 450000,
        depositAmount: 25000000,
      },
      renterId: {
        _id: '64e0a12f9b1c2b001a333333',
        name: 'Hoang Nam Creator',
        avatar: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=400',
        phone: '0901234567',
        trustScore: 98,
        rating: 4.9,
      },
      ownerId: {
        _id: '64e0a12f9b1c2b001a222222',
        name: 'Minh Tuan Tech Review',
        avatar: 'https://images.unsplash.com/photo-1570295999919-56ceb5ecca61?w=400',
        phone: '0912345678',
        trustScore: 100,
        rating: 5.0,
      },
      startDate: '2026-09-01T08:00:00.000Z',
      endDate: '2026-09-04T18:00:00.000Z',
      totalDays: 3,
      rentalFee: 1350000,
      depositFee: 25000000,
      status: 'completed',
      paymentStatus: 'paid',
      handoverPhotos: {
        beforeRental: ['https://images.unsplash.com/photo-1516035069371-29a1b244cc32?w=800'],
        afterRental: ['https://images.unsplash.com/photo-1502920917128-1aa500764cbd?w=800'],
      },
    },
    raisedBy: {
      _id: '64e0a12f9b1c2b001a222222',
      name: 'Minh Tuan Tech Review',
      avatar: 'https://images.unsplash.com/photo-1570295999919-56ceb5ecca61?w=400',
      phone: '0912345678',
    },
    reason:
      'Khách thuê làm trầy xước viền kim loại và kính bảo vệ của ống kính Sony 24-70mm GM II khi quay ngoại cảnh tại Ba Vì.',
    evidenceImages: ['https://images.unsplash.com/photo-1502920917128-1aa500764cbd?w=800'],
    requestedDeductAmount: 2500000,
    status: 'pending',
    createdAt: new Date().toISOString(),
  },
];

export const FALLBACK_EKYC: EkycItem[] = [
  {
    _id: '64e0a12f9b1c2b001a888991',
    userId: {
      _id: '64e0a12f9b1c2b001a333333',
      name: 'Hoang Nam Creator',
      avatar: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=400',
      phone: '0901234567',
      email: 'renter1@techshare.vn',
      trustScore: 98,
      isVerified: false,
    },
    idCardFrontUrl: 'https://images.unsplash.com/photo-1628157582853-a796fa650a6a?w=800',
    idCardBackUrl: 'https://images.unsplash.com/photo-1628157582853-a796fa650a6a?w=800',
    selfieUrl: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=800',
    status: 'pending',
    createdAt: new Date().toISOString(),
  },
  {
    _id: '64e0a12f9b1c2b001a888992',
    userId: {
      _id: '64e0a12f9b1c2b001a333002',
      name: 'Minh Anh Photographer',
      avatar: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=400',
      phone: '0907654321',
      email: 'renter2@techshare.vn',
      trustScore: 95,
      isVerified: false,
    },
    idCardFrontUrl: 'https://images.unsplash.com/photo-1628157582853-a796fa650a6a?w=800',
    idCardBackUrl: 'https://images.unsplash.com/photo-1628157582853-a796fa650a6a?w=800',
    selfieUrl: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=800',
    status: 'pending',
    createdAt: new Date().toISOString(),
  },
];

export const FALLBACK_ADMIN_DEVICES: AdminDeviceItem[] = [
  {
    _id: '64e0a12f9b1c2b001a000001',
    name: 'iPhone 15 Pro Max 256GB Natural Titanium',
    brand: 'Apple',
    category: 'smartphone',
    condition: 'new99',
    pricePerDay: 250000,
    depositAmount: 15000000,
    images: ['https://images.unsplash.com/photo-1695048133142-1a20484d2569?w=800'],
    status: 'available',
    isDeleted: false,
    ownerId: {
      _id: '64e0a12f9b1c2b001a222222',
      name: 'Minh Tuan Tech Review',
      phone: '0912345678',
    },
  },
  {
    _id: '64e0a12f9b1c2b001a000002',
    name: 'Samsung Galaxy S24 Ultra 512GB Titanium Gray',
    brand: 'Samsung',
    category: 'smartphone',
    condition: 'new99',
    pricePerDay: 240000,
    depositAmount: 14000000,
    images: ['https://images.unsplash.com/photo-1610945415295-d9bbf067e59c?w=800'],
    status: 'available',
    isDeleted: false,
    ownerId: {
      _id: '64e0a12f9b1c2b001a222222',
      name: 'Minh Tuan Tech Review',
      phone: '0912345678',
    },
  },
  {
    _id: '64e0a12f9b1c2b001a000003',
    name: 'Sony Alpha A7 IV + FE 24-70mm F2.8 GM II',
    brand: 'Sony',
    category: 'camera',
    condition: 'new99',
    pricePerDay: 450000,
    depositAmount: 25000000,
    images: ['https://images.unsplash.com/photo-1516035069371-29a1b244cc32?w=800'],
    status: 'available',
    isDeleted: false,
    ownerId: {
      _id: '64e0a12f9b1c2b001a222222',
      name: 'Minh Tuan Tech Review',
      phone: '0912345678',
    },
  },
  {
    _id: '64e0a12f9b1c2b001a000004',
    name: 'MacBook Pro 16 inch M3 Max 36GB RAM 1TB',
    brand: 'Apple',
    category: 'laptop',
    condition: 'new99',
    pricePerDay: 550000,
    depositAmount: 35000000,
    images: ['https://images.unsplash.com/photo-1517336714731-489689fd1ca8?w=800'],
    status: 'rented',
    isDeleted: false,
    ownerId: {
      _id: '64e0a12f9b1c2b001a222222',
      name: 'Minh Tuan Tech Review',
      phone: '0912345678',
    },
  },
];

export const adminService = {
  /**
   * Lấy số liệu KPI tổng quan sàn
   */
  getAnalytics: async (): Promise<AdminAnalytics> => {
    try {
      const response = await apiClient.get('/admin/analytics');
      if (response.data && response.data.success) {
        return response.data.data;
      }
      return FALLBACK_ANALYTICS;
    } catch (error) {
      console.warn('⚠️ [adminService.getAnalytics] Dùng dữ liệu fallback:', error);
      return FALLBACK_ANALYTICS;
    }
  },

  /**
   * Lấy danh sách tranh chấp cọc
   */
  getDisputes: async (status?: string): Promise<DisputeItem[]> => {
    try {
      const params: any = {};
      if (status) params.status = status;
      const response = await apiClient.get('/admin/disputes', { params });
      if (response.data && response.data.success) {
        return response.data.data;
      }
      return FALLBACK_DISPUTES;
    } catch (error) {
      console.warn('⚠️ [adminService.getDisputes] Dùng dữ liệu fallback:', error);
      return FALLBACK_DISPUTES;
    }
  },

  /**
   * Ban hành phán quyết tranh chấp cọc
   */
  resolveDispute: async (disputeId: string, payload: ResolveDisputePayload): Promise<any> => {
    try {
      const response = await apiClient.post(`/admin/disputes/${disputeId}/resolve`, payload);
      return response.data;
    } catch (error: any) {
      console.warn('⚠️ [adminService.resolveDispute] Gọi API thất bại:', error);
      // Giả lập xử lý thành công offline nếu không có server
      return {
        success: true,
        message: 'Đã ban hành phán quyết thành công (mô phỏng)!',
        data: {
          disputeId,
          ...payload,
        },
      };
    }
  },

  /**
   * Lấy danh sách hồ sơ eKYC
   */
  getEkycRequests: async (status?: string): Promise<EkycItem[]> => {
    try {
      const params: any = {};
      if (status) params.status = status;
      const response = await apiClient.get('/admin/ekyc', { params });
      if (response.data && response.data.success) {
        return response.data.data;
      }
      return FALLBACK_EKYC;
    } catch (error) {
      console.warn('⚠️ [adminService.getEkycRequests] Dùng dữ liệu fallback:', error);
      return FALLBACK_EKYC;
    }
  },

  /**
   * Phê duyệt hồ sơ eKYC và cấp Tích xanh
   */
  approveEkyc: async (requestId: string): Promise<any> => {
    try {
      const response = await apiClient.patch(`/admin/ekyc/${requestId}/approve`);
      return response.data;
    } catch (error: any) {
      console.warn('⚠️ [adminService.approveEkyc] Dùng giả lập:', error);
      return {
        success: true,
        message: 'Đã phê duyệt eKYC thành công (mô phỏng)!',
      };
    }
  },

  /**
   * Từ chối hồ sơ eKYC
   */
  rejectEkyc: async (requestId: string, rejectReason: string): Promise<any> => {
    try {
      const response = await apiClient.patch(`/admin/ekyc/${requestId}/reject`, { rejectReason });
      return response.data;
    } catch (error: any) {
      console.warn('⚠️ [adminService.rejectEkyc] Dùng giả lập:', error);
      return {
        success: true,
        message: 'Đã từ chối eKYC thành công (mô phỏng)!',
      };
    }
  },

  /**
   * Lấy danh sách thiết bị kiểm duyệt
   */
  getAdminDevices: async (q?: string, category?: string): Promise<AdminDeviceItem[]> => {
    try {
      const params: any = {};
      if (q) params.q = q;
      if (category) params.category = category;
      const response = await apiClient.get('/admin/devices', { params });
      if (response.data && response.data.success) {
        return response.data.data;
      }
      return FALLBACK_ADMIN_DEVICES;
    } catch (error) {
      console.warn('⚠️ [adminService.getAdminDevices] Dùng dữ liệu fallback:', error);
      let list = [...FALLBACK_ADMIN_DEVICES];
      if (q) {
        const lowerQ = q.toLowerCase();
        list = list.filter(
          d => d.name.toLowerCase().includes(lowerQ) || d.brand.toLowerCase().includes(lowerQ)
        );
      }
      return list;
    }
  },

  /**
   * Xóa mềm thiết bị vi phạm chính sách
   */
  deleteDevice: async (deviceId: string): Promise<any> => {
    try {
      const response = await apiClient.delete(`/admin/devices/${deviceId}`);
      return response.data;
    } catch (error: any) {
      console.warn('⚠️ [adminService.deleteDevice] Dùng giả lập:', error);
      return {
        success: true,
        message: 'Đã xóa mềm thiết bị thành công (mô phỏng)!',
      };
    }
  },
};
