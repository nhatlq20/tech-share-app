/**
 * TechShare Mobile App - Central TypeScript Type Definitions
 * Chuẩn hoá theo toàn bộ 10 phân hệ tính năng và CSDL MongoDB Atlas
 */

// ==========================================
// 1. Phân hệ Người dùng (Users & Auth)
// ==========================================
export type UserRole = 'renter' | 'owner' | 'admin';

export interface Role {
  _id: string;
  code: UserRole;
  name: string;
  description?: string;
  permissions?: string[];
  isActive?: boolean;
  createdAt?: string;
  updatedAt?: string;
}

export interface Account {
  _id: string;
  username: string;
  email: string;
  roleId: string | Role;
  isActive: boolean;
  lastLogin?: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface GeoPoint {
  type: 'Point';
  coordinates: [number, number]; // [kinh độ (lng), vĩ độ (lat)]
}

export interface UserAddress {
  street?: string;
  ward?: string;
  district?: string;
  city?: string;
  fullAddress: string;
}

export interface User {
  _id: string;
  accountId?: string | Account;
  account?: Account;
  name: string;
  username?: string;
  email?: string;
  phone?: string;
  avatar?: string;
  role?: UserRole;
  address?: UserAddress;
  location?: GeoPoint;
  favoriteDevices?: string[];
  rating?: number;
  totalReviews?: number;
  trustScore?: number;
  walletBalance?: number;
  walletEscrowBalance?: number;
  badges?: string[];
  referralCode?: string;
  referredBy?: string;
  isVerified?: boolean;
  createdAt?: string;
  updatedAt?: string;
}

export interface AuthState {
  user: User | null;
  token: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  error: string | null;
}

// ==========================================
// 2. Phân hệ Thiết bị Công nghệ (Devices)
// ==========================================
export type DeviceCategory = 
  | 'smartphone' 
  | 'laptop' 
  | 'camera' 
  | 'drone' 
  | 'audio' 
  | 'accessory';

export type DeviceStatus = 'available' | 'rented' | 'maintenance' | 'hidden';

export interface DeviceAiAnalysis {
  summary: string;
  pros: string[];
  cons: string[];
  rentalRecommendation: string;
  analyzedAt?: string;
}

export interface DeviceLocation {
  type: 'Point';
  coordinates: [number, number]; // [lng, lat]
  address: string;
}

export interface Device {
  _id: string;
  owner: User | string;
  title: string;
  brand: string;
  category: DeviceCategory;
  dailyRate: number;
  depositValue: number;
  images: string[];
  specs: Record<string, string>;
  description: string;
  location: DeviceLocation;
  status: DeviceStatus;
  rating: number;
  reviewCount: number;
  aiAnalysis?: DeviceAiAnalysis;
  viewsCount?: number;
  createdAt?: string;
  updatedAt?: string;
}

// ==========================================
// 3. Phân hệ Đơn thuê (Bookings)
// ==========================================
export type BookingStatus =
  | 'pending'
  | 'approved'
  | 'handover_in_progress'
  | 'active'
  | 'returned'
  | 'completed'
  | 'cancelled'
  | 'rejected';

export type PaymentStatus = 'unpaid' | 'deposit_held' | 'paid' | 'refunded';

export interface BookingDeliveryAddress {
  recipientName: string;
  phone: string;
  address: string;
}

export interface BookingTimelineItem {
  status: BookingStatus;
  updatedAt: string;
  note?: string;
}

export interface Booking {
  _id: string;
  bookingCode: string;
  device: Device | string;
  renter: User | string;
  owner: User | string;
  startDate: string;
  endDate: string;
  totalDays: number;
  dailyRate: number;
  rentalFee: number;
  depositValue: number;
  totalAmount: number;
  status: BookingStatus;
  paymentStatus: PaymentStatus;
  deliveryAddress: BookingDeliveryAddress;
  note?: string;
  handoverPhotos?: {
    beforeRental?: string[];
    afterRental?: string[];
  };
  timeline?: BookingTimelineItem[];
  createdAt?: string;
  updatedAt?: string;
}

// ==========================================
// 4. Phân hệ Đánh giá (Reviews)
// ==========================================
export interface Review {
  _id: string;
  booking: string;
  device: Device | string;
  reviewer: User | string;
  targetUser: User | string;
  rating: number; // 1 - 5
  comment: string;
  images?: string[];
  createdAt?: string;
}

// ==========================================
// 5. Phân hệ Thông báo (Notifications)
// ==========================================
export type NotificationType =
  | 'order'
  | 'message'
  | 'promo'
  | 'system'
  | 'reminder'
  | 'booking_request'
  | 'booking_approved'
  | 'booking_cancelled';

export interface Notification {
  _id: string;
  userId?: string;
  recipient?: string;
  title: string;
  body: string;
  type: NotificationType;
  relatedId?: string | null;
  data?: {
    bookingId?: string;
    deviceId?: string;
    [key: string]: any;
  };
  isRead: boolean;
  createdAt?: string;
}

// ==========================================
// 6. Navigation Parameters (3-Tier Navigation)
// ==========================================
export type RootStackParamList = {
  Splash: undefined;
  Login: undefined;
  Register: undefined;
  MainDrawer: undefined;
  DeviceDetail: { deviceId: string };
  BookingCreate: { deviceId: string };
  BookingDetail: { bookingId: string };
  AiCompare: { deviceIdA?: string; deviceIdB?: string };
  PostDevice: undefined;
};

export type MainDrawerParamList = {
  MainTabs: undefined;
  MyBookings: undefined;
  MyDevices: undefined;
  Profile: undefined;
  Settings: undefined;
};

export type MainTabParamList = {
  HomeTab: undefined;
  MapTab: undefined;
  AiTab: undefined;
  WishlistTab: undefined;
  NotificationTab: undefined;
};

// ==========================================
// 7. Phân hệ Quản trị Admin (Admin Hub N-08)
// ==========================================
export interface CategoryDistributionItem {
  category: string;
  count: number;
  percentage: number;
}

export interface AdminAnalytics {
  totalUsers: number;
  verifiedUsers: number;
  totalDevices: number;
  rentedDevices: number;
  availableDevices: number;
  activeBookings: number;
  completedBookingsCount: number;
  totalRentalRevenue: number;
  platformCommission: number;
  categoryDistribution: CategoryDistributionItem[];
  pendingTasks: {
    disputes: number;
    ekyc: number;
    total: number;
  };
}

export type DisputeStatus = 'pending' | 'resolved';
export type DisputeDecision = 'full_refund' | 'partial_deduct' | 'full_deduct';

export interface DisputeItem {
  _id: string;
  bookingId: {
    _id: string;
    bookingCode: string;
    deviceId: {
      _id: string;
      name: string;
      brand: string;
      images: string[];
      category: string;
      pricePerDay: number;
      depositAmount: number;
    };
    renterId: {
      _id: string;
      name: string;
      avatar?: string;
      phone?: string;
      trustScore?: number;
      rating?: number;
    };
    ownerId: {
      _id: string;
      name: string;
      avatar?: string;
      phone?: string;
      trustScore?: number;
      rating?: number;
    };
    startDate: string;
    endDate: string;
    totalDays: number;
    rentalFee: number;
    depositFee: number;
    status: string;
    paymentStatus: string;
    handoverPhotos?: {
      beforeRental?: string[];
      afterRental?: string[];
    };
  };
  raisedBy: {
    _id: string;
    name: string;
    avatar?: string;
    phone?: string;
  };
  reason: string;
  evidenceImages: string[];
  requestedDeductAmount: number;
  status: DisputeStatus;
  adminDecision?: DisputeDecision;
  finalDeductAmount?: number;
  resolvedBy?: {
    _id: string;
    name: string;
  };
  resolvedAt?: string;
  createdAt?: string;
}

export interface ResolveDisputePayload {
  decision: DisputeDecision;
  finalDeductAmount?: number;
  note?: string;
}

export interface EkycItem {
  _id: string;
  userId: {
    _id: string;
    name: string;
    avatar?: string;
    phone?: string;
    email?: string;
    trustScore?: number;
    isVerified?: boolean;
    badges?: string[];
  };
  idCardFrontUrl: string;
  idCardBackUrl: string;
  selfieUrl: string;
  status: 'pending' | 'approved' | 'rejected';
  rejectReason?: string;
  reviewedBy?: {
    _id: string;
    name: string;
  };
  reviewedAt?: string;
  createdAt?: string;
}

export interface AdminDeviceItem {
  _id: string;
  name: string;
  brand: string;
  category: string;
  condition: string;
  pricePerDay: number;
  depositAmount: number;
  images: string[];
  status: string;
  isDeleted: boolean;
  ownerId?: {
    _id: string;
    name: string;
    avatar?: string;
    phone?: string;
  };
  createdAt?: string;
}

// ==========================================
// 8. Phân hệ Báo cáo Doanh thu Chủ máy (K-05 Owner Analytics)
// ==========================================
export interface OwnerOverviewStats {
  totalRevenue: number;
  activeRentals: number;
  escrowHolding: number;
  utilizationRate: number;
}

export interface OwnerRevenueChartData {
  period: 'week' | 'month';
  labels: string[];
  datasets: Array<{
    data: number[];
    color?: (opacity?: number) => string;
    strokeWidth?: number;
  }>;
}

export interface FleetDeviceItem {
  _id: string;
  name: string;
  brand: string;
  category: string;
  imageUrl: string;
  pricePerDay: number;
  rentalCount: number;
  ratingAvg: number;
  revenueTotal: number;
  status: string;
}

export interface OwnerAnalyticsResponse {
  overview: OwnerOverviewStats;
  revenueChart: OwnerRevenueChartData;
  fleet: FleetDeviceItem[];
}


