import { userDAO } from "../daos/UserDAO.js";
import productDAO from "../daos/ProductDAO.js";
import orderDAO from "../daos/OrderDAO.js";
import enquiryDAO from "../daos/EnquiryDAO.js";
import suggestionDAO from "../daos/SuggestionDAO.js";

class AdminReportService {
	async getSummary() {
		const [users, products, orders, enquiries, suggestions] = await Promise.all([
			userDAO.getUsers(),
			productDAO.getProducts(),
			orderDAO.getAllOrders(),
			enquiryDAO.findAll(),
			suggestionDAO.findAll(),
		]);

		const paidOrders = orders.filter((order) => order.status === "paid");
		return {
			generatedAt: new Date(),
			users: {
				total: users.length,
				admins: users.filter((user) => user.role === "Admin").length,
				members: users.filter((user) => user.role === "Member").length,
			},
			products: {
				total: products.length,
				lowInventory: products.filter(
					(product) => product.inventory <= 5,
				).length,
				totalInventoryUnits: products.reduce(
					(total, product) => total + (product.inventory ?? 0),
					0,
				),
			},
			orders: {
				total: orders.length,
				paid: paidOrders.length,
				pending: orders.filter((order) => order.status === "pending").length,
				cancelled: orders.filter((order) => order.status === "cancelled").length,
				paidRevenue: paidOrders.reduce(
					(total, order) => total + order.totalAmount,
					0,
				),
			},
			feedback: {
				enquiries: enquiries.length,
				suggestions: suggestions.length,
				unansweredEnquiries: enquiries.filter(
					(enquiry) => enquiry.answer === "Waiting for answer.",
				).length,
			},
		};
	}
}

export default new AdminReportService();
