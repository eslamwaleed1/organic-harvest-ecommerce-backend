import mongoose from "mongoose";

const orderSchema = mongoose.Schema({
	userId: {
		type: mongoose.Schema.Types.ObjectId,
		ref: "User",
		required: true,
	},
	productData: [
		{
			productId: {
				type: mongoose.Schema.Types.ObjectId,
				ref: "Product",
				required: true,
			},
			productName: {
				type: mongoose.Schema.Types.String,
				ref: "Product",
			},
			quantity: {
				type: Number,
				required: true,
				min: 1,
				validate: Number.isInteger,
			},
			unitPrice: {
				type: Number,
				required: true,
				min: 0,
			},
		},
	],

	totalAmount: {
		type: Number,
		required: true,
		min: 0,
	},

	currency: {
		type: String,
		enum: ["myr"],
		default: "myr",
		required: true,
	},

	status: {
		type: String,
		enum: ["pending", "paid", "cancelled"],
		default: "pending",
		required: true,
	},

	stripeCheckoutSessionId: {
		type: String,
		unique: true,
		sparse: true,
	},
	
	orderDate: {
		type: Date,
		default: Date.now,
	},
});

const Order = new mongoose.model("Order", orderSchema);
export default Order;
