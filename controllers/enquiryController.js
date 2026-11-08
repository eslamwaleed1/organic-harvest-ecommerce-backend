import enquiryService from "../services/enquiryService.js";
import { sendError } from "../utils/helpers.js";

class EnquiryController {
	async create(req, res) {
		try {
			const enquiry = await enquiryService.create(
				req.user.id,
				req.body?.question,
			);
			return res.status(201).json({
				success: true,
				message: "Enquiry submitted successfully.",
				data: enquiry,
			});
		} catch (error) {
			return sendError(res, error, "Failed to submit enquiry.");
		}
	}

	async getMine(req, res) {
		try {
			if (req.query.userId !== undefined) {
				const enquiries = await enquiryService.getForRequestedUser(
					req.user,
					req.query.userId,
				);
				return res.status(200).json({ success: true, data: enquiries });
			}

			const enquiries = await enquiryService.getForUser(req.user.id);
			return res.status(200).json({ success: true, data: enquiries });
		} catch (error) {
			return sendError(res, error, "Failed to retrieve enquiries.");
		}
	}

	async getAll(req, res) {
		try {
			const enquiries = await enquiryService.getAll();
			return res.status(200).json({ success: true, data: enquiries });
		} catch (error) {
			return sendError(res, error, "Failed to retrieve enquiries.");
		}
	}

	async updateAnswer(req, res) {
		try {
			const enquiry = await enquiryService.answer(
				req.params.id,
				req.body?.answer,
			);
			return res.status(200).json({
				success: true,
				message: "Enquiry answer updated successfully.",
				data: enquiry,
			});
		} catch (error) {
			return sendError(res, error, "Failed to update enquiry answer.");
		}
	}
}

export default new EnquiryController();
