import suggestionService from "../services/suggestionService.js";

const sendError = (res, error, fallbackMessage) => {
	console.error(`${fallbackMessage}:`, error);
	return res.status(error.statusCode ?? 500).json({
		success: false,
		message: error.statusCode ? error.message : fallbackMessage,
	});
};

class SuggestionController {
	async create(req, res) {
		try {
			const suggestion = await suggestionService.create(req.body?.text);
			return res.status(201).json({
				success: true,
				message: "Suggestion submitted successfully.",
				data: suggestion,
			});
		} catch (error) {
			return sendError(res, error, "Failed to submit suggestion.");
		}
	}

	async getAll(req, res) {
		try {
			const suggestions = await suggestionService.getAll();
			return res.status(200).json({ success: true, data: suggestions });
		} catch (error) {
			return sendError(res, error, "Failed to retrieve suggestions.");
		}
	}
}

export default new SuggestionController();
