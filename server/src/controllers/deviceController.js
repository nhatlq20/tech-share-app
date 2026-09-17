import Device from "../models/Device.js";
import User from "../models/User.js"; // Registers 'User' model for Mongoose populate
import { asyncHandler } from "../middlewares/asyncHandler.js";

/**
 * @desc    Lấy danh sách các thiết bị đang có sẵn (available)
 * @route   GET /api/devices
 * @access  Public
 */
export const getDevices = asyncHandler(async (req, res) => {
  const { category } = req.query;

  const filter = {
    status: "available",
    isDeleted: false,
  };

  if (category && category !== "all") {
    filter.category = category.trim().toLowerCase();
  }

  const devices = await Device.find(filter)
    .populate("ownerId", "name avatar rating isVerified phone email address")
    .sort({ createdAt: -1 });

  res.status(200).json({
    success: true,
    count: devices.length,
    data: devices,
  });
});

export const createDevice = asyncHandler(async (req, res) => {
  const {
    name,
    brand,
    category,
    yearOfManufacture,
    condition,
    description,
    images,
    specs,
    accessories,
    pricePerDay,
    depositAmount,
    location,
    addressText,
  } = req.body;
  console.log("req.auth:", req.auth);
  const device = await Device.create({
    ownerId: req.auth.id,

    name,
    brand,
    category,
    yearOfManufacture,
    condition,
    description,

    images,
    specs,
    accessories,

    pricePerDay,
    depositAmount,

    location,
    addressText,

    status: "available",
    isDeleted: false,
  });

  res.status(201).json({
    success: true,
    message: "Device created successfully",
    data: device,
  });
});
