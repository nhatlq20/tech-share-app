import Device from "../models/Device.js";
import User from "../models/User.js"; // Registers 'User' model for Mongoose populate
import { asyncHandler } from "../middlewares/asyncHandler.js";

const DEVICE_SORTS = new Map([
  ["price_asc", { pricePerDay: 1, _id: 1 }],
  ["price_desc", { pricePerDay: -1, _id: 1 }],
  ["rating_desc", { ratingAvg: -1, _id: 1 }],
  ["newest", { createdAt: -1, _id: 1 }],
]);

const positiveInteger = (value, fallback) => {
  if (typeof value !== "string" || !/^\d+$/.test(value)) return fallback;
  const parsed = Number(value);
  return Number.isSafeInteger(parsed) && parsed > 0 ? parsed : fallback;
};

export const uploadDeviceImageToCloudinary = asyncHandler(async (req, res) => {
  if (!req.file) {
    return res.status(400).json({
      success: false,
      message: "Device image is required",
    });
  }

  const cloudName = process.env.CLOUDINARY_CLOUD_NAME;
  const uploadPreset = process.env.CLOUDINARY_UPLOAD_PRESET;
  if (!cloudName || !uploadPreset) {
    return res.status(500).json({
      success: false,
      message: "Cloudinary is not configured",
    });
  }

  const formData = new FormData();
  formData.append(
    "file",
    new Blob([req.file.buffer], { type: req.file.mimetype }),
    req.file.originalname,
  );
  formData.append("upload_preset", uploadPreset);
  formData.append("folder", "techshare/devices");

  const cloudinaryResponse = await fetch(
    `https://api.cloudinary.com/v1_1/${cloudName}/image/upload`,
    { method: "POST", body: formData },
  );
  const cloudinaryData = await cloudinaryResponse.json();

  if (!cloudinaryResponse.ok || !cloudinaryData.secure_url) {
    console.error("Device image upload error:", cloudinaryData);
    return res.status(502).json({
      success: false,
      message: cloudinaryData?.error?.message || "Device image upload failed",
    });
  }

  return res.status(201).json({
    success: true,
    data: { url: cloudinaryData.secure_url },
  });
});

/**
 * @desc    Lấy danh sách các thiết bị đang có sẵn (available)
 * @route   GET /api/devices
 * @access  Public
 */
export const getDevices = asyncHandler(async (req, res) => {
  const { category, q } = req.query;
  for (const [key, value] of Object.entries({ category, q })) {
    if (value !== undefined && typeof value !== "string") {
      return res.status(400).json({
        success: false,
        message: `${key} must be a single string`,
      });
    }
  }
  const limit = Math.min(positiveInteger(req.query.limit, 10), 100);
  const requestedPage = positiveInteger(req.query.page, 1);
  const page = Number.isSafeInteger((requestedPage - 1) * limit) ? requestedPage : 1;
  const sort = DEVICE_SORTS.get(req.query.sort) || DEVICE_SORTS.get("newest");

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

  const [devices, totalItems] = await Promise.all([
    Device.find(filter)
      .populate("ownerId", "name avatar rating isVerified phone email address")
      .sort(sort)
      .skip((page - 1) * limit)
      .limit(limit),
    Device.countDocuments(filter),
  ]);

  res.status(200).json({
    success: true,
    count: devices.length,
    data: devices,
    pagination: { page, limit, totalItems, totalPages: Math.ceil(totalItems / limit) },
  });
});

/** GET /api/devices/nearby — maxDistance in meters (default: 5000). */
export const getNearbyDevices = asyncHandler(async (req, res) => {
  const values = {};
  for (const key of ["lat", "lng", "maxDistance"]) {
    const raw = req.query[key];
    if (key === "maxDistance" && raw === undefined) {
      values[key] = 5000;
      continue;
    }
    if (typeof raw !== "string" || raw.trim() === "" || !Number.isFinite(Number(raw))) {
      return res.status(400).json({ success: false, message: `${key} must be a single finite number` });
    }
    values[key] = Number(raw);
  }
  const { lat, lng, maxDistance } = values;
  if (lat < -90 || lat > 90) {
    return res.status(400).json({ success: false, message: "lat must be between -90 and 90" });
  }
  if (lng < -180 || lng > 180) {
    return res.status(400).json({ success: false, message: "lng must be between -180 and 180" });
  }
  if (maxDistance <= 0) {
    return res.status(400).json({ success: false, message: "maxDistance must be greater than 0 meters" });
  }

  // GeoJSON requires longitude first. $nearSphere orders results by proximity.
  const devices = await Device.find({
    status: "available",
    isDeleted: false,
    location: {
      $nearSphere: {
        $geometry: { type: "Point", coordinates: [lng, lat] },
        $maxDistance: maxDistance,
      },
    },
  });
  res.status(200).json({ success: true, count: devices.length, data: devices });
});

export const getDeviceById = asyncHandler(async (req, res) => {
  if (!/^[a-fA-F0-9]{24}$/.test(req.params.id)) {
    return res.status(400).json({
      success: false,
      message: "ID thiết bị không hợp lệ",
    });
  }

  const device = await Device.findOne({
    _id: req.params.id,
    isDeleted: false,
  }).populate("ownerId", "name avatar rating isVerified");

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
