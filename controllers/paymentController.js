import paymentService from "../services/paymentService.js";
import orderService from "../services/orderService.js";
import { getStripeClient } from "../services/paymentService.js";

class PaymentController {
	async createCheckoutSession(req, res, next) {
		try {
			const userId = req.user?.id ?? req.user?._id;

			if (!userId) {
				return res.status(401).json({
					success: false,
					message: "Please log in before checkout",
				});
			}

			const result = await paymentService.createCheckoutSession({
				userId,
				cartItems: req.body.cartItems,
			});

			return res.status(201).json({
				success: true,
				data: result,
			});
		} catch (error) {
			if (error.statusCode) {
				return res.status(error.statusCode).json({
					success: false,
					message: error.message,
				});
			}

			next(error);
		}
	}

	async webhook(req, res) {
		const signature = req.headers["stripe-signature"];
		const stripe = getStripeClient();

		if (!stripe || !process.env.STRIPE_WEBHOOK_SECRET) {
			return res.status(503).json({
				received: false,
				message: "Stripe webhooks are not configured",
			});
		}

		let event;

		try {
			event = stripe.webhooks.constructEvent(
				req.body,
				signature,
				process.env.STRIPE_WEBHOOK_SECRET,
			);
		} catch (error) {
			console.error("Stripe webhook signature verification failed");
			return res.status(400).send("Invalid webhook signature");
		}

		try {
			const session = event.data.object;

			if (
				event.type === "checkout.session.completed" ||
				event.type === "checkout.session.async_payment_succeeded"
			) {
				if (session.payment_status === "paid") {
						await orderService.markPaidByStripeSessionId(session.id);
					}
			}

			if (event.type === "checkout.session.expired") {
				await orderService.markCancelledByStripeSessionId(session.id);
			}

			return res.status(200).json({ received: true });
		} catch (error) {
			console.error("Failed to process Stripe webhook:", error);
			// A 5xx response lets Stripe retry the event.
			return res.status(500).json({
				received: false,
			});
		}
	}

	async getCheckoutOrderStatus(req, res, next) {
		try {
			const userId = req.user?.id ?? req.user?._id;

			if (!userId) {
				return res.status(401).json({
					success: false,
					message: "Please log in to view your order",
				});
			}

			const data = await paymentService.getCheckoutOrderStatus({
				sessionId: req.params.sessionId,
				userId,
			});

			return res.status(200).json({
				success: true,
				data,
			});
		} catch (error) {
			if (error.statusCode) {
				return res.status(error.statusCode).json({
					success: false,
					message: error.message,
				});
			}

			next(error);
		}
	}
}

const paymentController = new PaymentController();

export default paymentController;
