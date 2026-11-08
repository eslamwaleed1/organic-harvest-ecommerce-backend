import jwt from "jsonwebtoken";
import { userService } from "../services/userService.js";
import { capitalizeFirstLetter } from "../utils/helpers.js";
import {
	sendVerificationEmail,
	sendAdminInvitationEmail,
	sendPasswordResetEmail,
} from "../utils/emailSender.js";

class UserController {
	async signup(req, res) {
		try {
			const { name, email, password, address } = req.body ?? {};

			if (
				typeof name !== "string" ||
				name.trim().length === 0 ||
				typeof email !== "string" ||
				email.trim().length === 0 ||
				typeof password !== "string" ||
				password.length === 0
			) {
				return res.status(400).json({
					success: false,
					message: "Name, email, and password are required",
				});
			}

			const signupData = await userService.createNewUser({
				name: name.trim(),
				email: email.trim().toLowerCase(),
				password,
				address: typeof address === "string" ? address.trim() : undefined,
			});

			const newUser = signupData.user;
			const userVerificationToken = signupData.verificationToken;

			await sendVerificationEmail(newUser.email, userVerificationToken);

			const token = jwt.sign({ email: newUser.email }, process.env.JWT_SECRET, {
				expiresIn: "1h",
			});

			res.cookie("signup_token", token, {
				httpOnly: true,
				secure: process.env.NODE_ENV === "production",
				sameSite: "strict",
				maxAge: 3600000,
			});

			return res
				.status(201)
				.json({ message: "User created, waiting for verification" });
		} catch (error) {
			if (error.statusCode) {
				return res.status(error.statusCode).json({
					success: false,
					message: error.message,
				});
			}

			console.error("Signup failed:", error);
			return res.status(500).json({
				success: false,
				message: "Unable to complete signup",
			});
		}
	}

	async resendMagicLink(req, res) {
		try {
			const userEmail = req.userEmail;
			const result = await userService.regnerateVerificationToken(userEmail);

			await sendVerificationEmail(result.user.email, result.verificationToken);
			res.clearCookie("signup_token");

			const token = jwt.sign({ email: userEmail }, process.env.JWT_SECRET, {
				expiresIn: "1h",
			});

			res.cookie("signup_token", token, {
				httpOnly: true,
				secure: process.env.NODE_ENV === "production",
				sameSite: "strict",
				maxAge: 3600000,
			});
			return res.status(200).json({message: "Email sent successfully"})
		} catch (error) {
			return res.status(400).json({
				success: false,
				message: error.message,
			});
		}
	}

	async verifyEmail(req, res) {
		try {
			const token = req.body.token;
			const user = await userService.verifyUser(token);

			return res.status(200).json({
				success: true,
				message: "User verified successfully",
				data: {
					id: user._id,
					email: user.email,
					role: user.role,
					createdAt: user.createdAt,
				},
			});
		} catch (error) {
			return res.status(400).json({
				success: false,
				message: error.message,
			});
		}
	}

	async login(req, res) {
		try {
			const { email, password } = req.body ?? {};

			if (
				typeof email !== "string" ||
				email.trim().length === 0 ||
				typeof password !== "string" ||
				password.length === 0
			) {
				return res.status(400).json({
					success: false,
					message: "Email and password are required",
				});
			}

			const user = await userService.getUser({ email, password });

			if (!user.isEmailVerified) {
				const verification = await userService.regnerateVerificationToken(user.email);
				await sendVerificationEmail(verification.user.email, verification.verificationToken);
				const token = jwt.sign({ email: user.email }, process.env.JWT_SECRET, { expiresIn: "1h" });
				res.cookie("signup_token", token, {
					httpOnly: true,
					secure: process.env.NODE_ENV === "production",
					sameSite: "strict",
					maxAge: 3600000,
				});
				return res.status(200).json({
					success: false,
					code: "EMAIL_NOT_VERIFIED",
					message: "Your account has not been verified yet. We sent you a new verification email.",
				});
			}

			const token = jwt.sign(
				{ id: user._id, email: user.email, role: user.role },
				process.env.JWT_SECRET,
				{ expiresIn: "1h" },
			);

			res.cookie("auth_token", token, {
				httpOnly: true,
				secure: process.env.NODE_ENV === "production",
				sameSite: "strict",
				maxAge: 3600000,
			});

			res.cookie("is_logged_in", "true", {
				secure: process.env.NODE_ENV === "production",
				sameSite: "strict",
				maxAge: 3600000,
			});

			res.cookie(
				"user_data",
				JSON.stringify({
					name: user.name,
					email: user.email,
					role: user.role,
					address: user.address ?? null,
				}),
				{
					secure: process.env.NODE_ENV === "production",
					sameSite: "strict",
					maxAge: 3600000,
				},
			);

			return res.status(200).json({
				success: true,
				message: `${capitalizeFirstLetter(user.role)} logged in successfully`,
				data: {
					id: user._id,
					email: user.email,
					role: user.role,
					createdAt: user.createdAt,
				},
			});
		} catch (error) {
			if (error.code === "GOOGLE_SIGN_IN_REQUIRED") {
				return res.status(400).json({
					success: false,
					code: error.code,
					message: error.message,
				});
			}

			if (error.statusCode) {
				return res.status(error.statusCode).json({
					success: false,
					message: error.message,
				});
			}

			console.error("Login failed:", error);
			return res.status(500).json({
				success: false,
				message: "Unable to sign in",
			});
		}
	}

	async forgotPassword(req, res) {
		try {
			const { email } = req.body ?? {};
			if (typeof email !== "string" || !email.trim()) {
				return res.status(400).json({ success: false, message: "Email is required" });
			}
			const reset = await userService.requestPasswordReset(email);
			if (reset?.deliveryEmail) {
				await sendPasswordResetEmail(reset.deliveryEmail, reset.token, reset.user.email);
			}
			return res.status(200).json({
				success: true,
				message: "If an account exists for that email, a password reset email has been sent.",
			});
		} catch (error) {
			console.error("Forgot password failed:", error);
			return res.status(500).json({ success: false, message: "Unable to send password reset email" });
		}
	}

	async requestPasswordChange(req, res) {
		try {
			const reset = await userService.changePassword(req.user.id);
			await sendPasswordResetEmail(reset.deliveryEmail, reset.token, reset.user.email);
			return res.status(200).json({ success: true, message: "A password change email has been sent." });
		} catch (error) {
			return res.status(error.statusCode ?? 500).json({
				success: false,
				message: error.statusCode ? error.message : "Unable to send password change email",
			});
		}
	}

	async resetPassword(req, res) {
		try {
			const { email, token, password } = req.body ?? {};
			if (
				typeof email !== "string" ||
				typeof token !== "string" ||
				!email.trim() ||
				!token.trim()
			) {
				return res.status(400).json({
					success: false,
					message: "Email and password reset token are required.",
				});
			}
			const user = await userService.resetPassword(email, token, password);
			return res.status(200).json({
				success: true,
				message: "Password changed successfully. You can now log in.",
				data: { id: user._id, email: user.email },
			});
		} catch (error) {
			return res.status(error.statusCode ?? 500).json({
				success: false,
				message: error.statusCode ? error.message : "Unable to change password",
			});
		}
	}

	async me(req, res) {
		try {
			const profile = await userService.getProfile(req.user.id);
			return res.status(200).json({ success: true, data: profile });
		} catch (error) {
			console.error("Failed to retrieve current session:", error);
			return res.status(error.statusCode ?? 500).json({
				success: false,
				message: error.statusCode ? error.message : "Unable to retrieve session",
			});
		}
	}

	async googleLogin(req, res, next) {
		try {
			const { credential } = req.body;

			if (!credential) {
				return res.status(400).json({
					success: false,
					message: "Google credential is required",
				});
			}

			const user = await userService.getOrCreateGoogleUser(credential);

			const token = jwt.sign(
				{
					id: user._id,
					email: user.email,
					role: user.role,
				},
				process.env.JWT_SECRET,
				{ expiresIn: "1h" },
			);

			res.cookie("auth_token", token, {
				httpOnly: true,
				secure: process.env.NODE_ENV === "production",
				sameSite: "strict",
				maxAge: 3600000,
			});

			res.cookie("is_logged_in", "true", {
				secure: process.env.NODE_ENV === "production",
				sameSite: "strict",
				maxAge: 3600000,
			});

			res.cookie(
				"user_data",
				JSON.stringify({
					name: user.name,
					email: user.email,
					role: user.role,
					address: user.address ?? null,
				}),
				{
					secure: process.env.NODE_ENV === "production",
					sameSite: "strict",
					maxAge: 3600000,
				},
			);

			return res.status(200).json({
				success: true,
				message: "Google sign-in successful",
				data: {
					id: user._id,
					email: user.email,
					role: user.role,
					createdAt: user.createdAt,
				},
			});
		} catch (error) {
			if (error.statusCode) {
				return res.status(error.statusCode).json({
					success: false,
					code: error.code,
					message: error.message,
				});
			}

			next(error);
		}
	}

	async inviteAdmin(req, res) {
		let invitation;
		try {
			const { name, email, secondaryEmail } = req.body ?? {};
			invitation = await userService.createAdminInvitation({
				name,
				email,
				secondaryEmail,
			});
			await sendAdminInvitationEmail(
				secondaryEmail.trim().toLowerCase(),
				email.trim().toLowerCase(),
				invitation.invitationToken,
			);
			return res.status(201).json({
				success: true,
				message: "Admin invitation sent successfully.",
				data: {
					id: invitation.admin._id,
					name: invitation.admin.name,
					email: invitation.admin.email,
					role: invitation.admin.role,
					invitationExpiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
				},
			});
		} catch (error) {
			if (error.statusCode) {
				return res.status(error.statusCode).json({
					success: false,
					message: error.message,
				});
			}
			if (invitation?.admin?._id) {
				try {
					await userService.deletePendingAdmin(invitation.admin._id);
				} catch (cleanupError) {
					console.error("Failed to clean up admin invitation:", cleanupError);
				}
			}
			console.error("Admin invitation failed:", error);
			return res.status(500).json({
				success: false,
				message: "Unable to send admin invitation.",
			});
		}
	}

	async setAdminPassword(req, res) {
		try {
			const { email, token, password } = req.body ?? {};
			if (
				typeof email !== "string" ||
				typeof token !== "string" ||
				!email.trim() ||
				!token.trim()
			) {
				return res.status(400).json({
					success: false,
					message: "Email and invitation token are required.",
				});
			}
			const admin = await userService.setAdminPassword(email, token, password);
			return res.status(200).json({
				success: true,
				message: "Admin password created successfully. You can now log in.",
				data: {
					id: admin._id,
					email: admin.email,
					role: admin.role,
				},
			});
		} catch (error) {
			if (error.statusCode) {
				return res.status(error.statusCode).json({
					success: false,
					message: error.message,
				});
			}
			console.error("Admin password setup failed:", error);
			return res.status(500).json({
				success: false,
				message: "Unable to set admin password.",
			});
		}
	}

	logout(req, res) {
		res.clearCookie("auth_token");
		res.clearCookie("is_logged_in");
		res.clearCookie("user_data");
		return res.json({ success: true, message: "Logged out successfully." });
	}

	async getUsers(req, res) {
		try {
			const users = await userService.getUsers();
			const requester = req.user;
			const result = {
				users,
				requester,
			};
			return res.status(200).json(result);
		} catch (error) {
			console.error("Failed to retrieve users:", error);
			return res.status(500).json({
				success: false,
				message: "Failed to retrieve users",
			});
		}
	}

	async getProfile(req, res) {
		try {
			const profile = await userService.getProfile(req.user.id);
			return res.status(200).json({ success: true, data: profile });
		} catch (error) {
			console.error("Failed to retrieve profile:", error);
			return res.status(error.statusCode ?? 500).json({
				success: false,
				message: error.statusCode ? error.message : "Failed to retrieve profile",
			});
		}
	}

	async updateProfile(req, res) {
			try {
				const { name, address } = req.body ?? {};
				if (
					(name !== undefined && (typeof name !== "string" || !name.trim())) ||
					(address !== undefined && typeof address !== "string")
				) {
					return res.status(400).json({
						success: false,
						message: "Name must be non-empty and address must be text",
					});
				}

				const profile = await userService.updateProfile(req.user.id, {
					...(name !== undefined ? { name: name.trim() } : {}),
					...(address !== undefined ? { address: address.trim() } : {}),
				});
				return res.status(200).json({ success: true, data: profile });
			} catch (error) {
				console.error("Failed to update profile:", error);
				return res.status(error.statusCode ?? 500).json({
					success: false,
					message: error.statusCode ? error.message : "Failed to update profile",
				});
			}
		}

	async deleteUser(req, res) {}

	async createAdmin(req, res) {
		try {
			const { name, email, password } = req.body;
			const newAdmin = await userService.createNewAdmin({
				name,
				email,
				password,
			});

			return res.status(201).json({
				message: `Admin ${capitalizeFirstLetter(newAdmin.name)} created successfully`,
				Admin: newAdmin,
			});
		} catch (error) {
			return res.status(500).json({ error: error.message });
		}
	}

	async getUserOrders(req, res) {
		try {
			const userId = req.user.id || req.params.id
			const userOrders = await userService.getUserOrders(userId)
			return res.status(200).json(userOrders)
		}
		catch (error) {
			console.error("Failed to retrieve user orders:", error);
			return res.status(500).json({ success: false, message: "Failed to retrieve user orders" })
		}
	}
}

export const userController = new UserController();
