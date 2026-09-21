import express from "express";
import { createDevice, getDeviceById, getDevices, getMyDevices, uploadDeviceImageToCloudinary } from "../controllers/deviceController.js";
import { requireAuth } from "../middlewares/authMiddleware.js";
import { uploadDeviceImage } from "../middlewares/uploadMiddleware.js";

const router = express.Router();

// GET /api/devices
router.get("/", getDevices);
router.post("/upload-image", requireAuth, uploadDeviceImage, uploadDeviceImageToCloudinary);
router.post("/",requireAuth,createDevice);
router.get("/myDevices",requireAuth,getMyDevices);
router.get("/:id", getDeviceById);
export default router;
