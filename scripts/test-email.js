import "dotenv/config"
import transporter from "../config/mailer.js";

async function main() {
	try {
		await transporter.verify();
		console.log("SUCCESS: Gmail SMTP authentication works.");
	} catch (error) {
		console.error("SMTP test failed:", error.message);
		process.exitCode = 1;
	}
}

main();
