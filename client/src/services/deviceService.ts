import { apiClient } from '../config/api';
import { Device, DeviceCategory } from '../types';

// Mock seed devices matching server/src/seeds/seedData.js
export const FALLBACK_DEVICES: Device[] = [
  {
    _id: '64e0a12f9b1c2b001a000001',
    owner: '64e0a12f9b1c2b001a222222',
    title: 'iPhone 15 Pro Max 256GB Natural Titanium',
    brand: 'Apple',
    category: 'smartphone',
    dailyRate: 250000,
    depositValue: 15000000,
    images: [
      'https://images.unsplash.com/photo-1695048133142-1a20484d2569?w=800',
      'https://images.unsplash.com/photo-1695048065057-de12e8ebf036?w=800',
    ],
    specs: {
      Chip: 'Apple A17 Pro 3nm',
      RAM: '8GB',
      Camera: '48MP + 12MP + 12MP (5x Optical Zoom)',
      Display: '6.7 inch Super Retina XDR OLED 120Hz',
      Battery: '4422 mAh, USB-C 3.0',
    },
    description: 'Like-new 99% flagship, chuyên quay phim Apple ProRes Log cho các dự án TVC hoặc travel vlogs.',
    location: {
      type: 'Point',
      coordinates: [105.7826, 21.0285],
      address: 'Trần Thái Tông, Cầu Giấy, Hà Nội',
    },
    status: 'available',
    rating: 4.9,
    reviewCount: 15,
    viewsCount: 24,
    aiAnalysis: {
      summary: 'iPhone 15 Pro Max là flagship đỉnh cao cho nhà sáng tạo nội dung với khả năng quay Apple Log chuẩn điện ảnh.',
      pros: ['Chất lượng quay video chuẩn điện ảnh', 'Khung viền titan siêu nhẹ', 'Camera zoom quang 5x sắc nét'],
      cons: ['Mặt lưng kính dễ bám vân', 'Nhiệt độ ấm lên khi quay 4K60 Log liên tục'],
      rentalRecommendation: 'Thích hợp thuê 2-3 ngày để quay MV, sự kiện hoặc vlog du lịch.',
    },
  },
  {
    _id: '64e0a12f9b1c2b001a000002',
    owner: '64e0a12f9b1c2b001a222222',
    title: 'Samsung Galaxy S24 Ultra 512GB Titanium Gray',
    brand: 'Samsung',
    category: 'smartphone',
    dailyRate: 240000,
    depositValue: 14000000,
    images: [
      'https://images.unsplash.com/photo-1610945415295-d9bbf067e59c?w=800',
    ],
    specs: {
      Chip: 'Snapdragon 8 Gen 3 for Galaxy',
      RAM: '12GB',
      Camera: '200MP + 50MP + 12MP + 10MP',
      Display: '6.8 inch Dynamic AMOLED 2X 2600 nits',
    },
    description: 'Bộ công cụ Galaxy AI toàn diện với màn hình phẳng chống chói xuất sắc cho tác nghiệp ngoài trời nắng gắt.',
    location: {
      type: 'Point',
      coordinates: [105.8275, 21.0183],
      address: 'Chùa Bộc, Đống Đa, Hà Nội',
    },
    status: 'available',
    rating: 4.8,
    reviewCount: 9,
    viewsCount: 16,
  },
  {
    _id: '64e0a12f9b1c2b001a000003',
    owner: '64e0a12f9b1c2b001a222222',
    title: 'Sony Alpha A7 IV Mirrorless + Lens 24-70mm GM II',
    brand: 'Sony',
    category: 'camera',
    dailyRate: 450000,
    depositValue: 25000000,
    images: [
      'https://images.unsplash.com/photo-1516035069371-29a1b244cc32?w=800',
    ],
    specs: {
      Sensor: '33MP Full-Frame Exmor R BSI CMOS',
      Video: '4K60p 10-bit 4:2:2, S-Cinetone, S-Log3',
      Lens: 'Sony FE 24-70mm f/2.8 GM II',
    },
    description: 'Bộ combo máy ảnh quay chụp thương mại số 1 hiện nay cho sự kiện cưới, TVC quảng cáo và chụp kỷ yếu.',
    location: {
      type: 'Point',
      coordinates: [105.7826, 21.0285],
      address: 'Duy Tân, Cầu Giấy, Hà Nội',
    },
    status: 'available',
    rating: 5.0,
    reviewCount: 32,
    viewsCount: 45,
  },
  {
    _id: '64e0a12f9b1c2b001a000004',
    owner: '64e0a12f9b1c2b001a222222',
    title: 'MacBook Pro 16 inch M3 Max (36GB RAM / 1TB SSD)',
    brand: 'Apple',
    category: 'laptop',
    dailyRate: 380000,
    depositValue: 28000000,
    images: [
      'https://images.unsplash.com/photo-1517336714731-489689fd1ca8?w=800',
    ],
    specs: {
      Chip: 'Apple M3 Max 14-core CPU, 30-core GPU',
      RAM: '36GB Unified Memory',
      Storage: '1TB Superfast NVMe SSD',
      Screen: '16.2 inch Liquid Retina XDR 120Hz Promotion',
    },
    description: 'Trạm làm việc di động hạng nặng phục vụ dựng phim 8K Premiere/DaVinci Resolve và render 3D Blender.',
    location: {
      type: 'Point',
      coordinates: [105.8019, 21.0125],
      address: 'Nguyễn Trãi, Thanh Xuân, Hà Nội',
    },
    status: 'available',
    rating: 4.9,
    reviewCount: 18,
    viewsCount: 30,
  },
  {
    _id: '64e0a12f9b1c2b001a000005',
    owner: '64e0a12f9b1c2b001a222222',
    title: 'DJI Mavic 3 Pro Cine Fly More Combo (3 Pin)',
    brand: 'DJI',
    category: 'drone',
    dailyRate: 550000,
    depositValue: 32000000,
    images: [
      'https://images.unsplash.com/photo-1508614589041-895b88991e3e?w=800',
    ],
    specs: {
      Camera: 'Hasselblad 4/3 CMOS 20MP + 70mm + 166mm Tele',
      Video: 'Apple ProRes 422 HQ, 5.1K/50fps, 4K/120fps D-Log',
      FlightTime: '43 phút / pin (kèm 3 pin thông minh)',
    },
    description: 'Hệ 3 camera quang học quay trên không đạt chuẩn điện ảnh Hollywood, bao gồm remote điều khiển RC Pro tích hợp màn hình siêu sáng.',
    location: {
      type: 'Point',
      coordinates: [105.8542, 21.0285],
      address: 'Tràng Tiền, Hoàn Kiếm, Hà Nội',
    },
    status: 'available',
    rating: 5.0,
    reviewCount: 22,
    viewsCount: 38,
  },
  {
    _id: '64e0a12f9b1c2b001a000006',
    owner: '64e0a12f9b1c2b001a222222',
    title: 'Tai nghe Sony WH-1000XM5 Chống Ồn Cao Cấp',
    brand: 'Sony',
    category: 'audio',
    dailyRate: 110000,
    depositValue: 5000000,
    images: [
      'https://images.unsplash.com/photo-1546435770-a3e426bf472b?w=800',
    ],
    specs: {
      ANC: 'Dual Processor V1 + QN1 8 micro khử ồn chủ động',
      Battery: '30 giờ nghe liên tục, sạc nhanh 3 phút được 3 giờ',
      Codec: 'LDAC, Hi-Res Audio Wireless, DSEE Extreme',
    },
    description: 'Tai nghe chụp tai chống ồn hàng đầu thế giới, hoàn hảo cho chuyến bay dài, cách ly tiếng ồn văn phòng hoặc mixing audio cơ bản.',
    location: {
      type: 'Point',
      coordinates: [105.8194, 21.0333],
      address: 'Kim Mã, Ba Đình, Hà Nội',
    },
    status: 'available',
    rating: 4.8,
    reviewCount: 14,
    viewsCount: 20,
  },
  {
    _id: '64e0a12f9b1c2b001a000007',
    owner: '64e0a12f9b1c2b001a222222',
    title: 'Gimbal DJI RS 3 Pro Combo (Follow Focus)',
    brand: 'DJI',
    category: 'accessory',
    dailyRate: 180000,
    depositValue: 8000000,
    images: [
      'https://images.unsplash.com/photo-1589256469067-ea99122bbdc4?w=800',
    ],
    specs: {
      Payload: '4.5kg tải trọng tay đòn bằng sợi carbon',
      Feature: 'Khóa trục tự động thế hệ mới, màn hình OLED cảm ứng 1.8 inch',
    },
    description: 'Gimbal chống rung máy quay phim tải trọng lớn, đi kèm motor lấy nét Focus Motor và bộ truyền hình ảnh không dây RavenEye.',
    location: {
      type: 'Point',
      coordinates: [105.7826, 21.0285],
      address: 'Trần Thái Tông, Cầu Giấy, Hà Nội',
    },
    status: 'available',
    rating: 4.9,
    reviewCount: 11,
    viewsCount: 19,
  },
  {
    _id: '64e0a12f9b1c2b001a000008',
    owner: '64e0a12f9b1c2b001a222222',
    title: 'Laptop Dell XPS 15 9530 Core i9 RTX 4070 OLED',
    brand: 'Dell',
    category: 'laptop',
    dailyRate: 350000,
    depositValue: 24000000,
    images: [
      'https://images.unsplash.com/photo-1593642632823-8f785ba67e45?w=800',
    ],
    specs: {
      CPU: 'Intel Core i9-13900H 14 Cores 20 Threads',
      GPU: 'NVIDIA GeForce RTX 4070 8GB GDDR6',
      RAM: '32GB DDR5 4800MHz',
      Screen: '15.6 inch 3.5K OLED Touch 400 nits',
    },
    description: 'Dòng máy trạm di động Windows mạnh mẽ bậc nhất, màn hình OLED 100% DCI-P3 hiệu chuẩn màu xuất sắc cho đồ họa chuyên nghiệp.',
    location: {
      type: 'Point',
      coordinates: [105.8019, 21.0125],
      address: 'Lê Văn Lương, Cầu Giấy, Hà Nội',
    },
    status: 'available',
    rating: 4.7,
    reviewCount: 8,
    viewsCount: 15,
  },
];

export interface GetDevicesParams {
  category?: DeviceCategory | 'all';
  search?: string;
}

export const deviceService = {
  /**
   * Gọi API GET /api/devices, tự động chuyển đổi sang danh sách chuẩn Device[]
   * Nếu backend chưa có endpoint hoặc server chưa chạy, trả về danh sách fallback chuẩn
   */
  async getDevices(params?: GetDevicesParams): Promise<Device[]> {
    try {
      const response = await apiClient.get('/devices', {
        params: {
          category: params?.category && params.category !== 'all' ? params.category : undefined,
          q: params?.search || undefined,
        },
      });

      if (response.data && Array.isArray(response.data.data)) {
        console.log('✅ [deviceService] Gọi API Backend thành công! Số lượng devices:', response.data.data.length);
        return response.data.data;
      }
      if (Array.isArray(response.data)) {
        return response.data;
      }
    } catch (error: any) {
      console.log('❌ [deviceService DEBUG] Request URL:', error?.config?.baseURL ? `${error.config.baseURL}${error.config.url}` : error?.config?.url);
      console.log('❌ [deviceService DEBUG] Error message:', error?.message);
      console.log('❌ [deviceService DEBUG] Axios code:', error?.code);
      console.log('❌ [deviceService DEBUG] HTTP status:', error?.response?.status);
      console.log('❌ [deviceService DEBUG] Response data:', error?.response?.data);
      console.log('ℹ️ [deviceService] Sử dụng dữ liệu fallback do API backend chưa sẵn sàng.');
    }

    // Áp dụng bộ lọc local trên dữ liệu fallback
    let result = [...FALLBACK_DEVICES];

    if (params?.category && params.category !== 'all') {
      result = result.filter(d => d.category === params.category);
    }

    if (params?.search && params.search.trim()) {
      const query = params.search.toLowerCase().trim();
      result = result.filter(
        d =>
          d.title.toLowerCase().includes(query) ||
          d.brand.toLowerCase().includes(query) ||
          d.description.toLowerCase().includes(query)
      );
    }

    return result;
  },

  /**
   * Lấy chi tiết thiết bị theo ID
   */
  async getDeviceById(id: string): Promise<Device | null> {
    try {
      const response = await apiClient.get(`/devices/${id}`);
      if (response.data && response.data.data) {
        return response.data.data;
      }
      if (response.data) {
        return response.data;
      }
    } catch {
      // Fallback
    }
    const found = FALLBACK_DEVICES.find(d => d._id === id);
    return found || null;
  },
};
