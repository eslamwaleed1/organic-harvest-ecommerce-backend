import orderService from "../services/orderService.js";

class OrderController {
    async getOrders(req, res) {
        try {
            const orders = await orderService.getOrders();
            return res.status(200).json(orders);
        } catch (error) {
            console.error("Failed to retrieve orders:", error);
            return res.status(500).json({ message: "Failed to retrieve orders." });
        }
    }

    async createOrder(req, res) {
        try {
            const { productData, totalAmount } = req.body ?? {};
            const userId = req.user?.id;
            const newOrder = await orderService.createOrder({
                userId,
                productData,
                totalAmount,
            });
            return res.status(201).json({
                order: newOrder,
                message: "Order created successfully!",
            });
        } catch (error) {
            console.error("Failed to create order:", error);
            return res
                .status(error.statusCode ?? 500)
                .json({ message: error.message || "Failed to create order." });
        }
    }

    async deleteOrder(req, res) {
        try {
            const deletedOrder = await orderService.deleteOrder(req.params.id);
            if (!deletedOrder) {
                return res.status(404).json({ message: "Order not found." });
            }
            return res.status(200).json({
                order: deletedOrder,
                message: "Order deleted successfully.",
            });
        } catch (error) {
            console.error("Failed to delete order:", error);
            return res
                .status(error.statusCode ?? 500)
                .json({ message: error.message || "Failed to delete order." });
        }
    }
}
const orderController = new OrderController()

export default orderController