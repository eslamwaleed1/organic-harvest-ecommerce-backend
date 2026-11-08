import express from "express";
import { userController } from "../controllers/userController.js";
import {
	authenticateAuthToken,
	authenticateSignupToken,
	requireAdmin,
} from "../utils/auth.js";

const router = express.Router();

router.post("/signup", userController.signup);
router.post("/resend-magic-link", authenticateSignupToken, userController.resendMagicLink);
router.get("/resend-magic-link", authenticateSignupToken, userController.resendMagicLink);
router.post("/verify-email", userController.verifyEmail);
router.post("/login", userController.login);
router.post("/forgot-password", userController.forgotPassword);
router.post("/reset-password", userController.resetPassword);
router.post("/change-password", authenticateAuthToken, userController.requestPasswordChange);
router.get("/me", authenticateAuthToken, userController.me);
router.post("/logout", authenticateAuthToken, userController.logout);
router.get("/logout", authenticateAuthToken, userController.logout);
router.post("/admin/invitations", authenticateAuthToken, requireAdmin, userController.inviteAdmin);
router.post("/admin/set-password", userController.setAdminPassword);
router.post("/google", userController.googleLogin);

export default router;
