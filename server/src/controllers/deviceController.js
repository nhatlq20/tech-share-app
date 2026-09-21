import Device from "../models/Device.js";
import User from "../models/User.js"; // Registers 'User' model for Mongoose populate
import { asyncHandler } from "../middlewares/asyncHandler.js";

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

    if (device.owner.toString() !== req.auth.id) {
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
