import express from "express";
import enquiryController from "../controllers/enquiryController.js";
import { authenticateAuthToken, requireAdmin } from "../utils/auth.js";

const router = express.Router();

router.use(authenticateAuthToken);
router.post("/", enquiryController.create);
router.get("/", enquiryController.getMine);
router.get("/all", requireAdmin, enquiryController.getAll);
router.patch("/:id/answer", requireAdmin, enquiryController.updateAnswer);

export default router;
