import suggestionDAO from "../daos/SuggestionDAO.js";

class SuggestionService {
	async create(text) {
		if (typeof text !== "string" || !text.trim()) {
			const error = new Error("Suggestion text is required.");
			error.statusCode = 400;
			throw error;
		}
		return suggestionDAO.create({ text: text.trim() });
	}

	async getAll() {
		return suggestionDAO.findAll();
	}
}

export default new SuggestionService();
