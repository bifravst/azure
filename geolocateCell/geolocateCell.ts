import { AzureFunction, Context, HttpRequest } from '@azure/functions'
import { r } from '../lib/http'
import { log } from '../lib/log'
import { fromEnv } from '../lib/fromEnv'
import { parseConnectionString } from '../lib/parseConnectionString'
import { CosmosClient } from '@azure/cosmos'
import {
	cellId,
	cellFromGeolocations,
} from '@bifravst/cell-geolocation-helpers'
import { isSome } from 'fp-ts/lib/Option'

const { connectionString } = fromEnv({
	connectionString: 'HISTORICAL_DATA_COSMOSDB_CONNECTION_STRING',
})(process.env)

const { AccountEndpoint, AccountKey } = parseConnectionString(connectionString)
const cosmosClient = new CosmosClient({
	endpoint: AccountEndpoint,
	key: AccountKey,
})

const container = cosmosClient
	.database('cellGeolocation')
	.container('deviceCellGeolocations')

const fromDeviceLocations = cellFromGeolocations({
	minCellDiameterInMeters: 5000,
	percentile: 0.9,
})

const geolocateCell: AzureFunction = async (
	context: Context,
	req: HttpRequest,
): Promise<void> => {
	log(context)({ req })

	const { cell, area, mccmnc } = req.query
	const c = cellId({
		cell: parseInt(cell, 10),
		area: parseInt(area, 10),
		mccmnc: parseInt(mccmnc, 10),
	})

	try {
		const sql = `SELECT c.lat AS lat, c.lng AS lng FROM c WHERE c.cellId='${c}'`
		log(context)({ sql })
		const locations = (await container.items.query(sql).fetchAll()).resources

		log(context)({ locations })

		const location = fromDeviceLocations(locations)

		if (isSome(location)) {
			context.res = r(location.value)
			log(context)({ location: location.value })
		} else {
			context.res = r({ error: `Could not resolve cell ${c}` }, 404)
		}
	} catch (error) {
		console.error({ error })
		context.res = r({ error: error.message }, 500)
	}
}

export default geolocateCell
