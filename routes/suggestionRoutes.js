import express from "express";
import suggestionController from "../controllers/suggestionController.js";
import { authenticateAuthToken, requireAdmin } from "../utils/auth.js";

const router = express.Router();

router.post("/", suggestionController.create);
router.get("/", authenticateAuthToken, requireAdmin, suggestionController.getAll);

export default router;
