import mongoose from "mongoose";

const userSchema = new mongoose.Schema({
	name: {
		type: String,
		required: true,
	},
	role: {
		type: String,
		enum: ["Admin", "Member"],
		default: "Member",
	},
	email: {
		type: String,
		required: true,
		unique: true,
		trim: true,
		lowercase: true,
	},
	address: {
		type: String,
		trim: true,
	},
	hashedPassword: {
		type: String,
	},
	isEmailVerified: {
		type: Boolean,
	},
	emailVerificationTokenHash: {
		type: String,
	},
	emailVerificationTokenExpiresAt: {
		type: Date,
	},
	passwordResetTokenHash: {
		type: String,
	},
	passwordResetTokenExpiresAt: {
		type: Date,
	},
	adminInvitationTokenHash: {
		type: String,
	},
	adminInvitationTokenExpiresAt: {
		type: Date,
	},
	adminSecondaryEmail: {
		type: String,
		trim: true,
		lowercase: true,
	},
	googleId: {
		type: String,
		unique: true,
		sparse: true,
	},
	createdAt: {
		type: Date,
		default: Date.now,
	},
});

const User = new mongoose.model("User", userSchema);

export default User;
