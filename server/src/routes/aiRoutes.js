import expreess from "express";
import { compareDevices, summarizeReview } from "../controllers/aiController.js";

const route = expreess.Router();

route.post("/summarize-review/:deviceId", summarizeReview);
route.post("/compare", compareDevices);
export default route;