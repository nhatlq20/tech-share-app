import express from "express";
import { createDevice, getDevices } from "../controllers/deviceController.js";
import { requireAuth } from "../middlewares/authMiddleware.js";

const router = express.Router();

// GET /api/devices
router.get("/", getDevices);
router.post("/",requireAuth ,createDevice);

export default router;
