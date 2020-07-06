const s = () =>
	Math.random()
		.toString(36)
		.replace(/[^a-z]+/g, '')

/**
 * Generates a random password with an uppercase character and a number
 */
export const randomPassword = (): string =>
	((pw) =>
		`${pw[0].toUpperCase()}${pw.substr(1)}${Math.round(Math.random() * 1000)}`)(
		`${s()}${s()}`,
	)
