import mongoose from "mongoose";

const enquirySchema = new mongoose.Schema({
	userId: {
		type: mongoose.Schema.Types.ObjectId,
		ref: "User",
		required: true,
	},
	question: {
		type: String,
		required: true,
	},
	answer: {
		type: String,
		default: "Waiting for answer.",
	},
	createdAt: {
		type: Date,
		default: Date.now,
	},
});

const Enquiry = new mongoose.model("Enquiry", enquirySchema);

export default Enquiry;
