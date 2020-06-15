import { AzureFunction, Context, HttpRequest } from '@azure/functions'
import { log } from '../lib/log'
import { r } from '../lib/http'
import { CosmosClient } from '@azure/cosmos'
import { parseConnectionString } from './parseConnectionString'

const { AccountEndpoint, AccountKey } = parseConnectionString(
	process.env.HISTORICAL_DATA_COSMOSDB_CONNECTION_STRING ?? '',
)
const cosmosClient = new CosmosClient({
	endpoint: AccountEndpoint,
	key: AccountKey,
})

const container = cosmosClient.database('deviceMessages').container('updates')

/**
 * Query historical device updates stored in Cosmos DB
 */
const queryHistoricalDeviceData: AzureFunction = async (
	context: Context,
	req: HttpRequest,
): Promise<void> => {
	log(context)({ req })
	try {
		const result = {
			result: (await container.items.query(req.body.query).fetchAll())
				.resources,
		}
		log(context)({ result })
		context.res = r(result)
	} catch (error) {
		console.error({ error })
		context.res = r(error, 500)
	}
}

export default queryHistoricalDeviceData
