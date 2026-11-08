import Product from "../models/Product.js";

class ProductDAO {
	async findById(id, { session } = {}) {
		return Product.findById(id).session(session ?? null);
	}
	
	async getProductsByIds(ids, { session } = {}) {
		return Product.find({ _id: { $in: ids } }).session(session ?? null);
	}
	async findByName(name) {
		return await Product.findOne({ name });
	}
	async createProduct(productData) {
		const newProduct = new Product(productData);
		return await newProduct.save();
	}
	async updateProduct(productId, updateData) {
		try {
			const { _id, id, createdAt, updatedAt, ...sanitizedData } = updateData;

			const updatedProduct = await Product.findOneAndUpdate(
				{ _id: productId },
				{ $set: sanitizedData },
				{
					new: true,
					runValidators: true,
				},
			)
				.lean()
				.exec();

			return updatedProduct;
		} catch (error) {
			console.error(`[ProductDAO] Error updating product ${productId}:`, error);
			throw error;
		}
	}
	async deleteProduct(productId) {
		return Product.findByIdAndDelete(productId);
	}

	async getProducts() {
		return await Product.find({});
	}

	async getAGroupOfProductsByIds(ids) {
		const products = await Product.find({
            _id: { $in: [...ids] },
		});
		return products
	}

	async getCategories() {
		return await Product.schema.path("category").enumValues
	}
	
	async increaseSoldNumber(productId, number = 1, { session } = {}) {
		if (!Number.isInteger(number) || number < 1) {
			throw new Error("Sold count increase must be a positive integer.");
		}
		return Product.findOneAndUpdate(
			{ _id: productId },
			{ $inc: { numberOfPurchases: number } },
			{
				new: true,
				runValidators: true,
				session,
			},
		);
	}

	async decreaseSoldNumber(productId, number = 1, { session } = {}) {
		if (!Number.isInteger(number) || number < 1) {
			throw new Error("Sold count decrease must be a positive integer.");
		}
		return Product.findOneAndUpdate(
			{ _id: productId, numberOfPurchases: { $gte: number } },
			{ $inc: { numberOfPurchases: -number } },
			{
				new: true,
				runValidators: true,
				session,
			},
		);
	}
}

const productDAO = new ProductDAO();
export default productDAO
