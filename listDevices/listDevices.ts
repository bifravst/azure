import { AzureFunction, Context, HttpRequest } from '@azure/functions'
import { Registry } from 'azure-iothub'
import { r } from '../lib/http'
import { log } from '../lib/log'
import { fromEnv } from '../lib/fromEnv'

const { connectionString } = fromEnv({
	connectionString: 'IOT_HUB_CONNECTION_STRING',
})(process.env)

const listDevices: AzureFunction = async (
	context: Context,
	req: HttpRequest,
): Promise<void> => {
	log(context)({ req })
	try {
		const registry = Registry.fromConnectionString(connectionString)
		const devices = registry.createQuery(
			'SELECT deviceId, tags.name FROM devices',
		)
		const res = await devices.nextAsTwin()
		context.res = r(res.result)
	} catch (error) {
		log(context)({
			error: error.message,
		})
		context.res = r({ error: error.message }, 500)
	}
}

export default listDevices
