import Enquiry from "../models/Enquiry.js";

class EnquiryDAO {
	async create(enquiryData) {
		return Enquiry.create(enquiryData);
	}

	async findByUserId(userId) {
		return Enquiry.find({ userId }).sort({ createdAt: -1 });
	}

	async findAll() {
		return Enquiry.find({})
			.populate("userId", "name email")
			.sort({ createdAt: -1 });
	}

	async updateAnswer(enquiryId, answer) {
		return Enquiry.findByIdAndUpdate(
			enquiryId,
			{ $set: { answer } },
			{ new: true, runValidators: true },
		);
	}
}

export default new EnquiryDAO();
