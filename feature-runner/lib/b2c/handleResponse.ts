import { Response } from 'node-fetch'

export const handleErrorResponse = async (res: Response): Promise<void> => {
	if (res.status >= 400) {
		const error = await res.json()
		console.log(error)
		if (error.error !== undefined) {
			if (error.error.code !== undefined && error.error.message !== undefined)
				throw new Error(`${error.error.code}: ${error.error.message}!`)
			if (error.error !== undefined && error.error_description !== undefined)
				throw new Error(`${error.error}: ${error.error_description}!`)
			throw new Error(JSON.stringify(error.error))
		}
		throw new Error(await res.text())
	}
}
