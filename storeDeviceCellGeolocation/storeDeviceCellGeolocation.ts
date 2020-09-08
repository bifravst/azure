import { AzureFunction, Context } from '@azure/functions'
import { log } from '../lib/log'
import { CosmosClient } from '@azure/cosmos'
import { parseConnectionString } from '../lib/parseConnectionString'
import { fromEnv } from '../lib/fromEnv'
import {
	BatchDeviceUpdate,
	DeviceUpdate,
	TwinChangeEvent,
} from '../lib/iotMessages'
import { batchToDoc } from '../lib/batchToDoc'

const { connectionString } = fromEnv({
	connectionString: 'HISTORICAL_DATA_COSMOSDB_CONNECTION_STRING',
})(process.env)

const { AccountEndpoint, AccountKey } = parseConnectionString(connectionString)
const cosmosClient = new CosmosClient({
	endpoint: AccountEndpoint,
	key: AccountKey,
})

const container = cosmosClient.database('deviceMessages').container('updates')

/**
 * Query historical device updates stored in Cosmos DB
 */
const queryCellGeolocation: AzureFunction = async (
	context: Context,
	update: DeviceUpdate | BatchDeviceUpdate,
): Promise<void> => {
	log(context)({ update })
	const deviceId =
		context.bindingData.systemProperties['iothub-connection-device-id']
	const updates: DeviceUpdate[] = []

	if (context?.bindingData?.properties?.batch !== undefined) {
		updates.push(...batchToDoc(update as BatchDeviceUpdate))
	} else {
		updates.push(update as DeviceUpdate)
	}

	const gpsUpdates = updates.filter(
		(u) => (u as TwinChangeEvent)?.properties?.reported?.gps !== undefined,
	) as TwinChangeEvent[]

	if (gpsUpdates.length == 0) {
		context.done()
		return
	}

	const coordinates = gpsUpdates.map(
		({ properties }) => properties?.reported?.gps,
	) as { v: { lat: number; lng: number }; ts: number }[]

	log(context)({ coordinates })

	const roamingPositions = await Promise.all(
		coordinates.map(async ({ ts }) =>
			container.items
				.query(
					`SELECT 
c.deviceUpdate.roam.v.cell AS cell,
c.deviceUpdate.roam.v.mccmnc AS mccmnc,
c.deviceUpdate.roam.v.area AS area
FROM c
WHERE c.deviceUpdate.roam.v != null
AND c.deviceUpdate.roam.ts < ${ts}
AND c.deviceId = "${deviceId}"
ORDER BY c.timestamp DESC
OFFSET 0 LIMIT 1
`,
				)
				.fetchAll(),
		),
	)

	log(context)({ roamingPositions })

	// FIXME: Merge and persist

	context.done()
}

export default queryCellGeolocation
