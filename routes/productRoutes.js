import express from "express";
import cors from "cors";
import { productController } from "../controllers/productController.js";
import { authenticateAuthToken, requireAdmin } from "../utils/auth.js";

const router = express.Router();

// router.use(
// 	cors({
// 		origin: "http://localhost:5173",
// 		credentials: true,
// 	}),
// );

router.get("/", productController.getProducts);
router.post("/new", authenticateAuthToken, requireAdmin, productController.createProduct);
router.patch("/:id", authenticateAuthToken, requireAdmin, productController.updateProduct);
router.delete("/:id", authenticateAuthToken, requireAdmin, productController.deleteProduct);
router.get("/categories", productController.getCategories)

export default router;
