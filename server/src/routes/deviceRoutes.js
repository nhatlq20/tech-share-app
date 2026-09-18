import express from "express";
import { createDevice, getDevices, getMyDevices } from "../controllers/deviceController.js";
import { requireAuth } from "../middlewares/authMiddleware.js";

const router = express.Router();

// GET /api/devices
router.get("/", getDevices);
router.post("/",requireAuth ,createDevice);
router.get("/myDevices",requireAuth,getMyDevices)
export default router;
