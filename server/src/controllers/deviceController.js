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
  const page = Number.isSafeInteger((requestedPage - 1) * limit)
    ? requestedPage
    : 1;
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
    pagination: {
      page,
      limit,
      totalItems,
      totalPages: Math.ceil(totalItems / limit),
    },
  });
});

/** Nearby radius/maxDistance is in meters. Legacy Map callers remain unpaginated. */
export const getNearbyDevices = asyncHandler(async (req, res) => {
  if (req.query.radius !== undefined && req.query.maxDistance !== undefined &&
      req.query.radius !== req.query.maxDistance) {
    return res.status(400).json({ success: false, message: "radius and maxDistance must agree" });
  }
  const values = {};
  for (const key of ["lat", "lng", "maxDistance"]) {
    const raw = key === "maxDistance" ? (req.query.radius ?? req.query.maxDistance) : req.query[key];
    if (key === "maxDistance" && raw === undefined) { values[key] = 5000; continue; }
    if (typeof raw !== "string" || raw.trim() === "" || !Number.isFinite(Number(raw))) {
      return res.status(400).json({ success: false, message: `${key} must be a single finite number` });
    }
    values[key] = Number(raw);
  }
  const { lat, lng, maxDistance } = values;
  if (Math.abs(lat) > 90 || Math.abs(lng) > 180 || maxDistance <= 0) {
    return res.status(400).json({ success: false, message: "lat/lng must be valid and maxDistance must be greater than 0 meters" });
  }
  const { category, q } = req.query;
  for (const [key, value] of Object.entries({ category, q })) {
    if (value !== undefined && typeof value !== "string") {
      return res.status(400).json({ success: false, message: `${key} must be a single string` });
    }
  }
  const filter = { status: "available", isDeleted: false };
  if (category && category !== "all") filter.category = category.trim().toLowerCase();
  if (q?.trim()) {
    const escaped = q.trim().replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    const regex = new RegExp(escaped, "i");
    filter.$or = [{ name: regex }, { brand: regex }, { description: regex }];
  }
  // Preserve the Map endpoint's existing full-radius result contract.
  if (req.query.page === undefined && req.query.limit === undefined) {
    const devices = await Device.find({ ...filter, location: { $nearSphere: {
      $geometry: { type: "Point", coordinates: [lng, lat] }, $maxDistance: maxDistance,
    } } });
    return res.status(200).json({ success: true, count: devices.length, data: devices });
  }
  const limit = Math.min(positiveInteger(req.query.limit, 10), 10);
  const requestedPage = positiveInteger(req.query.page, 1);
  const page = Number.isSafeInteger((requestedPage - 1) * limit) ? requestedPage : 1;
  const [result] = await Device.aggregate([
    { $geoNear: {
      near: { type: "Point", coordinates: [lng, lat] }, key: "location",
      distanceField: "distanceMeters", spherical: true, maxDistance, query: filter,
    } },
    { $sort: { distanceMeters: 1, _id: 1 } },
    { $facet: {
      data: [{ $skip: (page - 1) * limit }, { $limit: limit }],
      total: [{ $count: "count" }],
    } },
  ]);
  const documents = result.data.map(record => Device.hydrate(record));
  await Device.populate(documents, { path: "ownerId", select: "name avatar rating isVerified phone email address" });
  const data = documents.map((doc, index) => ({ ...doc.toJSON(), distanceMeters: result.data[index].distanceMeters }));
  const totalItems = result.total[0]?.count || 0;
  const totalPages = Math.ceil(totalItems / limit);
  return res.status(200).json({ success: true, count: data.length, data,
    pagination: { page, limit, totalItems, totalPages, hasNextPage: page < totalPages },
  });
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

export const deleteMyDevice = asyncHandler(async (req, res) => {
  const { id } = req.params;
  if (!/^[a-fA-F0-9]{24}$/.test(id)) {
    return res.status(400).json({
      success: false,
      message: "ID thiết bị không hợp lệ",
    });
  }

  const userId = req.auth?.id || req.auth?._id;
  const device = await Device.findOne({
    _id: id,
    ownerId: userId,
    isDeleted: false,
  });

  if (!device) {
    return res.status(404).json({
      success: false,
      message: "Không tìm thấy thiết bị hoặc bạn không có quyền xóa thiết bị này.",
    });
  }

  device.isDeleted = true;
  device.status = "hidden";
  await device.save();

  return res.status(200).json({
    success: true,
    message: "Thiết bị đã được xóa khỏi danh sách.",
    data: {
      id: device._id,
      isDeleted: device.isDeleted,
    },
  });
});

export const updateMyDevice = asyncHandler(async (req, res) => {
  const { id } = req.params;
  if (!/^[a-fA-F0-9]{24}$/.test(id)) {
    return res.status(400).json({
      success: false,
      message: "ID thiết bị không hợp lệ",
    });
  }

  const {
    name,
    brand,
    category,
    description,
    pricePerDay,
    depositAmount,
    addressText,
  } = req.body;
  const allowedCategories = [
    "smartphone",
    "laptop",
    "camera",
    "drone",
    "audio",
    "tablet",
    "gaming",
    "accessory",
  ];

  if (
    typeof name !== "string" ||
    !name.trim() ||
    typeof brand !== "string" ||
    !brand.trim() ||
    !allowedCategories.includes(category) ||
    typeof description !== "string" ||
    !description.trim() ||
    typeof addressText !== "string" ||
    !addressText.trim() ||
    !Number.isFinite(pricePerDay) ||
    pricePerDay < 10000 ||
    !Number.isFinite(depositAmount) ||
    depositAmount < 0
  ) {
    return res.status(400).json({
      success: false,
      message: "Thông tin thiết bị không hợp lệ.",
    });
  }

  const userId = req.auth?.id || req.auth?._id;
  const device = await Device.findOne({
    _id: id,
    ownerId: userId,
    isDeleted: false,
  });

  if (!device) {
    return res.status(404).json({
      success: false,
      message: "Không tìm thấy thiết bị hoặc bạn không có quyền cập nhật thiết bị này.",
    });
  }

  device.name = name.trim();
  device.brand = brand.trim();
  device.category = category;
  device.description = description.trim();
  device.pricePerDay = pricePerDay;
  device.depositAmount = depositAmount;
  device.addressText = addressText.trim();
  await device.save();

  return res.status(200).json({
    success: true,
    message: "Cập nhật thiết bị thành công.",
    data: device,
  });
});

export const updateDeviceStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;

    const allowedStatuses = ["available", "maintenance", "hidden"];
    console.log("req.auth =", req.auth);

    if (!allowedStatuses.includes(status)) {
      return res.status(400).json({
        message: "Invalid device status",
      });
    }

    const device = await Device.findById(id);

    if (!device) {
      return res.status(404).json({
        message: "Device not found",
      });
    }

    const deviceOwnerId = (device.ownerId || device.owner)?.toString();
    const currentUserId = req.auth.id || req.auth._id;
    if (deviceOwnerId && deviceOwnerId !== currentUserId) {
      return res.status(403).json({
        success: false,
        message: "You are not allowed to update this device",
      });
    }

    device.status = status;
    await device.save();

    return res.status(200).json({
      message: "Device status updated successfully",
      data: device,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Không thể lấy danh sách thiết bị",
      error: error.message,
    });
  }
};

export const updateBlockedDates = async (req, res) => {
  try {
    const { id } = req.params;
    const { blockedDates } = req.body;

    const devices = await Device.findById(id);

    if (!devices) {
      return res.status(404).json({
        success: false,
        message: "Device not found",
      });
    }

    const userId = req.auth?.id || req.auth?._id;
    if (devices.ownerId.toString() !== userId?.toString()) {
      return res.status(403).json({
        success: false,
        message: "You are not the owner of this device",
      });
    }

    devices.blockedDates = Array.isArray(blockedDates) ? blockedDates : [];
    await devices.save();

    return res.status(200).json({
      success: true,
      message: "Blocked dates updated successfully",
      data: devices.blockedDates,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};
