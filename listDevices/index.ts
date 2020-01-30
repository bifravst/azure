import { AzureFunction, Context, HttpRequest } from '@azure/functions'
import { Registry } from 'azure-iothub'

const connectionString = process.env.IOT_HUB_CONNECTION_STRING || ''

const r = (result: any, status = 200) => ({
	headers: {
		'Content-Type': 'application/json; charset=uft-8',
	},
	status,
	isRaw: true,
	body: JSON.stringify(result),
})

const listDevices: AzureFunction = async (
	context: Context,
	req: HttpRequest,
): Promise<void> => {
	context.log({ req })
	try {
		const registry = Registry.fromConnectionString(connectionString)
		const devices = registry.createQuery('SELECT * FROM devices')
		const res = await devices.nextAsTwin()
		context.res = r(res.result)
	} catch (error) {
		context.res = r(error, 500)
	}
}

export default listDevices
