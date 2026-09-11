import 'dotenv/config';
import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';
import { connectDB } from '../config/db.js';
import { User, Device, Booking, Review, Notification } from '../models/index.js';

const seedDatabase = async () => {
  try {
    console.log('🌱 [TechShare Seed] Đang kết nối tới MongoDB Atlas...');
    await connectDB();
    console.log('✅ [TechShare Seed] Kết nối thành công! Đang làm sạch dữ liệu cũ...');

    // 1. Xoá dữ liệu cũ
    await Promise.all([
      User.deleteMany({}),
      Device.deleteMany({}),
      Booking.deleteMany({}),
      Review.deleteMany({}),
      Notification.deleteMany({}),
    ]);
    console.log('🧹 [TechShare Seed] Đã làm sạch toàn bộ collections cũ.');

    // 2. Tạo ID cố định cho quan hệ nhất quán
    const userAdminId = new mongoose.Types.ObjectId('64e0a12f9b1c2b001a111111');
    const userOwnerId = new mongoose.Types.ObjectId('64e0a12f9b1c2b001a222222');
    const userRenterId = new mongoose.Types.ObjectId('64e0a12f9b1c2b001a333333');

    const deviceIds = [
      new mongoose.Types.ObjectId('64e0a12f9b1c2b001a000001'),
      new mongoose.Types.ObjectId('64e0a12f9b1c2b001a000002'),
      new mongoose.Types.ObjectId('64e0a12f9b1c2b001a000003'),
      new mongoose.Types.ObjectId('64e0a12f9b1c2b001a000004'),
      new mongoose.Types.ObjectId('64e0a12f9b1c2b001a000005'),
      new mongoose.Types.ObjectId('64e0a12f9b1c2b001a000006'),
      new mongoose.Types.ObjectId('64e0a12f9b1c2b001a000007'),
      new mongoose.Types.ObjectId('64e0a12f9b1c2b001a000008'),
      new mongoose.Types.ObjectId('64e0a12f9b1c2b001a000009'),
      new mongoose.Types.ObjectId('64e0a12f9b1c2b001a000010'),
    ];

    // 3. Nạp Users
    const salt = await bcrypt.genSalt(10);
    const defaultHashedPassword = await bcrypt.hash('TechShare2026@', salt);

    const usersData = [
      {
        _id: userAdminId,
        name: 'Quản Trị Viên TechShare',
        email: 'admin@techshare.vn',
        password: defaultHashedPassword,
        phone: '0901234567',
        role: 'admin',
        avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=400',
        address: { fullAddress: 'Hoàn Kiếm, Hà Nội', city: 'Hà Nội' },
        location: { type: 'Point', coordinates: [105.8542, 21.0285] },
        rating: 5.0,
        isVerified: true,
      },
      {
        _id: userOwnerId,
        name: 'Minh Tuấn Tech Review',
        email: 'minhtuan@techshare.vn',
        password: defaultHashedPassword,
        phone: '0912345678',
        role: 'owner',
        avatar: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=400',
        address: { fullAddress: 'Cầu Giấy, Hà Nội', city: 'Hà Nội' },
        location: { type: 'Point', coordinates: [105.7826, 21.0285] },
        rating: 4.9,
        totalReviews: 28,
        isVerified: true,
      },
      {
        _id: userRenterId,
        name: 'Hoàng Nam Creator',
        email: 'hoangnam@techshare.vn',
        password: defaultHashedPassword,
        phone: '0987654321',
        role: 'renter',
        avatar: 'https://images.unsplash.com/photo-1570295999919-56ceb5ecca61?w=400',
        address: { fullAddress: 'Đống Đa, Hà Nội', city: 'Hà Nội' },
        location: { type: 'Point', coordinates: [105.8275, 21.0183] },
        rating: 5.0,
        totalReviews: 12,
        isVerified: true,
      },
    ];

    await User.insertMany(usersData);
    console.log('👤 [TechShare Seed] Đã nạp 3 Users (Admin, Owner, Renter).');

    // 4. Nạp 10 Thiết bị công nghệ đa dạng
    const devicesData = [
      {
        _id: deviceIds[0],
        owner: userOwnerId,
        title: 'iPhone 15 Pro Max 256GB Titan Tự Nhiên',
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
          Camera: '48MP + 12MP + 12MP (Zoom quang 5x)',
          Màn_hình: '6.7 inch Super Retina XDR OLED 120Hz',
          Pin: '4422 mAh, Cổng Type-C 3.0 tốc độ cao',
        },
        description: 'Máy như mới 99%, chuyên dụng quay phim ProRes Log cho các dự án TVC hoặc vlog du lịch ngắn ngày.',
        location: {
          type: 'Point',
          coordinates: [105.7826, 21.0285],
          address: 'Trần Thái Tông, Cầu Giấy, Hà Nội',
        },
        status: 'available',
        rating: 4.9,
        reviewCount: 15,
        aiAnalysis: {
          summary: 'iPhone 15 Pro Max là flagship toàn diện nhất cho nhu cầu sáng tạo nội dung di động với khả năng ghi hình Apple Log chuyên nghiệp.',
          pros: ['Chất lượng quay video vượt trội', 'Khung viền titan nhẹ nhàng', 'Camera tele 5x sắc nét'],
          cons: ['Mặt kính lưng nhạy cảm va đập', 'Máy có thể ấm khi quay 4K60 Log liên tục'],
          rentalRecommendation: 'Rất thích hợp thuê 2-3 ngày để quay vlog sự kiện, du lịch hoặc làm máy phụ quay phim.',
        },
      },
      {
        _id: deviceIds[1],
        owner: userOwnerId,
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
          Camera: '200MP + 50MP (5x) + 12MP + 10MP (3x)',
          Màn_hình: '6.8 inch Dynamic AMOLED 2X phẳng 2600 nits',
          Bút_S_Pen: 'Tích hợp sẵn trong thân máy',
        },
        description: 'Galaxy AI toàn diện, màn hình chống chói cực tốt khi quay chụp ngoài trời nắng.',
        location: {
          type: 'Point',
          coordinates: [105.8275, 21.0183],
          address: 'Xã Đàn, Đống Đa, Hà Nội',
        },
        status: 'available',
        rating: 4.8,
        reviewCount: 9,
      },
      {
        _id: deviceIds[2],
        owner: userOwnerId,
        title: 'Sony Alpha A7 Mark IV + Lens 24-70mm F2.8 GM II',
        brand: 'Sony',
        category: 'camera',
        dailyRate: 450000,
        depositValue: 25000000,
        images: [
          'https://images.unsplash.com/photo-1516035069371-29a1b244cc32?w=800',
          'https://images.unsplash.com/photo-1502920917128-1aa500764cbd?w=800',
        ],
        specs: {
          Cảm_biến: '33MP Full-frame Exmor R BSI CMOS',
          Quay_video: '4K 60p 10-bit 4:2:2 All-Intra',
          Lấy_nét: '759 điểm AF pha thời gian thực',
          Ống_kính: 'Sony FE 24-70mm f/2.8 GM II đa dụng đỉnh cao',
        },
        description: 'Combo máy ảnh quay chụp thương mại số 1 hiện nay. Đầy đủ thẻ nhớ v90 128GB và 2 pin chính hãng.',
        location: {
          type: 'Point',
          coordinates: [105.8542, 21.0285],
          address: 'Tràng Tiền, Hoàn Kiếm, Hà Nội',
        },
        status: 'available',
        rating: 5.0,
        reviewCount: 22,
        aiAnalysis: {
          summary: 'Chiếc máy ảnh lai (hybrid) tốt nhất phân khúc bán chuyên cho cả nhiếp ảnh gia và nhà làm phim.',
          pros: ['Màu sắc S-Cinetone tuyệt đẹp', 'Lấy nét mắt người và động vật siêu nhanh', 'Dàn ống kính GM II siêu sắc nét'],
          cons: ['Quay 4K60p bị crop 1.5x Super35'],
          rentalRecommendation: 'Lựa chọn số 1 để thuê chụp ảnh cưới, sự kiện công ty hoặc làm TVC thương mại.',
        },
      },
      {
        _id: deviceIds[3],
        owner: userOwnerId,
        title: 'Fujifilm X-T5 Silver + Lens XF 33mm F1.4 R LM WR',
        brand: 'Fujifilm',
        category: 'camera',
        dailyRate: 320000,
        depositValue: 18000000,
        images: [
          'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=800',
        ],
        specs: {
          Cảm_biến: '40.2MP APS-C X-Trans CMOS 5 HR BSI',
          Film_Simulation: '19 chế độ giả lập màu phim kinh điển Fujifilm',
          Chống_rung: 'IBIS 5 trục trong thân máy lên đến 7 stops',
        },
        description: 'Màu ảnh chụp chân dung và đường phố không cần hậu kỳ, kiểu dáng cổ điển cực đẹp.',
        location: {
          type: 'Point',
          coordinates: [105.8194, 21.0543],
          address: 'Xuân Diệu, Tây Hồ, Hà Nội',
        },
        status: 'available',
        rating: 4.9,
        reviewCount: 14,
      },
      {
        _id: deviceIds[4],
        owner: userOwnerId,
        title: 'MacBook Pro 16 inch M3 Max (36GB RAM / 1TB SSD)',
        brand: 'Apple',
        category: 'laptop',
        dailyRate: 500000,
        depositValue: 30000000,
        images: [
          'https://images.unsplash.com/photo-1517336714731-489689fd1ca8?w=800',
        ],
        specs: {
          Vi_xử_lý: 'Apple M3 Max (14-core CPU, 30-core GPU)',
          RAM: '36GB Unified Memory',
          Ổ_cứng: '1TB SSD siêu nhanh 7400MB/s',
          Màn_hình: '16.2 inch Liquid Retina XDR 120Hz ProMotion',
        },
        description: 'Trạm làm việc di động mạnh nhất cho dựng phim 8K DaVinci Resolve, Premiere Pro và render 3D.',
        location: {
          type: 'Point',
          coordinates: [105.7826, 21.0285],
          address: 'Duy Tân, Cầu Giấy, Hà Nội',
        },
        status: 'available',
        rating: 5.0,
        reviewCount: 18,
      },
      {
        _id: deviceIds[5],
        owner: userOwnerId,
        title: 'Dell XPS 15 9530 Core i9-13900H RTX 4070 OLED 3.5K',
        brand: 'Dell',
        category: 'laptop',
        dailyRate: 420000,
        depositValue: 26000000,
        images: [
          'https://images.unsplash.com/photo-1588872657578-7efd1f1555ed?w=800',
        ],
        specs: {
          CPU: 'Intel Core i9-13900H 14 cores 20 threads',
          Card_đồ_hoạ: 'NVIDIA GeForce RTX 4070 8GB GDDR6',
          Màn_hình: '15.6 inch OLED 3.5K cảm ứng 100% DCI-P3',
          RAM_SSD: '32GB DDR5 / 1TB NVMe PCIe 4.0',
        },
        description: 'Máy trạm đồ hoạ mỏng nhẹ chuẩn doanh nhân, màu sắc màn hình chuẩn xác cho thiết kế in ấn.',
        location: {
          type: 'Point',
          coordinates: [105.8078, 20.9991],
          address: 'Nguyễn Trãi, Thanh Xuân, Hà Nội',
        },
        status: 'available',
        rating: 4.7,
        reviewCount: 8,
      },
      {
        _id: deviceIds[6],
        owner: userOwnerId,
        title: 'Flycam DJI Mini 4 Pro Fly More Combo Plus',
        brand: 'DJI',
        category: 'drone',
        dailyRate: 350000,
        depositValue: 12000000,
        images: [
          'https://images.unsplash.com/photo-1527977966376-1c8408f9f108?w=800',
        ],
        specs: {
          Trọng_lượng: 'Dưới 249g (Không cần xin phép bay phức tạp)',
          Camera: '48MP 1/1.3 inch CMOS, Quay 4K100fps, D-Log M',
          Khả_năng: 'Quay khung hình dọc True Vertical Shooting',
          Pin: '3 pin Plus cho thời gian bay tối đa 45 phút/pin',
        },
        description: 'Cảm biến va chạm đa hướng 360 độ an toàn tuyệt đối. Kèm tay điều khiển DJI RC 2 màn hình sáng.',
        location: {
          type: 'Point',
          coordinates: [105.8342, 21.0333],
          address: 'Kim Mã, Ba Đình, Hà Nội',
        },
        status: 'available',
        rating: 4.9,
        reviewCount: 30,
        aiAnalysis: {
          summary: 'Chiếc flycam nhỏ gọn tốt nhất thị trường với đầy đủ tính năng bay an toàn và màu 10-bit D-Log M.',
          pros: ['Siêu nhẹ dưới 249g', 'Cảm biến tránh vật cản đa hướng', 'Quay dọc trực tiếp đăng TikTok/Reels'],
          cons: ['Dễ bị ảnh hưởng khi gặp gió giật cấp 6 trở lên'],
          rentalRecommendation: 'Rất khuyên dùng để mang đi du lịch hoặc quay khảo sát bất động sản.',
        },
      },
      {
        _id: deviceIds[7],
        owner: userOwnerId,
        title: 'Flycam DJI Mavic 3 Pro Cine Combo SSD 1TB',
        brand: 'DJI',
        category: 'drone',
        dailyRate: 850000,
        depositValue: 45000000,
        images: [
          'https://images.unsplash.com/photo-1508614589041-895b88991e3e?w=800',
        ],
        specs: {
          Hệ_thống_camera: '3 camera Hasselblad 4/3 CMOS + 70mm + 166mm',
          Codec_video: 'Apple ProRes 422 HQ / 422 / 422 LT',
          Truyền_sóng: 'DJI O3+ phạm vi truyền xa tới 15km',
        },
        description: 'Dành riêng cho đoàn làm phim chuyên nghiệp và quảng cáo điện ảnh cao cấp.',
        location: {
          type: 'Point',
          coordinates: [105.8824, 21.0416],
          address: 'Nguyễn Văn Cừ, Long Biên, Hà Nội',
        },
        status: 'available',
        rating: 5.0,
        reviewCount: 11,
      },
      {
        _id: deviceIds[8],
        owner: userOwnerId,
        title: 'Tai nghe Sony WH-1000XM5 Chống ồn Không dây',
        brand: 'Sony',
        category: 'audio',
        dailyRate: 90000,
        depositValue: 4000000,
        images: [
          'https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=800',
        ],
        specs: {
          Chống_ồn: '2 bộ xử lý chuyên dụng và 8 micro triệt tiêu tiếng ồn',
          Thời_lượng_pin: '30 giờ nghe nhạc liên tục',
          Codec_âm_thanh: 'Hi-Res Audio Wireless với chuẩn LDAC',
        },
        description: 'Chống ồn đỉnh cao thích hợp cho chuyến bay dài hoặc làm việc tập trung trong không gian ồn ào.',
        location: {
          type: 'Point',
          coordinates: [105.8491, 21.0083],
          address: 'Bà Triệu, Hai Bà Trưng, Hà Nội',
        },
        status: 'available',
        rating: 4.8,
        reviewCount: 19,
      },
      {
        _id: deviceIds[9],
        owner: userOwnerId,
        title: 'Tay cầm chống rung Gimbal DJI RS 3 Pro Combo',
        brand: 'DJI',
        category: 'accessory',
        dailyRate: 200000,
        depositValue: 9000000,
        images: [
          'https://images.unsplash.com/photo-1542744095-fcf48d80b0fd?w=800',
        ],
        specs: {
          Tải_trọng: '4.5 kg (Cân thoải mái máy ảnh kèm ống kính tele)',
          Cánh_tay_trục: 'Sợi carbon mở rộng thế hệ mới',
          Khoá_trục: 'Khoá trục tự động thông minh khi bật/tắt nguồn',
        },
        description: 'Gimbal chống rung chuyên nghiệp cho máy quay điện ảnh, hoạt động mượt mà êm ái.',
        location: {
          type: 'Point',
          coordinates: [105.7826, 21.0285],
          address: 'Cầu Giấy, Hà Nội',
        },
        status: 'available',
        rating: 4.9,
        reviewCount: 25,
      },
    ];

    await Device.insertMany(devicesData);
    console.log('📱 [TechShare Seed] Đã nạp 10 Thiết bị công nghệ phong phú.');

    // 5. Nạp Đơn thuê mẫu (Bookings)
    const bookingCompletedId = new mongoose.Types.ObjectId('64e0a12f9b1c2b001a444441');
    const bookingActiveId = new mongoose.Types.ObjectId('64e0a12f9b1c2b001a444442');

    const bookingsData = [
      {
        _id: bookingCompletedId,
        bookingCode: 'TS-20260901',
        device: deviceIds[2], // Sony A7 IV
        renter: userRenterId,
        owner: userOwnerId,
        startDate: new Date('2026-09-01T08:00:00.000Z'),
        endDate: new Date('2026-09-03T20:00:00.000Z'),
        totalDays: 3,
        dailyRate: 450000,
        rentalFee: 1350000,
        depositValue: 25000000,
        totalAmount: 26350000,
        status: 'completed',
        paymentStatus: 'paid',
        deliveryAddress: {
          recipientName: 'Hoàng Nam',
          phone: '0987654321',
          address: 'Số 12 Chùa Bộc, Đống Đa, Hà Nội',
        },
        note: 'Thuê máy chụp ảnh kỷ yếu lớp đại học',
        timeline: [
          { status: 'pending', note: 'Gửi yêu cầu thuê' },
          { status: 'approved', note: 'Chủ máy đã đồng ý' },
          { status: 'active', note: 'Đã nhận máy và bắt đầu sử dụng' },
          { status: 'completed', note: 'Đã hoàn trả máy nguyên vẹn, nhận lại tiền cọc' },
        ],
      },
      {
        _id: bookingActiveId,
        bookingCode: 'TS-20260910',
        device: deviceIds[0], // iPhone 15 Pro Max
        renter: userRenterId,
        owner: userOwnerId,
        startDate: new Date('2026-09-10T08:00:00.000Z'),
        endDate: new Date('2026-09-12T20:00:00.000Z'),
        totalDays: 2,
        dailyRate: 250000,
        rentalFee: 500000,
        depositValue: 15000000,
        totalAmount: 15500000,
        status: 'active',
        paymentStatus: 'deposit_held',
        deliveryAddress: {
          recipientName: 'Hoàng Nam',
          phone: '0987654321',
          address: 'Số 12 Chùa Bộc, Đống Đa, Hà Nội',
        },
        note: 'Thuê quay vlog đánh giá công nghệ',
        timeline: [
          { status: 'pending', note: 'Khởi tạo đơn thuê' },
          { status: 'approved', note: 'Được phê duyệt' },
          { status: 'active', note: 'Đang trong quá trình thuê' },
        ],
      },
    ];

    await Booking.insertMany(bookingsData);
    console.log('📝 [TechShare Seed] Đã nạp 2 Đơn thuê mẫu (1 completed, 1 active).');

    // 6. Nạp Đánh giá (Reviews)
    const reviewsData = [
      {
        _id: new mongoose.Types.ObjectId('64e0a12f9b1c2b001a555551'),
        booking: bookingCompletedId,
        device: deviceIds[2],
        reviewer: userRenterId,
        targetUser: userOwnerId,
        rating: 5,
        comment: 'Máy ảnh Sony A7 IV hoạt động hoàn hảo, cảm biến sạch sẽ, ống kính 24-70 GM II nét căng. Anh Minh Tuấn hướng dẫn bàn giao rất nhiệt tình và uy tín!',
        images: ['https://images.unsplash.com/photo-1516035069371-29a1b244cc32?w=800'],
      },
    ];

    await Review.insertMany(reviewsData);
    console.log('⭐ [TechShare Seed] Đã nạp 1 Đánh giá kèm hình ảnh mẫu.');

    // 7. Nạp Thông báo mẫu (Notifications)
    const notificationsData = [
      {
        _id: new mongoose.Types.ObjectId('64e0a12f9b1c2b001a666661'),
        recipient: userRenterId,
        title: 'Đơn thuê đã được duyệt thành công 🎉',
        body: 'Chủ máy Minh Tuấn đã phê duyệt đơn thuê thiết bị iPhone 15 Pro Max của bạn.',
        type: 'booking_approved',
        data: {
          bookingId: bookingActiveId,
          deviceId: deviceIds[0],
        },
        isRead: false,
      },
      {
        _id: new mongoose.Types.ObjectId('64e0a12f9b1c2b001a666662'),
        recipient: userOwnerId,
        title: 'Đánh giá 5 sao mới từ Hoàng Nam ⭐',
        body: 'Hoàng Nam vừa gửi đánh giá 5 sao cho chiếc máy ảnh Sony A7 IV của bạn.',
        type: 'system',
        data: {
          bookingId: bookingCompletedId,
          deviceId: deviceIds[2],
        },
        isRead: true,
      },
    ];

    await Notification.insertMany(notificationsData);
    console.log('🔔 [TechShare Seed] Đã nạp 2 Thông báo mẫu.');

    console.log('\n==================================================');
    console.log('🎉 [TechShare Seed] NẠP DỮ LIỆU SEED MONGODB THÀNH CÔNG 100%!');
    console.log('==================================================');
    process.exit(0);
  } catch (error) {
    console.error('❌ [TechShare Seed] Lỗi trong quá trình nạp dữ liệu:', error.message);
    process.exit(1);
  }
};

seedDatabase();
