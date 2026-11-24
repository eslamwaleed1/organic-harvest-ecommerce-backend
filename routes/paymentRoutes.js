import express from "express";
import paymentController from "../controllers/paymentController.js";
import { authenticateAuthToken } from "../utils/auth.js";

const router = express.Router();

router.post(
	"/checkout",
	authenticateAuthToken,
	paymentController.createCheckoutSession,
);
router.get(
    "/session/:sessionId",
    authenticateAuthToken,
    paymentController.getCheckoutOrderStatus
);
router.post(
	"/session/:sessionId/finalize",
	authenticateAuthToken,
	paymentController.finalizeCheckoutSession,
);

export default router;
