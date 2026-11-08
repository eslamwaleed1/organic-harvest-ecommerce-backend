export function capitalizeFirstLetter(str) {
	if (!str) return "";
	return str.charAt(0).toUpperCase() + str.slice(1);
}

export const sendError = (res, error, fallbackMessage) => {
	console.error(`${fallbackMessage}:`, error);
	return res.status(error.statusCode ?? 500).json({
		success: false,
		message: error.statusCode ? error.message : fallbackMessage,
	});
};

