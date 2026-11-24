import Stripe from "stripe";
import { validateId } from "../daos/helperDAO.js";
import orderDAO from "../daos/OrderDAO.js";
import productDAO from "../daos/ProductDAO.js";

let stripeClient;

export const getStripeClient = () => {
	if (!process.env.STRIPE_SECRET_KEY) return null;
	if (!stripeClient) stripeClient = new Stripe(process.env.STRIPE_SECRET_KEY);
	return stripeClient;
};

function validateCheckoutSessionId(sessionId) {
	if (typeof sessionId !== "string" || !/^cs_(test|live)_/.test(sessionId)) {
		const error = new Error("Invalid checkout session ID");
		error.statusCode = 400;
		throw error;
	}
}

function getOrderStatus(order, status = order.status) {
	return {
		orderId: order._id,
		status,
		amountTotal: order.totalAmount,
		currency: order.currency,
		createdAt: order.createdAt,
	};
}

class PaymentService {
	async createCheckoutSession({ userId, cartItems }) {
		const stripe = getStripeClient();
		if (!stripe) {
			const error = new Error("Stripe payments are not configured");
			error.statusCode = 503;
			throw error;
		}
		if (!process.env.FRONTEND_URL) {
			const error = new Error("Payment redirect URL is not configured");
			error.statusCode = 503;
			throw error;
		}
		const frontendUrl = process.env.FRONTEND_URL.replace(/\/+$/, "");
		if (!validateId(userId)) {
			const error = new Error("Invalid user");
			error.statusCode = 401;
			throw error;
		}

		if (!Array.isArray(cartItems) || cartItems.length === 0) {
			const error = new Error("Your cart is empty");
			error.statusCode = 400;
			throw error;
		}

		if (cartItems.length > 100) {
			const error = new Error("Too many different products");
			error.statusCode = 400;
			throw error;
		}

		// Validate the cart and consolidate duplicate product IDs.
		const quantities = new Map();

		for (const item of cartItems) {
			const { productId, quantity } = item ?? {};

			if (
				!validateId(productId) ||
				!Number.isSafeInteger(quantity) ||
				quantity < 1 ||
				quantity > 99
			) {
				const error = new Error(
					"Each cart item needs a valid product ID and quantity from 1 to 99",
				);
				error.statusCode = 400;
				throw error;
			}

			// To ensure if there are duplicate entires of the same product, combine their quantities
			const key = productId.toString();
			const combinedQuantity = (quantities.get(key) ?? 0) + quantity;

			if (combinedQuantity > 99) {
				const error = new Error(
					"Combined quantity cannot exceed 99 per product",
				);
				error.statusCode = 400;
				throw error;
			}

			quantities.set(key, combinedQuantity);
		}

		// Load trusted prices and names from the database.
		const products = await productDAO.getAGroupOfProductsByIds(
			quantities.keys(),
		);

		if (products.length !== quantities.size) {
			const error = new Error("One or more products no longer exist");
			error.statusCode = 400;
			throw error;
		}

		const items = products.map((product) => {
			const quantity = quantities.get(product._id.toString());
			const price = product.price;

			if (typeof price !== "number" || !Number.isFinite(price) || price <= 0) {
				throw new Error(`Product ${product._id} has an invalid price`);
			}

			//const unitPrice = Math.round(price * 100);
			const unitPrice = price;

			if (!Number.isSafeInteger(unitPrice) || unitPrice < 1) {
				throw new Error(`Product ${product._id} has an invalid price`);
			}

			return {
				productId: product._id,
				productName: product.name,
				quantity,
				unitPrice,
			};
		});

		const totalAmount = items.reduce(
			(total, item) => total + item.unitPrice * item.quantity,
			0,
		);

		if (!Number.isSafeInteger(totalAmount) || totalAmount < 1) {
			throw new Error("Invalid order total");
		}

		// Save the intended purchase before redirecting to Stripe.

		const order = await orderDAO.createOrder({
			userId,
			productData: items,
			totalAmount,
			currency: "myr",
			status: "pending",
		});

		const lineItems = items.map((item) => ({
			price_data: {
				currency: "myr",
				product_data: {
					name: item.productName,
				},
				unit_amount: item.unitPrice * 100,
			},
			quantity: item.quantity,
		}));

		try {
			const session = await stripe.checkout.sessions.create({
				mode: "payment",

				line_items: lineItems,

				success_url:
					`${frontendUrl}/payment/success` +
					"?session_id={CHECKOUT_SESSION_ID}",

				cancel_url: `${frontendUrl}/payment/cancel`,

				client_reference_id: order._id.toString(),

				metadata: {
					orderId: order._id.toString(),
				},
			});

			await orderDAO.setStripeSessionId(order._id, session.id);

			return {
				orderId: order._id,
				checkoutUrl: session.url,
			};
		} catch (error) {
			console.error("Stripe checkout session creation failed:", error);
			throw error;
		}
	}

	async getCheckoutOrderStatus({ sessionId, userId }) {
		validateCheckoutSessionId(sessionId);

		let order = await orderDAO.findBySessionIdForUser(sessionId, userId);

		if (!order) {
			// Don't reveal whether another user's order exists.
			const error = new Error("Order not found");
			error.statusCode = 404;
			throw error;
		}

		if (order.status === "pending") {
			const stripe = getStripeClient();
			if (!stripe) {
				const error = new Error("Stripe payments are not configured");
				error.statusCode = 503;
				throw error;
			}

			const session = await stripe.checkout.sessions.retrieve(sessionId);
			if (session.payment_status === "paid") {
				order =
					(await orderDAO.markPaidByStripeSessionId(sessionId)) ??
					(await orderDAO.findBySessionIdForUser(sessionId, userId)) ??
					order;
			}
		}

		return getOrderStatus(order);
	}

	async finalizeCheckoutSession({ sessionId, userId }) {
		validateCheckoutSessionId(sessionId);

		const stripe = getStripeClient();
		if (!stripe) {
			const error = new Error("Stripe payments are not configured");
			error.statusCode = 503;
			throw error;
		}

		let order = await orderDAO.findBySessionIdForUser(sessionId, userId);
		if (!order) {
			const error = new Error("Order not found");
			error.statusCode = 404;
			throw error;
		}
		if (order.status !== "pending") return getOrderStatus(order);

		let session = await stripe.checkout.sessions.retrieve(sessionId);
		if (session.payment_status === "paid") {
			order =
				(await orderDAO.markPaidByStripeSessionId(sessionId)) ??
				(await orderDAO.findBySessionIdForUser(sessionId, userId)) ??
				order;
			return getOrderStatus(order);
		}

		if (session.status === "open") {
			session = await stripe.checkout.sessions.expire(sessionId);
		}

		if (session.payment_status === "paid") {
			order =
				(await orderDAO.markPaidByStripeSessionId(sessionId)) ??
				(await orderDAO.findBySessionIdForUser(sessionId, userId)) ??
				order;
			return getOrderStatus(order);
		}

		let paymentIntent;
		if (session.payment_intent) {
			const paymentIntentId =
				typeof session.payment_intent === "string"
					? session.payment_intent
					: session.payment_intent.id;
			paymentIntent = await stripe.paymentIntents.retrieve(paymentIntentId);

			if (paymentIntent.status === "succeeded") {
				order =
					(await orderDAO.markPaidByStripeSessionId(sessionId)) ??
					(await orderDAO.findBySessionIdForUser(sessionId, userId)) ??
					order;
				return getOrderStatus(order);
			}
		}

		const paymentFailed =
			paymentIntent?.status === "canceled" ||
			paymentIntent?.status === "requires_payment_method";
		if (session.status === "expired" && (!paymentIntent || paymentFailed)) {
			const deletedOrder = await orderDAO.deletePendingByStripeSessionId(
				sessionId,
				userId,
			);
			if (deletedOrder) return getOrderStatus(deletedOrder, "failed");

			const currentOrder = await orderDAO.findBySessionIdForUser(
				sessionId,
				userId,
			);
			return currentOrder
				? getOrderStatus(currentOrder)
				: getOrderStatus(order, "failed");
		}

		return getOrderStatus(order);
	}
}

const paymentService = new PaymentService();

export default paymentService;
