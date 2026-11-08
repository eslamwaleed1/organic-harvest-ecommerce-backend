import "dotenv/config";
import transporter from "../config/mailer.js";

async function main() {
	try {
		const info = await transporter.sendMail({
			from: `"Organic Harvest App " <${process.env.SMTP_USER}>`,
			to: process.env.SMTP_USER,
			subject: "MERN email verification test",
			text: "Success! Your Express backend can send email through Gmail.",
			html: `
        <h2>Email delivery works!</h2>
        <p>Your MERN backend can now send email through Gmail.</p>
      `,
		});

		console.log("Email accepted by SMTP server.");
		console.log("Message ID:", info.messageId);
	} catch (error) {
		console.error("Email sending failed:", error.message);
		process.exitCode = 1;
	}
}

main();
