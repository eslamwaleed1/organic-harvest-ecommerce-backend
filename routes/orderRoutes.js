import express from "express";
import orderController from "../controllers/orderController.js";
import { authenticateAuthToken, requireAdmin } from "../utils/auth.js";

const router = express.Router();


router.get("/", authenticateAuthToken, requireAdmin, orderController.getOrders);
router.post("/new", authenticateAuthToken, orderController.createOrder);
router.delete("/:id", authenticateAuthToken, requireAdmin, orderController.deleteOrder);

export default router;
