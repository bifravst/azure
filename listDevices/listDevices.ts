import { AzureFunction, Context, HttpRequest } from '@azure/functions'
import { Registry } from 'azure-iothub'
import { r } from '../lib/http'

const connectionString = process.env.IOT_HUB_CONNECTION_STRING || ''

const listDevices: AzureFunction = async (
	context: Context,
	req: HttpRequest,
): Promise<void> => {
	context.log({ req: JSON.stringify(req) })
	try {
		const registry = Registry.fromConnectionString(connectionString)
		const devices = registry.createQuery(
			'SELECT deviceId, tags.name FROM devices',
		)
		const res = await devices.nextAsTwin()
		context.res = r(res.result)
	} catch (error) {
		context.log({
			error: error.message,
		})
		context.res = r(error, 500)
	}
}

export default listDevices
