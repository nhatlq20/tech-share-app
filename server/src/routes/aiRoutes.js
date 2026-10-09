import expreess from "express";
import {
  compareDevices,
  consultDevice,
  generateDeviceDescription,
  summarizeReview,
} from "../controllers/aiController.js";

const route = expreess.Router();

route.post("/summarize-review/:deviceId", summarizeReview);
route.post("/compare", compareDevices);
route.post("/consultant", consultDevice);
route.post("/generate-description", generateDeviceDescription);
export default route;
