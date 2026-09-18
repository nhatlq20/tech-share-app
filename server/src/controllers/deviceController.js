import Device from "../models/Device.js";
import User from "../models/User.js"; // Registers 'User' model for Mongoose populate
import { asyncHandler } from "../middlewares/asyncHandler.js";

/**
 * @desc    Lấy danh sách các thiết bị đang có sẵn (available)
 * @route   GET /api/devices
 * @access  Public
 */
export const getDevices = asyncHandler(async (req, res) => {
  const { category, q } = req.query;

  const filter = {
    status: "available",
    isDeleted: false,
  };

  if (category && category !== "all") {
    filter.category = category.trim().toLowerCase();
  }

  if (q && q.trim()) {
    const keyword = q.trim();
    const escapedKeyword = keyword.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    const regex = new RegExp(escapedKeyword, "i");

    filter.$or = [{ name: regex }, { brand: regex }, { description: regex }];
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

export const getDeviceById = asyncHandler(async (req, res) => {
  const device = await Device.findOne({
    _id: req.params.id,
    isDeleted: false,
  }).populate("ownerId", "name avatar rating isVerified phone email address");

  if (!device) {
    return res.status(404).json({
      success: false,
      message: "Không tìm thấy thiết bị",
    });
  }

  res.status(200).json({
    success: true,
    data: device,
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

export const getMyDevices = async (req, res) => {
  try {
    const devices = await Device.find({
      ownerId: req.auth.id,
      isDeleted: false,
    }).sort({ createdAt: -1 });
    res.status(200).json({
      success: true,
      message: "Lấy danh sách thiết bị thành công",
      data: devices,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Không thể lấy danh sách thiết bị",
      error: error.message,
    });
  }
};
