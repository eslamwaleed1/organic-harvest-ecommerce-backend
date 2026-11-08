import orderDAO from "../daos/OrderDAO.js";
import productDAO from "../daos/ProductDAO.js";
import productService from "./productService.js";
import { validateId, constructDatabaseId, startDatabaseSession } from "../daos/helperDAO.js";

const validationError = (message) => {
	const error = new Error(message);
	error.statusCode = 400;
	return error;
};

const validateOrderItems = (productData) => {
	if (!Array.isArray(productData) || productData.length === 0) {
		throw validationError("An order must contain at least one product.");
	}

	for (const item of productData) {
		if (!item || !validateId(item.productId)) {
			throw validationError("Every order item must have a valid product ID.");
		}
		if (!Number.isSafeInteger(item.quantity) || item.quantity < 1) {
			throw validationError(
				"Every order item must have a positive integer quantity.",
			);
		}
		if (!Number.isFinite(item.unitPrice) || item.unitPrice < 0) {
			throw validationError("Every order item must have a valid unit price.");
		}
	}
};

const aggregateQuantities = (items) => {
	const quantitiesByProduct = new Map();
	for (const { productId, quantity } of items) {
		const id = constructDatabaseId(productId)
		const aggregatedQuantity = (quantitiesByProduct.get(id) ?? 0) + quantity;
		if (!Number.isSafeInteger(aggregatedQuantity)) {
			throw validationError("The total quantity for a product is too large.");
		}
		quantitiesByProduct.set(id, aggregatedQuantity);
	}
	return [...quantitiesByProduct].map(([productId, quantity]) => ({
		productId,
		quantity,
	}));
};

class OrderService {
	async getOrders() {
		return orderDAO.getAllOrders();
	}

	async createOrder(orderData) {
		if (!validateId(orderData.userId)) {
			throw validationError("A valid user ID is required.");
		}
		validateOrderItems(orderData.productData);
		if (!Number.isFinite(orderData.totalAmount) || orderData.totalAmount < 0) {
			throw validationError("A valid total amount is required.");
		}

		const {userId, productData, totalAmount, status, stripeCheckoutSessionId} = orderData

		const session = startDatabaseSession()
		let createdOrder;

		try {
			await session.withTransaction(async () => {
				const productIds = [
					...new Set(
						productData.map(({ productId }) =>
							constructDatabaseId(productId).toString(),
						),
					),
				];
				const products = await productDAO.getProductsByIds(productIds, {
					session,
				});
				const productsById = new Map(
					products.map((product) => [
						constructDatabaseId(product._id).toString(),
						product,
					]),
				);

				const orderItems = productData.map(
					({ productId, quantity, unitPrice }) => {
						const canonicalProductId = constructDatabaseId(
							productId,
						).toString();
						const product = productsById.get(canonicalProductId);
						if (!product) {
							throw validationError(`Product ${productId} was not found.`);
						}
						if (unitPrice !== product.price) {
							throw validationError(
								`The submitted price for product ${productId} is out of date.`,
							);
						}
						return {
							productId: product._id,
							quantity,
							unitPrice: product.price,
						};
					},
				);

				const calculatedTotal = orderItems.reduce(
					(total, item) => total + item.quantity * item.unitPrice,
					0,
				);
				if (Math.abs(calculatedTotal - totalAmount) > 1e-8) {
					throw validationError(
						"The total amount does not match the product prices.",
					);
				}

				await productService.increaseSoldCountForMultipleProducts(
					aggregateQuantities(orderItems),
					{ session },
				);
				createdOrder = await orderDAO.createOrder(
					{
						userId,
						productData: orderItems,
						totalAmount: calculatedTotal,
					},
					{ session },
				);
			});
			return createdOrder;
		} finally {
			await session.endSession();
		}
	}

	async markPaidByStripeSessionId(sessionId) {
		return await orderDAO.markPaidByStripeSessionId(sessionId);
	}
	async markCancelledByStripeSessionId(sessionId) {
		return await orderDAO.markCancelledByStripeSessionId(sessionId);
	}

	async deleteOrder(orderId) {
		if (!validateId(orderId)) {
			throw validationError("A valid order ID is required.");
		}

		const session = startDatabaseSession();
		try {
			let deletedOrder;
			await session.withTransaction(async () => {
				deletedOrder = await orderDAO.deleteOrder(orderId, { session });
				if (deletedOrder) {
					await productService.decreaseSoldCountForMultipleProducts(
						aggregateQuantities(deletedOrder.productData),
						{ session },
					);
				}
			});
			return deletedOrder;
		} finally {
			await session.endSession();
		}
	}

	async getOrdersByUserId(userId) {
		return await orderDAO.getOrdersByUserId(userId);
	}

	async countOrdersByUserId(userId) {
		return await orderDAO.countOrdersByUserId(userId);
	}
}

const orderService = new OrderService();
export default orderService;
