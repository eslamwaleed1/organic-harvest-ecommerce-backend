import { userDAO } from "../daos/UserDAO.js";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import { OAuth2Client } from "google-auth-library";
import orderService from "./orderService.js";

const googleClient = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);

class UserService {
	async createNewUser(userData) {
		if (/@organicharvest\.com$/i.test(userData.email)) {
			const error = new Error("Organic Harvest email addresses are reserved for administrators");
			error.statusCode = 400;
			throw error;
		}
		const existingUser = await userDAO.findByEmail(userData.email);

		if (existingUser) {
			const error = new Error("Email is already registered");
			error.statusCode = 409;
			throw error;
		}

		const salt = await bcrypt.genSalt(10);
		const hashedPassword = await bcrypt.hash(userData.password, salt);

		const verificationToken = jwt.sign(
			{
				name: userData.name,
				email: userData.email,
				address: userData.address,
			},
			process.env.JWT_SECRET,
			{ expiresIn: "6h" },
		);
		const emailVerificationTokenHash = await bcrypt.hash(
			verificationToken,
			salt,
		);

		const emailVerificationTokenExpiresAt = new Date(
			Date.now() + 6 * 60 * 60 * 1000,
		);

		const finalUserData = {
			name: userData.name,
			email: userData.email,
			role: "Member",
			hashedPassword: hashedPassword,
			isEmailVerified: false,
			address: userData.address,
			emailVerificationTokenHash: emailVerificationTokenHash,
			emailVerificationTokenExpiresAt: emailVerificationTokenExpiresAt,
		};
		const finalUser = await userDAO.createUser(finalUserData);
		return {
			user: finalUser,
			verificationToken: verificationToken,
		};
	}

	async regnerateVerificationToken(userEmail) {
		const user = await userDAO.findByEmail(userEmail);

		if (!user) {
			throw new Error("User not found.");
		}
		
		const verificationToken = jwt.sign(
			{
				name: user.name,
				email: user.email,
			},
			process.env.JWT_SECRET,
			{ expiresIn: "6h" },
		);
		
		const salt = await bcrypt.genSalt(10);
		const emailVerificationTokenHash = await bcrypt.hash(
			verificationToken,
			salt,
		);

		const emailVerificationTokenExpiresAt = new Date(
			Date.now() + 6 * 60 * 60 * 1000,
		);

		const updatedUser = await userDAO.updateTokenData(userEmail, emailVerificationTokenHash, emailVerificationTokenExpiresAt)
		return {
			user: updatedUser,
			verificationToken: verificationToken,
		};
	}

	async verifyUser(token) {
		let payload;

		try {
			payload = jwt.verify(token, process.env.JWT_SECRET);
		} catch {
			throw new Error("Invalid or expired verification token");
		}

		if (!payload.email) {
			throw new Error("Invalid verification token");
		}

		const user = await userDAO.findByEmail(payload.email);

		if (!user) {
			throw new Error("User not found");
		}

		if (user.isEmailVerified) {
			return {
				success: true,
				message: "Email has already been verified.",
			};
		}

		if (
			!user.emailVerificationTokenHash ||
			!user.emailVerificationTokenExpiresAt
		) {
			throw new Error("No active verification token");
		}

		if (user.emailVerificationTokenExpiresAt <= new Date()) {
			throw new Error("Verification token has expired");
		}

		const tokenMatches = await bcrypt.compare(
			token,
			user.emailVerificationTokenHash,
		);

		if (!tokenMatches) {
			throw new Error("Invalid verification token");
		}

		user.isEmailVerified = true;
		user.emailVerificationTokenHash = undefined;
		user.emailVerificationTokenExpiresAt = undefined;

		await user.save();

		return user;
	}

	async getOrCreateGoogleUser(idToken) {
		if (!process.env.GOOGLE_CLIENT_ID) {
			throw new Error("Google authentication is not configured");
		}

		const ticket = await googleClient.verifyIdToken({
			idToken,
			audience: process.env.GOOGLE_CLIENT_ID,
		});

		const payload = ticket.getPayload();

		if (
			!payload ||
			!payload.sub ||
			!payload.email ||
			payload.email_verified !== true
		) {
			const error = new Error("Google account could not be verified");
			error.statusCode = 401;
			throw error;
		}

		const googleId = payload.sub;
		const email = payload.email.toLowerCase();

		if (/@organicharvest\.com$/i.test(email)) {
			const error = new Error("Organic Harvest email addresses are reserved for administrators");
			error.statusCode = 400;
			throw error;
		}

		let user = await userDAO.findByGoogleId(googleId);
		
		if (user) {
			return user;
		}
		
		const existingUser = await userDAO.findByEmail(email);

		if (existingUser) {
			const error = new Error(
				"An account already exists with this email. Please sign in using your existing method.",
			);
			error.statusCode = 409;
			error.code = "ACCOUNT_EXISTS";
			throw error;
		}

		user = await userDAO.createUser({
			name: payload.name || email.split("@")[0],
			email,
			googleId,
			role: "Member",
			isEmailVerified: true,
		});

		return user;
	}

	async createNewAdmin(userData) {
		const normalizedEmail = userData.email.trim().toLowerCase();
		const existingUser = await userDAO.findByEmail(normalizedEmail);

		if (existingUser) {
			const error = new Error("Admin email is already registered");
			error.statusCode = 409;
			throw error;
		}

		const finalUserData = {
			name: userData.name.trim(),
			email: normalizedEmail,
			role: "Admin",
			isEmailVerified: false,
		};
		return await userDAO.createUser(finalUserData);
	}

	async createAdminInvitation({ name, email, secondaryEmail }) {
		if (!process.env.JWT_SECRET) {
			const error = new Error("Authentication is not configured");
			error.statusCode = 503;
			throw error;
		}
		if (!/^[^\s@]+@organicharvest\.com$/i.test(email)) {
			const error = new Error("Admin email must end with @organicharvest.com");
			error.statusCode = 400;
			throw error;
		}
		if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(secondaryEmail)) {
			const error = new Error("A valid secondary email is required");
			error.statusCode = 400;
			throw error;
		}
		if (typeof name !== "string" || !name.trim()) {
			const error = new Error("Admin name is required");
			error.statusCode = 400;
			throw error;
		}

		const normalizedEmail = email.trim().toLowerCase();
		if (await userDAO.findByEmail(normalizedEmail)) {
			const error = new Error("Admin email is already registered");
			error.statusCode = 409;
			throw error;
		}

		const admin = await this.createNewAdmin({
			name,
			email: normalizedEmail,
		});
		const rawToken = jwt.sign(
			{ email: normalizedEmail, purpose: "admin-invitation" },
			process.env.JWT_SECRET,
			{ expiresIn: "24h" },
		);
		const tokenHash = await bcrypt.hash(rawToken, await bcrypt.genSalt(10));
		await userDAO.saveAdminInvitation(
			admin._id,
			tokenHash,
			new Date(Date.now() + 24 * 60 * 60 * 1000),
			secondaryEmail.trim().toLowerCase(),
		);

		return { admin, invitationToken: rawToken, secondaryEmail };
	}

	async setAdminPassword(email, rawToken, password) {
		if (typeof password !== "string" || password.length < 8) {
			const error = new Error("Password must be at least 8 characters");
			error.statusCode = 400;
			throw error;
		}

		let payload;
		try {
			payload = jwt.verify(rawToken, process.env.JWT_SECRET);
		} catch {
			const error = new Error("Invalid or expired admin invitation");
			error.statusCode = 400;
			throw error;
		}
		if (
			payload.purpose !== "admin-invitation" ||
			payload.email !== email.trim().toLowerCase()
		) {
			const error = new Error("Invalid admin invitation");
			error.statusCode = 400;
			throw error;
		}

		const hashedPassword = await bcrypt.hash(password, await bcrypt.genSalt(10));
		const admin = await userDAO.completeAdminInvitation(
			payload.email,
			rawToken,
			hashedPassword,
		);
		if (!admin) {
			const error = new Error("Invalid or expired admin invitation");
			error.statusCode = 400;
			throw error;
		}
		return admin;
	}

	async deletePendingAdmin(userId) {
		return userDAO.deleteById(userId);
	}

	async getUsers() {
		return userDAO.getUsers();
	}

	async getUser(userData) {
		const user = await userDAO.findByEmail(userData.email);

		if (!user) {
			const error = new Error("Invalid email or password");
			error.statusCode = 401;
			throw error;
		}

		if (!user.hashedPassword && user.googleId) {
			const error = new Error(
				"This account uses Google sign-in. Please continue with Google.",
			);
			error.statusCode = 400;
			error.code = "GOOGLE_SIGN_IN_REQUIRED";
			throw error;
		}

		if (!user.hashedPassword) {
			const error = new Error("Invalid email or password");
			error.statusCode = 401;
			throw error;
		}

		const isPasswordMatch = await bcrypt.compare(
			userData.password,
			user.hashedPassword,
		);

		if (!isPasswordMatch) {
			const error = new Error("Invalid email or password");
			error.statusCode = 401;
			throw error;
		}

		return user;
	}

	async requestPasswordReset(email) {
		const user = await userDAO.findByEmail(email.trim().toLowerCase());
		if (!user) return;

		const rawToken = jwt.sign(
			{ email: user.email, purpose: "password-reset" },
			process.env.JWT_SECRET,
			{ expiresIn: "1h" },
		);
		const tokenHash = await bcrypt.hash(rawToken, await bcrypt.genSalt(10));
		await userDAO.savePasswordResetToken(
			user._id,
			tokenHash,
			new Date(Date.now() + 60 * 60 * 1000),
		);
		return {
			user,
			token: rawToken,
			deliveryEmail: user.role === "Admin"
				? user.adminSecondaryEmail
				: user.email,
		};
	}

	async changePassword(userId) {
		const user = await userDAO.findById(userId);
		if (!user) {
			const error = new Error("User not found");
			error.statusCode = 404;
			throw error;
		}
		const deliveryEmail = user.role === "Admin" ? user.adminSecondaryEmail : user.email;
		if (!deliveryEmail) {
			const error = new Error("No password recovery email is configured for this account");
			error.statusCode = 400;
			throw error;
		}
		const reset = await this.requestPasswordReset(user.email);
		return { ...reset, deliveryEmail };
	}

	async resetPassword(email, rawToken, password) {
		if (typeof password !== "string" || password.length < 8) {
			const error = new Error("Password must be at least 8 characters");
			error.statusCode = 400;
			throw error;
		}
		let payload;
		try {
			payload = jwt.verify(rawToken, process.env.JWT_SECRET);
		} catch {
			const error = new Error("Invalid or expired password reset link");
			error.statusCode = 400;
			throw error;
		}
		if (
			payload.purpose !== "password-reset" ||
			payload.email !== email.trim().toLowerCase()
		) {
			const error = new Error("Invalid password reset link");
			error.statusCode = 400;
			throw error;
		}
		const hashedPassword = await bcrypt.hash(password, await bcrypt.genSalt(10));
		const user = await userDAO.completePasswordReset(
			payload.email,
			rawToken,
			hashedPassword,
		);
		if (!user) {
			const error = new Error("Invalid or expired password reset link");
			error.statusCode = 400;
			throw error;
		}
		return user;
	}

	async checkIfRegistered(email) {
		try {
			const user = await userDAO.findByEmail(email);
			return user ? true : false;
		} catch (error) {
			console.error(error);
		}
	}

	async deleteUser(userData) {
		try {
			await userDAO.deleteUser(userData);
		} catch (error) {
			console.error(error);
		}
	}

	async getUserOrders(userId) {
		return await orderService.getOrdersByUserId(userId)
	}

	async getProfile(userId) {
		const user = await userDAO.findById(userId);
		if (!user) {
			const error = new Error("User not found");
			error.statusCode = 404;
			throw error;
		}

		const orderCount = await orderService.countOrdersByUserId(userId);
		return {
			id: user._id,
			name: user.name,
			email: user.email,
			role: user.role,
			address: user.address ?? null,
			orderCount,
			dateJoined: user.createdAt,
		};
	}

	async updateProfile(userId, updateData) {
		const updatedUser = await userDAO.updateUser(userId, updateData);
		if (!updatedUser) {
			const error = new Error("User not found");
			error.statusCode = 404;
			throw error;
		}

		return this.getProfile(userId);
	}
}

export const userService = new UserService();
