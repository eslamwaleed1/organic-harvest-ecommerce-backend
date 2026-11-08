import express from "express";
import { userController } from "../controllers/userController.js";
import { authenticateAuthToken, requireAdmin } from "../utils/auth.js";

const router = express.Router();

router.get("/", authenticateAuthToken, requireAdmin, userController.getUsers);
router.get("/profile", authenticateAuthToken, userController.getProfile);
router.patch("/profile", authenticateAuthToken, userController.updateProfile);
router.get("/orders", authenticateAuthToken, userController.getUserOrders);

export default router;
