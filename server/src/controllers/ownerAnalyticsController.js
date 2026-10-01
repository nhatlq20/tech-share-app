import { Booking, Device } from "../models/index.js";

export const getOwnerAnalytics = async (req, res) => {
  try {
    const ownerId = req.auth.id;

    const devices = await Device.find({
      ownerId: ownerId,
      isDeleted: { $ne: true },
    }).lean();

    const bookings = await Booking.find({
      ownerId: ownerId,
      status: "completed",
    })
      .populate("deviceId", "name")
      .populate("renterId", "name")
      .lean();

    const rentedDeviceIds = await Booking.distinct("deviceId", {
      ownerId: ownerId,
      status: "active",
    });
     const rentedDevices = rentedDeviceIds.length;

    let totalRevenue = 0;

    bookings.forEach((booking) => {
      totalRevenue += Number(booking.rentalFee || 0);
    });

    const revenueByDay = [];

    for (let i = 6; i >= 0; --i) {
      const date = new Date();
      console.log(date);
      date.setDate(date.getDate() - i);

      const dateKey = date.toISOString().split("T")[0];

      let revenue = 0;
      bookings.forEach((booking) => {
        // Lấy ngày booking hoàn thành
        const bookingDate = new Date(booking.updatedAt)
          .toISOString()
          .split("T")[0];

        // Nếu booking thuộc ngày đang xét
        if (bookingDate === dateKey) {
          revenue += Number(booking.rentalFee || 0);
        }
      });
      revenueByDay.push({
        date: dateKey,

        day: date.toLocaleDateString("en-US", {
          weekday: "short",
        }),

        revenue: revenue,
      });
    }

    return res.status(200).json({
      success: true,

      data: {
        ownerId: ownerId.toString(),

        totalRevenue: totalRevenue,

        totalDevices: devices.length,

        totalBookings: bookings.length,

        revenueByDay: revenueByDay,

        devices: devices,

        bookings: bookings,

        rentedDevices: rentedDevices,
      },
    });
  } catch (error) {
    console.error("Get owner analytics error:", error);

    return res.status(500).json({
      success: false,
      message: "Không thể lấy dữ liệu thống kê",
    });
  }
};
