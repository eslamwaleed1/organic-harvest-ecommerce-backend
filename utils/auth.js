import jwt from "jsonwebtoken"



export const authenticateAuthToken = (req, res, next) => {
	const token = req.cookies?.auth_token;

	if (!token) {
		return res
			.status(401)
			.json({ success: false, message: "Access denied. No token provided." });
	}
	

	try {
		if (!process.env.JWT_SECRET) {
			console.error("JWT_SECRET is not configured");
			return res.status(503).json({ success: false, message: "Authentication is unavailable" });
		}
		const verifiedUser = jwt.verify(token, process.env.JWT_SECRET);
		
		req.user = verifiedUser;
		next(); 
	} catch (error) {
		return res
			.status(403)
			.json({ success: false, message: "Invalid or expired token." });
	}
};

export const authenticateSignupToken = (req, res, next) => {
	const token = req.cookies?.signup_token
	if (!token) {
		return res
			.status(401)
			.json({ success: false, message: "Request denied, no signup token provided." });
	}

	try {
		if (!process.env.JWT_SECRET) {
			console.error("JWT_SECRET is not configured");
			return res.status(503).json({ success: false, message: "Authentication is unavailable" });
		}
		const data = jwt.verify(token, process.env.JWT_SECRET);
		req.userEmail = data.email;
		next()
	} catch (error) {
		return res
			.status(403)
			.json({ success: false, message: "Invalid or expired token." });
	}
}

export const requireAdmin = (req, res, next) => {
	if (req.user?.role !== "Admin") {
		return res.status(403).json({
			success: false,
			message: "Administrator access is required.",
		});
	}
	next();
};
