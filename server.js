import express from "express";
import cors from "cors";
import "dotenv/config";
import cookieparser from "cookie-parser"
import connectToMongoDB from "./config/db.js";
import userRoutes from "./routes/userRoutes.js";
import productRoutes from "./routes/productRoutes.js";
import orderRoutes from "./routes/orderRoutes.js";
import paymentRoutes from "./routes/paymentRoutes.js";
import authRoutes from "./routes/authRoutes.js";
import enquiryRoutes from "./routes/enquiryRoutes.js";
import suggestionRoutes from "./routes/suggestionRoutes.js";
import paymentController from "./controllers/paymentController.js";
import adminRoutes from "./routes/adminRoutes.js";

const app = express();
app.use(
	cors({
		origin: "http://localhost:5173",
		credentials: true,
	}),
)
connectToMongoDB().catch((error) => {
	console.error("MongoDB startup error:", error);
});

// const allowedOrigins = ["http://localhost:5173"];

app.set("trust proxy", 1);
// app.use(
// 	cors({
// 		origin: function (origin, callback) {
// 			if (!origin) return callback(null, true);
// 			const isAllowedOrigin = allowedOrigins.includes(origin);
// 			if (!isAllowedOrigin) {
// 				const msg =
// 					"The CORS policy for this site does not allow access from the specified Origin.";
// 				return callback(new Error(msg), false);
// 			}
// 			return callback(null, true);
// 		},
// 		credentials: false,
// 	}),
// );
app.use("/api/payments/webhook", express.raw({ type: "application/json" }), paymentController.webhook)
app.use(express.json());
app.use(cookieparser())

app.use("/api/users", userRoutes);
app.use("/api/auth", authRoutes);
app.use("/api/admin", adminRoutes);
app.use("/api/enquiries", enquiryRoutes);
app.use("/api/suggestions", suggestionRoutes);
app.use("/api/products", productRoutes);
app.use("/api/orders", orderRoutes);

app.use("/api/payments", paymentRoutes);
app.get("/api/test", (req, res) => {
	res.json({ message: "Hello from the backend!" });
});

app.use((req, res) => {
	res.status(404).json({ success: false, message: "Route not found" });
});

app.use((error, req, res, next) => {
	console.error("Unhandled request error:", error);
	if (res.headersSent) return next(error);

	const statusCode = error.statusCode ?? (error.type === "entity.parse.failed" ? 400 : 500);
	return res.status(statusCode).json({
		success: false,
		message: statusCode === 500 ? "Internal server error" : error.message,
	});
});

const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
	console.log(`🚀 Server running on http://localhost:${PORT}`);
});

process.on("unhandledRejection", (reason) => {
	console.error("Unhandled promise rejection:", reason);
});

process.on("uncaughtException", (error) => {
	console.error("Uncaught exception:", error);
});
