import nodemailer from "nodemailer";

const transporter = nodemailer.createTransport({
	service: "gmail",
	auth: {
		user: process.env.SMTP_USER,
		pass: process.env.SMTP_PASS,
	},
});

export default transporter
/*This creates a reusable SMTP transporter. Nodemailer uses Gmail's predefined SMTP settings, including TLS on port 465. 
*/