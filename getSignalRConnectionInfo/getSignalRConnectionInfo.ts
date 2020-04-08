import { AzureFunction, Context, HttpRequest } from '@azure/functions'
import { r } from '../lib/http'
import { log } from '../lib/log'

const getSignalRConnectionInfo: AzureFunction = async (
	context: Context,
	req: HttpRequest,
	connectionInfo: {
		url: string
		accessToken: string
	},
): Promise<void> => {
	log(context)({ req, connectionInfo })
	context.res = r(connectionInfo)
}

export default getSignalRConnectionInfo
