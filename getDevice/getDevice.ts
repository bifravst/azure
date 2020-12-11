import { AzureFunction, Context, HttpRequest } from '@azure/functions'
import { Registry } from 'azure-iothub'
import { r } from '../lib/http'
import { ErrorInfo, ErrorType, toStatusCode } from '../lib/ErrorInfo'
import { log } from '../lib/log'
import { fromEnv } from '../lib/fromEnv'

const { connectionString } = fromEnv({
	connectionString: 'IOT_HUB_CONNECTION_STRING',
})(process.env)

const getDevice: AzureFunction = async (
	context: Context,
	req: HttpRequest,
): Promise<void> => {
	log(context)({ req })
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
			context.res = r(res.result[0])
		}
	} catch (error) {
		log(context)({
			error: error.message,
		})
		context.res = r({ error: error.message }, 500)
	}
}

export default getDevice
