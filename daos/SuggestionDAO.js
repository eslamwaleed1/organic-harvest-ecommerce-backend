import Suggestion from "../models/Suggestion.js";

class SuggestionDAO {
	async create(suggestionData) {
		return Suggestion.create(suggestionData);
	}

	async findAll() {
		return Suggestion.find({}).sort({ createdAt: -1 });
	}
}

export default new SuggestionDAO();
