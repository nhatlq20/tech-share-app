import express from "express";
import { createDevice, getDeviceById, getDevices, getMyDevices } from "../controllers/deviceController.js";
import { requireAuth } from "../middlewares/authMiddleware.js";

const router = express.Router();

// GET /api/devices
router.get("/", getDevices);
router.post("/",requireAuth ,createDevice);
router.get("/myDevices",requireAuth,getMyDevices);
router.get("/:id", getDeviceById);
export default router;
