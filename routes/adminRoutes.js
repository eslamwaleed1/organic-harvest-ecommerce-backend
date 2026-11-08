import express from "express";
import adminController from "../controllers/adminController.js";
import { authenticateAuthToken, requireAdmin } from "../utils/auth.js";

const router = express.Router();

router.use(authenticateAuthToken, requireAdmin);
router.get("/reports/summary", adminController.getSummary);

export default router;
