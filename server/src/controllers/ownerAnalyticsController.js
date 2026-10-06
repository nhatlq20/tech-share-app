import { Booking, Device, User } from "../models/index.js";

/**
 * GET /api/owner/analytics
 * Lấy toàn bộ số liệu thống kê KPI và bảng điều khiển cho Chủ máy (Owner) trực tiếp từ MongoDB:
 * - Doanh thu thuần (tổng và theo tháng)
 * - Tỷ lệ tăng trưởng doanh thu so với tháng trước
 * - Số lượt cho thuê (tổng số đơn đặt)
 * - Số thiết bị đang cho thuê & sẵn sàng
 * - Tỷ lệ lấp đầy (utilization rate)
 * - Số dư ví khả dụng & Tiền cọc đang giữ hộ (Escrow)
 * - Điểm đánh giá sản phẩm (rating), điểm uy tín chủ máy (ownerRating), trustScore, totalReviews
 * - Biểu đồ doanh thu 7 ngày gần nhất
 * - Danh sách thiết bị và doanh thu/lượt thuê chi tiết từng máy
 */
export const getOwnerAnalytics = async (req, res) => {
  try {
    const ownerId = req.auth.id;

    // 1. Lấy thông tin tài khoản chủ máy từ collection 'users'
    const user = await User.findById(ownerId).lean();

    // 2. Lấy danh sách thiết bị của chủ máy từ collection 'devices'
    const devices = await Device.find({
      ownerId: ownerId,
      isDeleted: { $ne: true },
    }).lean();

    // 3. Lấy tất cả đơn thuê liên quan đến chủ máy từ collection 'bookings'
    const allBookings = await Booking.find({
      ownerId: ownerId,
    })
      .populate("deviceId", "name brand category images pricePerDay")
      .populate("renterId", "name avatar phone")
      .sort({ createdAt: -1 })
      .lean();

    // Phân loại đơn thuê theo trạng thái
    const completedBookings = allBookings.filter((b) => b.status === "completed");
    const activeBookings = allBookings.filter((b) => b.status === "active");
    const approvedBookings = allBookings.filter((b) => b.status === "approved");

    // 4. Tính toán doanh thu thuần từ các đơn đã hoàn thành
    let totalRevenue = 0;
    completedBookings.forEach((booking) => {
      totalRevenue += Number(booking.rentalFee || 0);
    });

    // 5. Tính doanh thu tháng này & tháng trước để ra tỷ lệ tăng trưởng
    const now = new Date();
    const currentYear = now.getFullYear();
    const currentMonth = now.getMonth();
    const lastMonthDate = new Date(currentYear, currentMonth - 1, 1);
    const lastMonthYear = lastMonthDate.getFullYear();
    const lastMonth = lastMonthDate.getMonth();

    let monthlyRevenue = 0;
    let lastMonthRevenue = 0;

    completedBookings.forEach((booking) => {
      const bookingDate = new Date(booking.updatedAt || booking.endDate || booking.startDate);
      const bYear = bookingDate.getFullYear();
      const bMonth = bookingDate.getMonth();

      if (bYear === currentYear && bMonth === currentMonth) {
        monthlyRevenue += Number(booking.rentalFee || 0);
      } else if (bYear === lastMonthYear && bMonth === lastMonth) {
        lastMonthRevenue += Number(booking.rentalFee || 0);
      }
    });

    const monthlyGrowth =
      lastMonthRevenue > 0
        ? Number((((monthlyRevenue - lastMonthRevenue) / lastMonthRevenue) * 100).toFixed(1))
        : monthlyRevenue > 0
        ? 100
        : 0;

    // 6. Số thiết bị đang cho thuê (dựa trên trạng thái máy hoặc đơn active)
    const rentedDeviceIds = new Set([
      ...devices.filter((d) => d.status === "rented").map((d) => d._id.toString()),
      ...activeBookings
        .map((b) => (b.deviceId && typeof b.deviceId === "object" ? b.deviceId._id?.toString() : b.deviceId?.toString()))
        .filter(Boolean),
    ]);
    const rentedDevicesCount = rentedDeviceIds.size;
    const totalDevicesCount = devices.length;
    const availableDevicesCount = devices.filter((d) => d.status === "available").length;

    // Tỷ lệ lấp đầy kho máy (%)
    const utilizationRate =
      totalDevicesCount > 0
        ? Number(((rentedDevicesCount / totalDevicesCount) * 100).toFixed(1))
        : 0;

    // 7. Tiền cọc đang giữ hộ (Escrow) từ các đơn đang thuê/đã duyệt
    let calculatedEscrow = 0;
    [...approvedBookings, ...activeBookings].forEach((booking) => {
      calculatedEscrow += Number(booking.depositFee || 0);
    });
    const escrowHolding = Number(user?.walletEscrowBalance || calculatedEscrow || 0);
    const walletBalance = Number(user?.walletBalance || 0);

    // 8. Thống kê doanh thu theo 7 ngày gần nhất
    const revenueByDay = [];
    for (let i = 6; i >= 0; --i) {
      const date = new Date();
      date.setDate(date.getDate() - i);
      const dateKey = date.toISOString().split("T")[0];

      let dayRevenue = 0;
      completedBookings.forEach((booking) => {
        const bookingDate = new Date(booking.updatedAt || booking.endDate || booking.startDate)
          .toISOString()
          .split("T")[0];

        if (bookingDate === dateKey) {
          dayRevenue += Number(booking.rentalFee || 0);
        }
      });

      revenueByDay.push({
        date: dateKey,
        day: date.toLocaleDateString("en-US", { weekday: "short" }),
        revenue: dayRevenue,
      });
    }

    // 9. Tính doanh thu và số lượt thuê tích lũy cho từng thiết bị
    const deviceStatsMap = new Map();
    completedBookings.forEach((booking) => {
      const devId = (booking.deviceId?._id || booking.deviceId || "").toString();
      if (!deviceStatsMap.has(devId)) {
        deviceStatsMap.set(devId, { count: 0, revenue: 0 });
      }
      const stat = deviceStatsMap.get(devId);
      stat.count += 1;
      stat.revenue += Number(booking.rentalFee || 0);
    });

    const enrichedDevices = devices.map((d) => {
      const devStat = deviceStatsMap.get(d._id.toString()) || { count: 0, revenue: 0 };
      const isCurrentlyRented = rentedDeviceIds.has(d._id.toString());
      return {
        ...d,
        status: isCurrentlyRented ? "rented" : d.status,
        rentalCount: d.rentalCount || devStat.count,
        revenueTotal: d.revenueTotal || devStat.revenue,
      };
    });

    return res.status(200).json({
      success: true,
      data: {
        ownerId: ownerId.toString(),
        // Các chỉ số KPI chính
        totalRevenue,
        monthlyRevenue,
        monthlyGrowth,
        totalBookings: allBookings.length,
        completedBookingsCount: completedBookings.length,
        activeRentals: rentedDevicesCount,
        rentedDevices: rentedDevicesCount,
        totalDevices: totalDevicesCount,
        availableDevices: availableDevicesCount,
        utilizationRate,
        // Tài chính ví & ký quỹ từ collection 'users'
        walletBalance,
        escrowHolding,
        // 4 trường uy tín từ collection 'users'
        rating: Number(user?.rating ?? 5.0),
        ownerRating: Number(user?.ownerRating ?? 5.0),
        trustScore: Number(user?.trustScore ?? 100),
        totalReviews: Number(user?.totalReviews ?? 0),
        totalReview: Number(user?.totalReviews ?? 0),
        // Danh sách dữ liệu chi tiết
        revenueByDay,
        devices: enrichedDevices,
        bookings: completedBookings,
      },
    });
  } catch (error) {
    console.error("Get owner analytics error:", error);
    return res.status(500).json({
      success: false,
      message: "Không thể lấy dữ liệu thống kê từ database",
      error: error.message,
    });
  }
};
