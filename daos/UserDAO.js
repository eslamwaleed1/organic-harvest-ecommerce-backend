import User from "../models/User.js";
import bcrypt from "bcrypt";

class UserDAO {
	async findByEmail(email) {
		return await User.findOne({ email });
	}

	async findByGoogleId(googleId) {
		return User.findOne({ googleId });
	}

	async findById(userId) {
		return User.findById(userId).select(
			"name email role address adminSecondaryEmail createdAt",
		);
	}

	async saveAdminInvitation(userId, tokenHash, expiresAt, secondaryEmail) {
		return User.findByIdAndUpdate(
			userId,
			{
				adminInvitationTokenHash: tokenHash,
				adminInvitationTokenExpiresAt: expiresAt,
				adminSecondaryEmail: secondaryEmail,
			},
			{ new: true },
		);
	}

	async findByAdminEmail(email) {
		return User.findOne({ email, role: "Admin" });
	}

	async completeAdminInvitation(email, rawToken, hashedPassword) {
		const user = await User.findOne({
			email,
			role: "Admin",
			adminInvitationTokenExpiresAt: { $gt: new Date() },
		});
		if (
			!user ||
			!user.adminInvitationTokenHash ||
			!(await bcrypt.compare(rawToken, user.adminInvitationTokenHash))
		) {
			return null;
		}
		user.hashedPassword = hashedPassword;
		user.isEmailVerified = true;
		user.adminInvitationTokenHash = undefined;
		user.adminInvitationTokenExpiresAt = undefined;
		user.adminSecondaryEmail = undefined;
		return user.save();
	}

	async createUser(userData) {
		const newUser = new User(userData);
		return await newUser.save();
	}

	async deleteById(userId) {
		return User.findByIdAndDelete(userId);
	}

	async updateTokenData(
		email,
		emailVerificationTokenHash,
		emailVerificationTokenExpiresAt,
	) {
		const user =  await User.findOneAndUpdate(
			{ email: email },
			{
				emailVerificationTokenHash: emailVerificationTokenHash,
				emailVerificationTokenExpiresAt: emailVerificationTokenExpiresAt,
			},
		);
		return user
	}

	async savePasswordResetToken(userId, tokenHash, expiresAt) {
		return User.findByIdAndUpdate(
			userId,
			{
				passwordResetTokenHash: tokenHash,
				passwordResetTokenExpiresAt: expiresAt,
			},
			{ new: true },
		);
	}

	async completePasswordReset(email, rawToken, hashedPassword) {
		const user = await User.findOne({
			email,
			passwordResetTokenExpiresAt: { $gt: new Date() },
		});
		if (
			!user ||
			!user.passwordResetTokenHash ||
			!(await bcrypt.compare(rawToken, user.passwordResetTokenHash))
		) {
			return null;
		}
		user.hashedPassword = hashedPassword;
		user.passwordResetTokenHash = undefined;
		user.passwordResetTokenExpiresAt = undefined;
		return user.save();
	}

	async updateUser(userId, updateData) {
		try {
			const { _id, id, email, googleId, hashedPassword, createdAt, updatedAt, ...sanitizedData } = updateData;

			const updatedUser = await User.findOneAndUpdate(
				{ _id: userId },
				{ $set: sanitizedData },
				{
					new: true,
					runValidators: true, 
				},
			)
				.lean() 
				.exec();

			return updatedUser;
		} catch (error) {
			console.error(`[ProductDAO] Error updating product ${userId}:`, error);
			throw error;
		}
	}

	async deleteUser(userData) {
		return await User.deleteOne({ _id: userData._id });
	}

	async getUsers() {
		return await User.find({});
	}
}

export const userDAO = new UserDAO();
