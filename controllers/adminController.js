import adminReportService from "../services/adminReportService.js";

class AdminController {
	async getSummary(req, res) {
		try {
			const summary = await adminReportService.getSummary();
			return res.status(200).json({ success: true, data: summary });
		} catch (error) {
			console.error("Failed to generate admin summary:", error);
			return res.status(500).json({
				success: false,
				message: "Failed to generate admin summary.",
			});
		}
	}
}

export default new AdminController();
