import { validateId } from "../daos/helperDAO.js";
import enquiryDAO from "../daos/EnquiryDAO.js";

const validationError = (message) => {
	const error = new Error(message);
	error.statusCode = 400;
	return error;
};

class EnquiryService {
	async create(userId, question) {
		if (!validateId(userId)) {
			throw validationError("A valid user is required.");
		}
		if (typeof question !== "string" || !question.trim()) {
			throw validationError("Question is required.");
		}

		return enquiryDAO.create({
			userId,
			question: question.trim(),
		});
	}

	async getForUser(userId) {
		if (!validateId(userId)) {
			throw validationError("A valid user is required.");
		}
		return enquiryDAO.findByUserId(userId);
	}

	async getForRequestedUser(requester, requestedUserId) {
		if (requester?.role !== "Admin") {
			const error = new Error("Administrator access is required.");
			error.statusCode = 403;
			throw error;
		}
		return this.getForUser(requestedUserId);
	}

	async getAll() {
		return enquiryDAO.findAll();
	}

	async answer(enquiryId, answer) {
		if (!validateId(enquiryId)) {
			throw validationError("A valid enquiry ID is required.");
		}
		if (typeof answer !== "string" || !answer.trim()) {
			throw validationError("Answer is required.");
		}

		const enquiry = await enquiryDAO.updateAnswer(enquiryId, answer.trim());
		if (!enquiry) {
			const error = new Error("Enquiry not found.");
			error.statusCode = 404;
			throw error;
		}
		return enquiry;
	}
}

export default new EnquiryService();
