import express from "express";
import cors from "cors";
import orderController from "../controllers/orderController.js";
import { authenticateAuthToken, requireAdmin } from "../utils/auth.js";

const router = express.Router();

// router.use(
//     cors({
//         origin: "http://localhost:5173",
//         credentials: true,
//     }),
// );

router.get("/", authenticateAuthToken, requireAdmin, orderController.getOrders);
router.post("/new", authenticateAuthToken, orderController.createOrder);
router.delete("/:id", authenticateAuthToken, requireAdmin, orderController.deleteOrder);
//router.get("/user-orders/:id", orderController.getUserOrders)
//router.get("/user-orders", authenticateAuthToken, orderController.getUserOrders)

export default router;
