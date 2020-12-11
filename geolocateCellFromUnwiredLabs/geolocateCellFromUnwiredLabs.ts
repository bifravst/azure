import { AzureFunction, Context, HttpRequest } from '@azure/functions'
import { r } from '../lib/http'
import { log } from '../lib/log'
import { fromEnv } from '../lib/fromEnv'
import { parseConnectionString } from '../lib/parseConnectionString'
import { CosmosClient } from '@azure/cosmos'
import { cellId } from '@bifravst/cell-geolocation-helpers'
import { resolveFromAPI } from './resolveFromAPI'
import { isLeft } from 'fp-ts/lib/Either'

const { connectionString } = fromEnv({
	connectionString: 'HISTORICAL_DATA_COSMOSDB_CONNECTION_STRING',
})(process.env)

const { apiKey, endpoint } = (() => {
	try {
		return fromEnv({
			apiKey: 'UNWIREDLABS_API_KEY',
			endpoint: 'UNWIREDLABS_API_ENDPOINT',
		})(process.env)
	} catch {
		console.warn(`No Unwired Labs API key defined. Disabling lookups.`)
		return {
			apiKey: undefined,
			endpoint: undefined,
		}
	}
})()

const locate =
	apiKey !== undefined && endpoint !== undefined
		? resolveFromAPI({
				apiKey,
				endpoint,
		  })
		: undefined

const { AccountEndpoint, AccountKey } = parseConnectionString(connectionString)
const cosmosClient = new CosmosClient({
	endpoint: AccountEndpoint,
	key: AccountKey,
})

const container = cosmosClient
	.database('cellGeolocation')
	.container('unwiredLabsCache')

const geolocateCellFromUnwiredLabs: AzureFunction = async (
	context: Context,
	req: HttpRequest,
): Promise<void> => {
	log(context)({ req })

	if (locate === undefined) {
		context.res = r({ error: `No Unwired Labs API key defined.` }, 402)
		context.done()
		return
	}

	const { cell: c, area, mccmnc } = req.query
	const cell = {
		cell: parseInt(c, 10),
		area: parseInt(area, 10),
		mccmnc: parseInt(mccmnc, 10),
	}
	const id = cellId(cell)

	try {
		const sql = `SELECT c.lat AS lat, c.lng AS lng, c.accuracy FROM c WHERE c.cellId='${id}'`
		log(context)({ sql })
		const locations = (await container.items.query(sql).fetchAll()).resources

		log(context)({ locations })

		if (locations?.[0] !== undefined) {
			if (locations[0].lat !== undefined) {
				context.res = r(locations[0])
			} else {
				context.res = r({ error: `Unknown cell ${id}` }, 404)
			}
		} else {
			const maybeLocation = await locate(cell)
			if (isLeft(maybeLocation)) {
				context.res = r({ error: `Could not resolve cell ${id}` }, 404)
				context.bindings.cellGeolocation = JSON.stringify({
					cellId: id,
					...cell,
				})
			} else {
				context.bindings.cellGeolocation = JSON.stringify({
					cellId: id,
					...cell,
					...maybeLocation.right,
				})
				log(context)({ location: maybeLocation.right })
			}
		}
	} catch (error) {
		console.error({ error })
		context.res = r({ error: error.message }, 500)
	}
	context.done()
}

export default geolocateCellFromUnwiredLabs
