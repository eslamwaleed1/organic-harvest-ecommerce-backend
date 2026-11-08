import transporter from "../config/mailer.js";

export async function sendVerificationEmail(email, rawToken) {
    const verificationUrl = new URL(
        "/verify-email",
        process.env.FRONTEND_URL
    );

    verificationUrl.searchParams.set("token", rawToken);

    await transporter.sendMail({
        from: `"Organic Harvest App" <${process.env.SMTP_USER}>`,
        to: email,
        subject: "Verify your email address",
        text: [
            "Welcome!",
            "",
            "Please verify your email address using this link:",
            verificationUrl.toString(),
            "",
            "If you did not create this account, you can ignore this email."
        ].join("\n"),
        html: `
            <h2>Verify your email address</h2>
            <p>Thanks for signing up!</p>
            <p>
                <a href="${verificationUrl.toString()}">
                    Verify my email
                </a>
            </p>
            <p>If you did not create this account, you can ignore this email.</p>
        `
    });
}

export async function sendAdminInvitationEmail(
	secondaryEmail,
	adminEmail,
	rawToken,
) {
	const invitationUrl = new URL("/admin/set-password", process.env.FRONTEND_URL);
	invitationUrl.searchParams.set("email", adminEmail);
	invitationUrl.searchParams.set("token", rawToken);

	await transporter.sendMail({
		from: `"Organic Harvest App" <${process.env.SMTP_USER}>`,
		to: secondaryEmail,
		subject: "Organic Harvest administrator invitation",
		text: [
			"You have been invited to become an Organic Harvest administrator.",
			"",
			"Use this link to set your password:",
			invitationUrl.toString(),
			"",
			"This link expires in 24 hours.",
		].join("\n"),
		html: `
			<h2>Organic Harvest administrator invitation</h2>
			<p>Use the link below to set your administrator password:</p>
			<p><a href="${invitationUrl.toString()}">Set administrator password</a></p>
			<p>This link expires in 24 hours.</p>
		`,
	});
}

export async function sendPasswordResetEmail(email, rawToken, accountEmail = email) {
	const resetUrl = new URL("/reset-password", process.env.FRONTEND_URL);
	resetUrl.searchParams.set("email", accountEmail);
	resetUrl.searchParams.set("token", rawToken);

	await transporter.sendMail({
		from: `"Organic Harvest App" <${process.env.SMTP_USER}>`,
		to: email,
		subject: "Reset your Organic Harvest password",
		text: [
			"Use the link below to choose a new Organic Harvest password:",
			resetUrl.toString(),
			"",
			"This link expires in 1 hour.",
		].join("\n"),
		html: `
			<h2>Reset your Organic Harvest password</h2>
			<p><a href="${resetUrl.toString()}">Choose a new password</a></p>
			<p>This link expires in 1 hour.</p>
		`,
	});
}
