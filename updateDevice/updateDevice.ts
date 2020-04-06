import { AzureFunction, Context, HttpRequest } from '@azure/functions'
import { Registry } from 'azure-iothub'
import { r } from '../lib/http'
import { ErrorInfo, ErrorType, toStatusCode } from '../lib/ErrorInfo'

const connectionString = process.env.IOT_HUB_CONNECTION_STRING || ''

const updateDevice: AzureFunction = async (
	context: Context,
	req: HttpRequest,
): Promise<void> => {
	context.log({ req: JSON.stringify(req) })
	try {
		const registry = Registry.fromConnectionString(connectionString)
		const devices = registry.createQuery(
			`SELECT * FROM devices WHERE deviceId='${req.params.id}'`,
		)
		const res = await devices.nextAsTwin()
		if (res.result.length === 0) {
			context.res = r(
				{
					type: ErrorType.EntityNotFound,
					message: `Device ${req.params.id} not found!`,
				} as ErrorInfo,
				toStatusCode[ErrorType.EntityNotFound],
			)
		} else {
			await registry.updateTwin(
				req.params.id,
				{
					tags: req.body,
				},
				res.result[0].etag,
			)
			context.res = r(true)
		}
	} catch (error) {
		context.log(
			JSON.stringify({
				error: error.message,
			}),
		)
		context.res = r(error, 500)
	}
}

export default updateDevice
