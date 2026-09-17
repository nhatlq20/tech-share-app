import 'dotenv/config';
import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';
import { connectDB } from '../config/db.js';
import {
  Role,
  Account,
  User,
  Device,
  Booking,
  Review,
  Message,
  Notification,
  WalletTransaction,
  Voucher,
  Dispute,
  EkycRequest,
  AiCache,
} from '../models/index.js';

const seedDatabase = async () => {
  try {
    console.log('🌱 [TechShare Seed] Connecting to MongoDB Atlas...');
    await connectDB();
    console.log('✅ [TechShare Seed] Connected successfully. Existing collections will be preserved.');

    // 2. Fixed IDs for consistent cross-collection relations
    const roleAdminId = new mongoose.Types.ObjectId('64e0a12f9b1c2b001a888881');
    const roleOwnerId = new mongoose.Types.ObjectId('64e0a12f9b1c2b001a888882');
    const roleRenterId = new mongoose.Types.ObjectId('64e0a12f9b1c2b001a888883');

    // Admin IDs
    const accountAdminId = new mongoose.Types.ObjectId('64e0a12f9b1c2b001a777771');
    const userAdminId = new mongoose.Types.ObjectId('64e0a12f9b1c2b001a111111');

    // Owner IDs (owner1 - owner5)
    const ownerAccountIds = [
      new mongoose.Types.ObjectId('64e0a12f9b1c2b001a777772'),
      new mongoose.Types.ObjectId('64e0a12f9b1c2b001a777002'),
      new mongoose.Types.ObjectId('64e0a12f9b1c2b001a777003'),
      new mongoose.Types.ObjectId('64e0a12f9b1c2b001a777004'),
      new mongoose.Types.ObjectId('64e0a12f9b1c2b001a777005'),
    ];
    const userOwnerId = new mongoose.Types.ObjectId('64e0a12f9b1c2b001a222222');
    const ownerUserIds = [
      userOwnerId,
      new mongoose.Types.ObjectId('64e0a12f9b1c2b001a222002'),
      new mongoose.Types.ObjectId('64e0a12f9b1c2b001a222003'),
      new mongoose.Types.ObjectId('64e0a12f9b1c2b001a222004'),
      new mongoose.Types.ObjectId('64e0a12f9b1c2b001a222005'),
    ];

    // Renter IDs (renter1 - renter5)
    const renterAccountIds = [
      new mongoose.Types.ObjectId('64e0a12f9b1c2b001a777773'),
      new mongoose.Types.ObjectId('64e0a12f9b1c2b001a777102'),
      new mongoose.Types.ObjectId('64e0a12f9b1c2b001a777103'),
      new mongoose.Types.ObjectId('64e0a12f9b1c2b001a777104'),
      new mongoose.Types.ObjectId('64e0a12f9b1c2b001a777105'),
    ];
    const userRenterId = new mongoose.Types.ObjectId('64e0a12f9b1c2b001a333333');
    const renterUserIds = [
      userRenterId,
      new mongoose.Types.ObjectId('64e0a12f9b1c2b001a333002'),
      new mongoose.Types.ObjectId('64e0a12f9b1c2b001a333003'),
      new mongoose.Types.ObjectId('64e0a12f9b1c2b001a333004'),
      new mongoose.Types.ObjectId('64e0a12f9b1c2b001a333005'),
    ];

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

    const bookingCompletedId = new mongoose.Types.ObjectId('64e0a12f9b1c2b001a444441');
    const bookingActiveId = new mongoose.Types.ObjectId('64e0a12f9b1c2b001a444442');

    // 3. Seed Roles
    const rolesData = [
      {
        _id: roleAdminId,
        code: 'admin',
        name: 'Quản trị viên',
        description: 'Toàn quyền quản trị hệ thống, duyệt tranh chấp, quản lý tài khoản và thiết bị',
        permissions: ['admin:*', 'user:*', 'device:*', 'booking:*', 'dispute:*'],
      },
      {
        _id: roleOwnerId,
        code: 'owner',
        name: 'Chủ máy',
        description: 'Đăng tải và cho thuê thiết bị công nghệ, quản lý lịch đặt',
        permissions: ['device:create', 'device:update', 'booking:manage'],
      },
      {
        _id: roleRenterId,
        code: 'renter',
        name: 'Người thuê',
        description: 'Tìm kiếm, đặt thuê thiết bị công nghệ và viết đánh giá',
        permissions: ['device:read', 'booking:create', 'review:create'],
      },
    ];

    await Role.insertMany(rolesData);
    console.log('👑 [TechShare Seed] Seeded 3 Roles (Admin, Owner, Renter).');

    // 4. Seed Accounts
    const salt = await bcrypt.genSalt(10);
    const defaultHashedPassword = await bcrypt.hash('123456', salt);

    const accountsData = [
      // 1. Admin
      {
        _id: accountAdminId,
        username: 'admin',
        email: 'admin@techshare.vn',
        passwordHash: defaultHashedPassword,
        roleId: roleAdminId,
        isActive: true,
      },
      // 2. Owner 1 - 5
      ...ownerAccountIds.map((id, index) => ({
        _id: id,
        username: `owner${index + 1}`,
        email: `owner${index + 1}@techshare.vn`,
        passwordHash: defaultHashedPassword,
        roleId: roleOwnerId,
        isActive: true,
      })),
      // 3. Renter 1 - 5
      ...renterAccountIds.map((id, index) => ({
        _id: id,
        username: `renter${index + 1}`,
        email: `renter${index + 1}@techshare.vn`,
        passwordHash: defaultHashedPassword,
        roleId: roleRenterId,
        isActive: true,
      })),
    ];

    await Account.insertMany(accountsData);
    console.log(`🔐 [TechShare Seed] Seeded ${accountsData.length} Accounts with password '123456' (1 Admin, 5 Owner, 5 Renter).`);

    // Avatars for profiles
    const ownerAvatars = [
      'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=400',
      'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=400',
      'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=400',
      'https://images.unsplash.com/photo-1519085360753-af0119f7cbe7?w=400',
      'https://images.unsplash.com/photo-1522075469751-3a6694fb2f61?w=400',
    ];

    const renterAvatars = [
      'https://images.unsplash.com/photo-1570295999919-56ceb5ecca61?w=400',
      'https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=400',
      'https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=400',
      'https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?w=400',
      'https://images.unsplash.com/photo-1517841905240-472988babdf9?w=400',
    ];

    // 5. Seed Users (Profiles)
    const usersData = [
      // 1. Admin
      {
        _id: userAdminId,
        accountId: accountAdminId,
        username: 'admin',
        name: 'TechShare Administrator',
        phone: '0901234567',
        avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=400',
        address: 'Hoan Kiem, Hanoi, Vietnam',
        location: { type: 'Point', coordinates: [105.8542, 21.0285] },
        rating: 5.0,
        isVerified: true,
        trustScore: 100,
        referralCode: 'ADMINVIP',
        badges: ['Admin', 'Super Moderator'],
        walletBalance: 10000000,
      },

      // 2. Owner 1 - 5
      ...ownerUserIds.map((id, index) => ({
        _id: id,
        accountId: ownerAccountIds[index],
        username: `owner${index + 1}`,
        name: index === 0 ? 'Minh Tuan Tech Review' : `Owner User ${index + 1}`,
        phone: `092200000${index + 1}`,
        avatar: ownerAvatars[index],
        address: index === 0 ? 'Cau Giay, Hanoi, Vietnam' : `Cau Giay Sector ${index + 1}, Hanoi`,
        location: { type: 'Point', coordinates: [105.7826 + index * 0.008, 21.0285 + index * 0.003] },
        rating: 4.9,
        totalReviews: 28 - index * 3,
        isVerified: true,
        trustScore: 100,
        referralCode: `OWNER0${index + 1}`,
        badges: ['Top Owner', 'Verified Creator'],
        walletBalance: 5200000 + index * 300000,
      })),

      // 4. Renter 1 - 5
      ...renterUserIds.map((id, index) => ({
        _id: id,
        accountId: renterAccountIds[index],
        username: `renter${index + 1}`,
        name: index === 0 ? 'Hoang Nam Creator' : `Renter User ${index + 1}`,
        phone: `093300000${index + 1}`,
        avatar: renterAvatars[index],
        address: index === 0 ? 'Dong Da, Hanoi, Vietnam' : `Dong Da Sector ${index + 1}, Hanoi`,
        location: { type: 'Point', coordinates: [105.8275 + index * 0.005, 21.0183 + index * 0.004] },
        rating: 5.0,
        totalReviews: 12 - index,
        isVerified: true,
        trustScore: 100,
        referralCode: `RENTER0${index + 1}`,
        referredBy: userOwnerId,
        badges: ['Top Renter'],
        wishlist: [deviceIds[0], deviceIds[1]],
        walletBalance: 2500000 + index * 200000,
        walletEscrowBalance: index === 0 ? 15000000 : 0,
      })),
    ];

    await User.insertMany(usersData);
    console.log(`👤 [TechShare Seed] Seeded ${usersData.length} Users (1 Admin, 5 Owner, 5 Renter).`);

    // 4. Seed 10 Tech Devices
    const devicesData = [
      {
        _id: deviceIds[0],
        ownerId: userOwnerId,
        name: 'iPhone 15 Pro Max 256GB Natural Titanium',
        brand: 'Apple',
        category: 'smartphone',
        pricePerDay: 250000,
        depositAmount: 15000000,
        images: [
          'https://images.unsplash.com/photo-1695048133142-1a20484d2569?w=800',
          'https://images.unsplash.com/photo-1695048065057-de12e8ebf036?w=800',
        ],
        specs: {
          Chip: 'Apple A17 Pro 3nm',
          RAM: '8GB',
          Camera: '48MP + 12MP + 12MP (5x Optical Zoom)',
          Display: '6.7 inch Super Retina XDR OLED 120Hz',
          Battery: '4422 mAh, USB-C 3.0 high-speed port',
        },
        description: 'Like-new 99% flagship, specialized in recording ProRes Log video for TVC projects or travel vlogs.',
        location: {
          type: 'Point',
          coordinates: [105.7826, 21.0285],
        },
        addressText: 'Tran Thai Tong, Cau Giay, Hanoi',
        status: 'available',
        condition: 'new99',
        ratingAvg: 4.9,
        ratingCount: 15,
        rentalCount: 24,
        aiAnalysis: {
          summary: 'iPhone 15 Pro Max is the ultimate flagship for mobile content creators with professional Apple Log recording.',
          pros: ['Exceptional video recording quality', 'Lightweight titanium frame', 'Sharp 5x telephoto lens'],
          cons: ['Fragile back glass', 'Device warms up under continuous 4K60 Log recording'],
          rentalRecommendation: 'Ideal for 2-3 day rental for event vlogs, travel, or B-cam production.',
        },
      },
      {
        _id: deviceIds[1],
        ownerId: userOwnerId,
        name: 'Samsung Galaxy S24 Ultra 512GB Titanium Gray',
        brand: 'Samsung',
        category: 'smartphone',
        pricePerDay: 240000,
        depositAmount: 14000000,
        images: [
          'https://images.unsplash.com/photo-1610945415295-d9bbf067e59c?w=800',
        ],
        specs: {
          Chip: 'Snapdragon 8 Gen 3 for Galaxy',
          RAM: '12GB',
          Camera: '200MP + 50MP (5x) + 12MP + 10MP (3x)',
          Display: '6.8 inch Dynamic AMOLED 2X Flat 2600 nits',
          S_Pen: 'Integrated into body',
        },
        description: 'Comprehensive Galaxy AI suite with superior anti-reflective screen for bright outdoor shooting.',
        location: {
          type: 'Point',
          coordinates: [105.8275, 21.0183],
        },
        addressText: 'Chua Boc, Dong Da, Hanoi',
        status: 'available',
        condition: 'new99',
        ratingAvg: 4.8,
        ratingCount: 9,
        rentalCount: 16,
      },
      {
        _id: deviceIds[2],
        ownerId: userOwnerId,
        name: 'Sony Alpha A7 IV Mirrorless + Lens 24-70mm GM II',
        brand: 'Sony',
        category: 'camera',
        pricePerDay: 450000,
        depositAmount: 25000000,
        images: [
          'https://images.unsplash.com/photo-1516035069371-29a1b244cc32?w=800',
        ],
        specs: {
          Sensor: '33MP Full-Frame Exmor R BSI CMOS',
          Video: '4K60p 10-bit 4:2:2, S-Cinetone, S-Log3',
          Stabilization: '5-axis SteadyShot 5.5 stops',
          Lens: 'Sony FE 24-70mm f/2.8 GM II flagship zoom',
        },
        description: 'The definitive hybrid camera kit for commercial video, wedding photography, and TVC production.',
        location: {
          type: 'Point',
          coordinates: [105.7826, 21.0285],
        },
        addressText: 'Duy Tan, Cau Giay, Hanoi',
        status: 'available',
        condition: 'new99',
        ratingAvg: 5.0,
        ratingCount: 32,
        rentalCount: 45,
      },
      {
        _id: deviceIds[3],
        ownerId: userOwnerId,
        name: 'MacBook Pro 16 inch M3 Max (36GB RAM / 1TB SSD)',
        brand: 'Apple',
        category: 'laptop',
        pricePerDay: 550000,
        depositAmount: 35000000,
        images: [
          'https://images.unsplash.com/photo-1517336714731-489689fd1ca8?w=800',
        ],
        specs: {
          CPU: 'Apple M3 Max 14-core',
          GPU: '30-core GPU, Hardware-accelerated ray tracing',
          RAM: '36GB Unified Memory',
          Display: '16.2 inch Liquid Retina XDR 120Hz ProMotion',
        },
        description: 'Most powerful mobile workstation for heavy 8K video rendering and 3D modeling on the go.',
        location: {
          type: 'Point',
          coordinates: [105.8012, 21.0354],
        },
        addressText: 'Kim Ma, Ba Dinh, Hanoi',
        status: 'available',
        condition: 'new99',
        ratingAvg: 5.0,
        ratingCount: 18,
        rentalCount: 22,
      },
      {
        _id: deviceIds[4],
        ownerId: userOwnerId,
        name: 'DJI Mini 4 Pro Fly More Combo Plus Drone',
        brand: 'DJI',
        category: 'drone',
        pricePerDay: 350000,
        depositAmount: 12000000,
        images: [
          'https://images.unsplash.com/photo-1527977966376-1c8408f9f108?w=800',
        ],
        specs: {
          Weight: 'Under 249g (No complex permit required)',
          Camera: '4K/60fps HDR, True Vertical Shooting',
          Obstacle_Sensing: 'Omnidirectional Obstacle Sensing',
          Flight_Time: 'Up to 45 mins per battery (3 batteries included)',
        },
        description: 'Ideal ultralight drone for outdoor travel, wide-angle cinematic aerial footage.',
        location: {
          type: 'Point',
          coordinates: [105.8542, 21.0285],
        },
        addressText: 'Trang Tien, Hoan Kiem, Hanoi',
        status: 'available',
        condition: 'new99',
        ratingAvg: 4.8,
        ratingCount: 14,
        rentalCount: 20,
      },
      {
        _id: deviceIds[5],
        ownerId: userOwnerId,
        name: 'Sony WH-1000XM5 Noise Canceling Headphones Silver',
        brand: 'Sony',
        category: 'audio',
        pricePerDay: 90000,
        depositAmount: 4000000,
        images: [
          'https://images.unsplash.com/photo-1546435770-a3e426bf472b?w=800',
        ],
        specs: {
          Noise_Canceling: 'Integrated Processor V1 + QN1, 8 microphones',
          Audio_Codec: 'LDAC, Hi-Res Audio Wireless, DSEE Extreme',
          Battery_Life: '30 hours continuous playback',
        },
        description: 'Industry-leading noise canceling for long flights or focused study and work sessions.',
        location: {
          type: 'Point',
          coordinates: [105.7826, 21.0285],
        },
        addressText: 'Cau Giay, Hanoi',
        status: 'available',
        condition: 'used95',
        ratingAvg: 4.7,
        ratingCount: 8,
        rentalCount: 15,
      },
      {
        _id: deviceIds[6],
        ownerId: userOwnerId,
        name: 'iPad Pro M4 11 inch with Apple Pencil Pro',
        brand: 'Apple',
        category: 'gaming',
        pricePerDay: 280000,
        depositAmount: 16000000,
        images: [
          'https://images.unsplash.com/photo-1544244015-0df4b3ffc6b0?w=800',
        ],
        specs: {
          Display: 'Ultra Retina XDR Tandem OLED ultra-thin 5.1mm',
          Chip: 'Apple M4 9-core',
          Stylus: 'Apple Pencil Pro with Haptic Feedback squeeze',
        },
        description: 'Premier digital illustration and professional Lightroom photo editing tablet.',
        location: {
          type: 'Point',
          coordinates: [105.8012, 21.0354],
        },
        addressText: 'Ba Dinh, Hanoi',
        status: 'available',
        condition: 'new99',
        ratingAvg: 4.9,
        ratingCount: 11,
        rentalCount: 18,
      },
      {
        _id: deviceIds[7],
        ownerId: userOwnerId,
        name: 'DJI RS 3 Pro Combo Gimbal Stabilizer',
        brand: 'DJI',
        category: 'accessory',
        pricePerDay: 180000,
        depositAmount: 8000000,
        images: [
          'https://images.unsplash.com/photo-1589872766857-2110c7320b7c?w=800',
        ],
        specs: {
          Payload: '4.5 kg (Supports Cinema RED, Sony FX6, A7S3 rigs)',
          Axis_Locks: 'Automated automated axis locks upon power-on',
        },
        description: 'Heavy-duty 3-axis stabilizer for ultra-smooth high-speed tracking shots.',
        location: {
          type: 'Point',
          coordinates: [105.7826, 21.0285],
        },
        addressText: 'Cau Giay, Hanoi',
        status: 'available',
        condition: 'new99',
        ratingAvg: 5.0,
        ratingCount: 7,
        rentalCount: 12,
      },
      {
        _id: deviceIds[8],
        ownerId: userOwnerId,
        name: 'Fujifilm X-T5 Silver with XF 16-80mm f/4 OIS WR Lens',
        brand: 'Fujifilm',
        category: 'camera',
        pricePerDay: 320000,
        depositAmount: 18000000,
        images: [
          'https://images.unsplash.com/photo-1502920917128-1aa500764cbd?w=800',
        ],
        specs: {
          Sensor: '40.2MP X-Trans CMOS 5 HR',
          Film_Simulation: '19 classic film modes (Classic Chrome, Nostalgic Neg)',
        },
        description: 'Legendary film color recipes straight out of camera in a vintage dials body.',
        location: {
          type: 'Point',
          coordinates: [105.8542, 21.0285],
        },
        addressText: 'Hoan Kiem, Hanoi',
        status: 'available',
        condition: 'new99',
        ratingAvg: 4.9,
        ratingCount: 21,
        rentalCount: 29,
      },
      {
        _id: deviceIds[9],
        ownerId: userOwnerId,
        name: 'Dell Alienware m16 R2 Gaming Laptop Core Ultra 7',
        brand: 'Dell',
        category: 'gaming',
        pricePerDay: 400000,
        depositAmount: 22000000,
        images: [
          'https://images.unsplash.com/photo-1588872657578-7efd1f1555ed?w=800',
        ],
        specs: {
          CPU: 'Intel Core Ultra 7 155H',
          GPU: 'NVIDIA GeForce RTX 4070 8GB GDDR6',
          Display: '16 inch QHD+ 240Hz 100% sRGB',
        },
        description: 'Elite gaming rig for competitive AAA titles and real-time 3D VFX rendering.',
        location: {
          type: 'Point',
          coordinates: [105.8275, 21.0183],
        },
        addressText: 'Dong Da, Hanoi',
        status: 'available',
        condition: 'new99',
        ratingAvg: 4.8,
        ratingCount: 10,
        rentalCount: 14,
      },
    ];

    await Device.insertMany(devicesData);
    console.log('📱 [TechShare Seed] Seeded 10 Tech Devices.');

    // 5. Seed Bookings
    const bookingsData = [
      {
        _id: bookingCompletedId,
        bookingCode: 'TS-20260901',
        deviceId: deviceIds[2], // Sony A7 IV
        renterId: userRenterId,
        ownerId: userOwnerId,
        startDate: new Date('2026-09-01T08:00:00.000Z'),
        endDate: new Date('2026-09-04T18:00:00.000Z'),
        totalDays: 3,
        pricePerDayAtBooking: 450000,
        rentalFee: 1350000,
        depositFee: 25000000,
        totalAmount: 26350000,
        status: 'completed',
        paymentStatus: 'paid',
        deliveryMethod: 'delivery',
        deliveryAddress: '12 Chua Boc Street, Dong Da, Hanoi',
        qrToken: 'QR-TS-20260901-COMPLETED',
        handoverPhotos: {
          beforeRental: ['https://images.unsplash.com/photo-1516035069371-29a1b244cc32?w=800'],
          afterRental: ['https://images.unsplash.com/photo-1502920917128-1aa500764cbd?w=800'],
        },
        timeline: [
          { status: 'pending', note: 'Rental request submitted' },
          { status: 'approved', note: 'Approved by owner' },
          { status: 'active', note: 'Device handed over and in use' },
          { status: 'completed', note: 'Device returned in perfect condition, deposit refunded' },
        ],
      },
      {
        _id: bookingActiveId,
        bookingCode: 'TS-20260910',
        deviceId: deviceIds[0], // iPhone 15 Pro Max
        renterId: userRenterId,
        ownerId: userOwnerId,
        startDate: new Date('2026-09-10T08:00:00.000Z'),
        endDate: new Date('2026-09-12T20:00:00.000Z'),
        totalDays: 2,
        pricePerDayAtBooking: 250000,
        rentalFee: 500000,
        depositFee: 15000000,
        totalAmount: 15500000,
        status: 'active',
        paymentStatus: 'deposit_held',
        deliveryMethod: 'pickup',
        deliveryAddress: 'Tran Thai Tong, Cau Giay, Hanoi',
        qrToken: 'QR-TS-20260910-ACTIVE',
        timeline: [
          { status: 'pending', note: 'Rental request submitted' },
          { status: 'approved', note: 'Approved by owner' },
          { status: 'active', note: 'Device handed over and in active rental' },
        ],
      },
    ];

    await Booking.insertMany(bookingsData);
    console.log('📝 [TechShare Seed] Seeded 2 Sample Bookings (1 completed, 1 active).');

    // 6. Seed Reviews
    const reviewsData = [
      {
        _id: new mongoose.Types.ObjectId('64e0a12f9b1c2b001a555551'),
        bookingId: bookingCompletedId,
        deviceId: deviceIds[2],
        renterId: userRenterId,
        ownerId: userOwnerId,
        rating: 5,
        comment: 'Sony Alpha A7 IV worked flawlessly with a spotless sensor and sharp 24-70mm GM II lens. Minh Tuan was very helpful and professional!',
        images: ['https://images.unsplash.com/photo-1516035069371-29a1b244cc32?w=800'],
      },
    ];

    await Review.insertMany(reviewsData);
    console.log('⭐ [TechShare Seed] Seeded 1 Sample Review.');

    // 7. Seed 1-1 Chat Messages in English
    const messagesData = [
      {
        bookingId: bookingActiveId,
        senderId: userRenterId,
        receiverId: userOwnerId,
        type: 'text',
        content: 'Hello, is the iPhone 15 Pro Max fully charged to 100%?',
        status: 'read',
      },
      {
        bookingId: bookingActiveId,
        senderId: userOwnerId,
        receiverId: userRenterId,
        type: 'text',
        content: 'Hello Nam, it is 100% charged and already equipped with a rugged UAG protective case for you.',
        status: 'read',
      },
      {
        bookingId: bookingActiveId,
        senderId: userRenterId,
        receiverId: userOwnerId,
        type: 'location',
        content: 'I have arrived at the lobby meetup location!',
        location: {
          latitude: 21.0285,
          longitude: 105.7826,
          address: 'Tran Thai Tong, Cau Giay, Hanoi',
        },
        status: 'read',
      },
    ];

    await Message.insertMany(messagesData);
    console.log('💬 [TechShare Seed] Seeded 3 Sample 1-1 Chat Messages (English).');

    // 8. Seed Notifications in English
    const notificationsData = [
      {
        _id: new mongoose.Types.ObjectId('64e0a12f9b1c2b001a666661'),
        userId: userRenterId,
        title: 'Booking Approved Successfully 🎉',
        body: 'Owner Minh Tuan has approved your rental request for iPhone 15 Pro Max.',
        type: 'order',
        relatedId: bookingActiveId,
        isRead: false,
      },
      {
        _id: new mongoose.Types.ObjectId('64e0a12f9b1c2b001a666662'),
        userId: userOwnerId,
        title: 'New 5-Star Review from Hoang Nam ⭐',
        body: 'Hoang Nam just left a 5-star review for your Sony Alpha A7 IV camera.',
        type: 'system',
        relatedId: bookingCompletedId,
        isRead: true,
      },
    ];

    await Notification.insertMany(notificationsData);
    console.log('🔔 [TechShare Seed] Seeded 2 Sample Notifications (English).');

    // 9. Seed Vouchers
    const vouchersData = [
      {
        code: 'TECHSHARE50',
        type: 'fixed',
        value: 50000,
        minDays: 2,
        usageLimit: 100,
        usedCount: 5,
        isActive: true,
      },
      {
        code: 'WELCOME10',
        type: 'percent',
        value: 10,
        maxDiscount: 100000,
        minDays: 1,
        usageLimit: 500,
        usedCount: 22,
        isActive: true,
      },
    ];

    await Voucher.insertMany(vouchersData);
    console.log('🎟️ [TechShare Seed] Seeded 2 Promo Vouchers.');

    // 10. Seed Wallet Transactions
    const walletTransactionsData = [
      {
        userId: userRenterId,
        type: 'deposit_hold',
        amount: 15000000,
        balanceAfter: 2500000,
        relatedBookingId: bookingActiveId,
        status: 'success',
      },
      {
        userId: userOwnerId,
        type: 'rental_income',
        amount: 1350000,
        balanceAfter: 5200000,
        relatedBookingId: bookingCompletedId,
        status: 'success',
      },
    ];

    await WalletTransaction.insertMany(walletTransactionsData);
    console.log('💳 [TechShare Seed] Seeded 2 Wallet Escrow Transactions.');

    // 11. Seed AiCache
    const aiCachesData = [
      {
        type: 'review_summary',
        inputHash: 'hash_iphone_15_pro_max_v1',
        resultJson: {
          summary: 'iPhone 15 Pro Max boasts exceptional videography and powerful A17 Pro performance.',
          pros: ['Professional ProRes Log recording', 'Premium lightweight titanium build'],
          cons: ['Fragile back glass under heavy impact'],
        },
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // Auto expires in 7 days
      },
    ];

    await AiCache.insertMany(aiCachesData);
    console.log('🤖 [TechShare Seed] Seeded 1 AI Cache record (TTL 7 days).');

    // 12. Seed Disputes
    const disputesData = [
      {
        _id: new mongoose.Types.ObjectId('64e0a12f9b1c2b001a777991'),
        bookingId: bookingCompletedId,
        raisedBy: userOwnerId,
        reason: 'Khách làm xước viền kim loại và thấu kính bảo vệ của ống kính Sony 24-70mm GM II khi quay ngoại cảnh.',
        evidenceImages: [
          'https://images.unsplash.com/photo-1502920917128-1aa500764cbd?w=800',
        ],
        requestedDeductAmount: 2500000,
        status: 'pending',
      },
    ];
    await Dispute.insertMany(disputesData);
    console.log('⚖️ [TechShare Seed] Seeded 1 Pending Deposit Dispute.');

    // 13. Seed EkycRequests
    const ekycRequestsData = [
      {
        _id: new mongoose.Types.ObjectId('64e0a12f9b1c2b001a888991'),
        userId: userRenterId,
        idCardFrontUrl: 'https://images.unsplash.com/photo-1628157582853-a796fa650a6a?w=800',
        idCardBackUrl: 'https://images.unsplash.com/photo-1628157582853-a796fa650a6a?w=800',
        selfieUrl: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=800',
        status: 'pending',
      },
      {
        _id: new mongoose.Types.ObjectId('64e0a12f9b1c2b001a888992'),
        userId: renterUserIds[1],
        idCardFrontUrl: 'https://images.unsplash.com/photo-1628157582853-a796fa650a6a?w=800',
        idCardBackUrl: 'https://images.unsplash.com/photo-1628157582853-a796fa650a6a?w=800',
        selfieUrl: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=800',
        status: 'pending',
      },
    ];
    await EkycRequest.insertMany(ekycRequestsData);
    console.log('🪪 [TechShare Seed] Seeded 2 Pending eKYC Requests.');

    console.log('\n==================================================');
    console.log('🎉 [TechShare Seed] SEEDED ALL 13 COLLECTIONS SUCCESSFULLY!');
    console.log('==================================================');
    process.exit(0);
  } catch (error) {
    console.error('❌ [TechShare Seed] Error during seed execution:', error);
    process.exit(1);
  }
};

seedDatabase();
