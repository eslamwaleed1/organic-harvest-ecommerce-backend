import productService  from "../services/productService.js";

class ProductController {
	async createProduct(req, res) {
		try {
			const newProduct = await productService.createProduct(req.body ?? {});
			return res.status(201).json({
				success: true,
				message: "Product created successfully!",
				data: newProduct,
			});
		} catch (error) {
			console.error("Failed to create product:", error);
			return res.status(error.statusCode ?? 500).json({
				success: false,
				message: error.statusCode ? error.message : "Failed to create product",
			});
		}
	}

	async getProducts(req, res) {
		try {
			const products = await productService.getProducts();
			if (!products) return res.status(401);
			return res.status(200).json(products);
		} catch (error) {
			console.error(error);
			return res.status(500).json({ message: "Failed" });
		}
	}

	async getCategories(req, res) {
		try {
			const categories = await productService.getCategories();
			if (!categories) return res.status(401);
			return res.status(200).json(categories);
		} catch (error) {
			console.error(error);
			return res.status(500).json({ message: "Failed" });
		}
	}

	async deleteProduct(req, res) {
		try {
			const productId = req.params.id;
			const deletedProduct = await productService.deleteProduct(productId);
			if (!deletedProduct) {
				return res.status(404).json({ message: "Product not found." });
			}
			return res.status(200).json({
				deletedProduct,
				message: "deleted successfully",
			});
		} catch (error) {
			console.error("Failed to delete product:", error);
			return res.status(500).json({ message: "Failed to delete product." });
		}
	}

	async updateProduct(req, res) {
			try {
				const product = await productService.updateProduct(
					req.params.id,
					req.body ?? {},
				);
				if (!product) {
					return res.status(404).json({ success: false, message: "Product not found." });
				}
				return res.status(200).json({
					success: true,
					message: "Product updated successfully.",
					data: product,
				});
			} catch (error) {
				console.error("Failed to update product:", error);
				return res.status(error.statusCode ?? 500).json({
					success: false,
					message: error.statusCode ? error.message : "Failed to update product.",
				});
			}
		}
}

export const productController = new ProductController();
