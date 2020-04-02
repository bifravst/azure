export const r = (result: any, status = 200) => ({
	headers: {
		'Content-Type': 'application/json; charset=uft-8',
	},
	status,
	isRaw: true,
	body: JSON.stringify(result),
})
