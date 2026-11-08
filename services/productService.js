import productDAO from "../daos/ProductDAO.js";

const allowedCategories = [
	"Meat",
	"Fruits & Vesgetables",
	"Dairy & Eggs",
	"Bakery",
	"Honey",
];
const allowedFields = new Set([
	"name",
	"price",
	"unit",
	"image",
	"category",
	"description",
	"inventory",
]);

const validateProductData = (productData, { partial = false } = {}) => {
	const keys = Object.keys(productData);
	const unknownField = keys.find((key) => !allowedFields.has(key));
	if (unknownField) {
		const error = new Error(`Unknown product field: ${unknownField}`);
		error.statusCode = 400;
		throw error;
	}

	if (!partial && (typeof productData.name !== "string" || !productData.name.trim())) {
		const error = new Error("Product name is required");
		error.statusCode = 400;
		throw error;
	}
	if (productData.name !== undefined && (productData.name.trim().length > 120 || !productData.name.trim())) {
		const error = new Error("Product name must be between 1 and 120 characters");
		error.statusCode = 400;
		throw error;
	}
	if (productData.description !== undefined && (typeof productData.description !== "string" || productData.description.length > 2000)) {
		const error = new Error("Product description must be text with at most 2000 characters");
		error.statusCode = 400;
		throw error;
	}
	if (productData.price !== undefined && (!Number.isFinite(productData.price) || productData.price < 0)) {
		const error = new Error("Product price must be a non-negative finite number");
		error.statusCode = 400;
		throw error;
	}
	if (productData.inventory !== undefined && (!Number.isSafeInteger(productData.inventory) || productData.inventory < 0)) {
		const error = new Error("Product inventory must be a non-negative integer");
		error.statusCode = 400;
		throw error;
	}
	if (productData.category !== undefined && !allowedCategories.includes(productData.category)) {
		const error = new Error("Product category is invalid");
		error.statusCode = 400;
		throw error;
	}
	if (productData.unit !== undefined && (typeof productData.unit !== "string" || productData.unit.length > 30)) {
		const error = new Error("Product unit must be text with at most 30 characters");
		error.statusCode = 400;
		throw error;
	}
	if (productData.image !== undefined) {
		try {
			const imageUrl = new URL(productData.image);
			if (!["http:", "https:"].includes(imageUrl.protocol) || productData.image.length > 2048) {
				throw new Error();
			}
		} catch {
			const error = new Error("Product image must be a valid HTTP or HTTPS URL");
			error.statusCode = 400;
			throw error;
		}
	}
};

class ProductService {
	async createProduct(productData) {
		validateProductData(productData);
		try {
			const newProduct = await productDAO.createProduct(productData);
			return newProduct;
		} catch (error) {
			console.error(error);
			throw error;
		}
	}

	async getProducts() {
		try {
			const products = await productDAO.getProducts();
			return products;
		} catch (error) {
			console.error(error);
			throw error;
		}
	}

	async getCategories() {
		try {
			const categories = await productDAO.getCategories();
			return categories;
		} catch (error) {
			console.error(error);
			throw error;
		}
	}

	async deleteProduct(productId) {
		return productDAO.deleteProduct(productId);
	}

	async updateProduct(productId, updateData) {
		validateProductData(updateData, { partial: true });
		return productDAO.updateProduct(productId, updateData);
	}

	async increaseSoldCountForMultipleProducts(products, { session } = {}) {
		for (const { productId, quantity } of products) {
			const updatedProduct = await productDAO.increaseSoldNumber(
				productId,
				quantity,
				{ session },
			);
			if (!updatedProduct) {
				throw new Error(`Product ${productId} could not be updated.`);
			}
		}
	}

	async decreaseSoldCountForMultipleProducts(products, { session } = {}) {
		for (const { productId, quantity } of products) {
			const updatedProduct = await productDAO.decreaseSoldNumber(
				productId,
				quantity,
				{ session },
			);
			if (!updatedProduct) {
				throw new Error(
					`Product ${productId} could not be updated; its sold count may be lower than the order quantity.`,
				);
			}
		}
	}
}

const productService = new ProductService();

export default productService
