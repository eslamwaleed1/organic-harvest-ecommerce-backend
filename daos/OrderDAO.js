import Order from "../models/Order.js";
import { validateId } from "./helperDAO.js";

class OrderDAO {
	async createOrder(orderData, { session } = {}) {
		if (!validateId(orderData.userId)) {
			throw new Error("Invalid user ID.");
		}
		const newOrder = new Order(orderData);
		return newOrder.save({ session });
	}

	async getOrdersByUserId(userId, { session } = {}) {
		return Order.find({ userId }).session(session ?? null);
	}

	async getOrderById(orderId, { session } = {}) {
		return Order.findById(orderId).session(session ?? null);
	}

	async getAllOrders({ session } = {}) {
		return Order.find({}).session(session ?? null);
	}

	async deleteOrder(orderId, { session } = {}) {
		return Order.findByIdAndDelete(orderId, { session });
	}

	async getOrdersByUserId(userId) {
		const orders = await Order.find({ userId }).populate({
			path: "productData.productId",
			select: "name",
		});
		return orders;
	}

	async countOrdersByUserId(userId) {
		return Order.countDocuments({ userId });
	}

	async findByStripeSessionId(sessionId) {
		return Order.findOne({
			stripeCheckoutSessionId: sessionId,
		});
	}

	async setStripeSessionId(orderId, sessionId) {
		return Order.findByIdAndUpdate(
			orderId,
			{ stripeCheckoutSessionId: sessionId },
			{ returnDocument: "after", runValidators: true },
		);
	}

	async markPaidByStripeSessionId(sessionId) {
		return Order.findOneAndUpdate(
			{
				stripeCheckoutSessionId: sessionId,
				status: "pending",
			},
			{ status: "paid" },
			{ returnDocument: "after" },
		);
	}

	async markCancelledByStripeSessionId(sessionId) {
		return Order.findOneAndUpdate(
			{
				stripeCheckoutSessionId: sessionId,
				status: "pending",
			},
			{ status: "cancelled" },
			{ returnDocument: "after" },
		);
	}

	async findBySessionIdForUser(sessionId, userId) {
		return Order.findOne({
			stripeCheckoutSessionId: sessionId,
			userId: userId,
		}).select("_id status totalAmount currency createdAt");
	}
}

const orderDAO = new OrderDAO();

export default orderDAO;
