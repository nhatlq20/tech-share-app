export type Period = 'week' | 'month';

export type RevenueData = {
  label: string;
  revenue: number;
};

export type RentalPayment = {
  id: string;
  deviceName: string;
  renterName: string;
  amount: number;
  date: string;
  status: 'completed';
};

export type DeviceStatistics = {
  totalDevices: number;
  rentedDevices: number;
  availableDevices: number;
};

export type OwnerAnalytics = {
  totalRevenue: number;
  revenueChange: number;
  utilizationRate: number;
  totalDevices: number;
  rentedDevices: number;
  availableDevices: number;
  weeklyRevenue: RevenueData[];
  monthlyRevenue: RevenueData[];
  rentalPayments: RentalPayment[];
};

export const weeklyRevenue: RevenueData[] = [
  { label: 'Mon', revenue: 1200000 },
  { label: 'Tue', revenue: 1800000 },
  { label: 'Wed', revenue: 900000 },
  { label: 'Thu', revenue: 2200000 },
  { label: 'Fri', revenue: 1700000 },
  { label: 'Sat', revenue: 2500000 },
  { label: 'Sun', revenue: 2200000 },
];

export const monthlyRevenue: RevenueData[] = [
  { label: 'Week 1', revenue: 7200000 },
  { label: 'Week 2', revenue: 8900000 },
  { label: 'Week 3', revenue: 10400000 },
  { label: 'Week 4', revenue: 12500000 },
];

export const rentalPayments: RentalPayment[] = [
  {
    id: '1',
    deviceName: 'iPhone 15 Pro Max',
    renterName: 'Nguyen Van A',
    amount: 750000,
    date: '30/09/2026',
    status: 'completed',
  },
  {
    id: '2',
    deviceName: 'MacBook Pro M3',
    renterName: 'Tran Van B',
    amount: 1200000,
    date: '29/09/2026',
    status: 'completed',
  },
  {
    id: '3',
    deviceName: 'Sony A7 IV',
    renterName: 'Le Van C',
    amount: 900000,
    date: '28/09/2026',
    status: 'completed',
  },
];

export const deviceStatistics: DeviceStatistics = {
  totalDevices: 25,
  rentedDevices: 18,
  availableDevices: 7,
};

export const ownerAnalyticsMock: OwnerAnalytics = {
  totalRevenue: 12500000,
  revenueChange: 18.5,
  utilizationRate: 72,
  ...deviceStatistics,
  weeklyRevenue,
  monthlyRevenue,
  rentalPayments,
};
