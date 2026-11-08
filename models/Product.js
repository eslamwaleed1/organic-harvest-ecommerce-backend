import mongoose from "mongoose";

const productSchema = new mongoose.Schema({
	name: {
		type: String,
		required: true,
	},
	price: {
		type: Number,
		required: true,
		default: 5,
	},
	unit: {
		type: String,
		default: "1Kg"
	},
	image: {
		type: String,
		required: true,
		default: "https://res.cloudinary.com/wkvfl3ac/image/upload/v1792503782/Red-Tomato.avif"
	},
	category: {
		type: String,
		enum: ["Meat", "Fruits & Vesgetables", "Dairy & Eggs", "Bakery", "Honey"],
		default: "Fruits & Vesgetables"
    },
    description: {
		type: String,
		default: "some product"
	},
	numberOfPurchases: {
		type: Number,
		default: 0,
		min: 0,
	},
	inventory: {
		type: Number,
		default: 0,
		min: 0,
	},
	createdAt: {
		type: Date,
		default: Date.now,
	},
});

const Product = new mongoose.model("Product", productSchema);

export default Product;
