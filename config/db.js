import mongoose from "mongoose";

const logConnectionEvent = (message) => {
	console.log(`[${new Date().toISOString()}] ${message}`);
};

const connectToMongoDB = async () => {
	const DB_URI = process.env.MONGODB_URI;

	const connectDB = async () => {
		try {
			if (!DB_URI) {
				console.warn(
					"⚠️ MONGODB_URI is missing. Starting server without MongoDB.",
				);
				return;
			}

			await mongoose.connect(DB_URI);
			logConnectionEvent("🔹 MongoDB connected successfully.");

			mongoose.connection.getClient().on("serverHeartbeatFailed", (event) => {
				console.error(
					`❌ MongoDB heartbeat failed for ${event.connectionId}:`,
					event.failure.message,
				);
			});
		} catch (error) {
			console.error(
				`[${new Date().toISOString()}] ❌ Database connection failed:`,
				error,
			);
			console.warn(
				"⚠️ Starting server without a database connection. Mongo-backed routes will fail until MongoDB is reachable.",
			);
		}
	};

	mongoose.connection.on("error", (err) => {
		console.error(
			`[${new Date().toISOString()}] ⚠️ MongoDB runtime error:`,
			err,
		);
	});

	mongoose.connection.on("connecting", () => {
		logConnectionEvent("🔄 MongoDB connecting.");
	});

	mongoose.connection.on("connected", () => {
		logConnectionEvent("🔹 MongoDB connection established.");
	});

	mongoose.connection.on("disconnected", () => {
		console.warn(
			`[${new Date().toISOString()}] ⚠️ MongoDB disconnected (readyState: ${mongoose.connection.readyState}).`,
		);
	});

	mongoose.connection.on("reconnected", () => {
		logConnectionEvent("🔄 MongoDB reconnected.");
	});

	mongoose.connection.on("close", () => {
		logConnectionEvent("MongoDB connection closed.");
	});

	await connectDB();
};


export default connectToMongoDB
