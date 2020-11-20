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
import { cellId } from '@bifravst/cell-geolocation-helpers'
import { exponential } from 'backoff'

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

	type GpsUpdate = {
		v: { lat: number; lng: number; acc?: number }
		ts: number
	}
	const gpsUpdates: GpsUpdate[] = []

	if (context?.bindingData?.properties?.batch !== undefined) {
		log(context)({ batch: batchToDoc(update as BatchDeviceUpdate) })
		gpsUpdates.push(
			...(batchToDoc(update as BatchDeviceUpdate)
				.filter(({ gps }) => gps !== undefined)
				.map(({ gps }) => gps) as GpsUpdate[]),
		)
	} else {
		if ((update as TwinChangeEvent)?.properties?.reported?.gps !== undefined) {
			gpsUpdates.push((update as TwinChangeEvent)?.properties?.reported?.gps)
		}
	}

	if (gpsUpdates.length == 0) {
		context.done()
		return
	}

	log(context)({ gpsUpdates })

	const roamingPositions = (
		await Promise.all(
			gpsUpdates.map(
				async ({ ts, v }) =>
					new Promise((resolve) => {
						const sql = `SELECT 
			 c.deviceUpdate.properties.reported.roam.v.cell AS cell,
			 c.deviceUpdate.properties.reported.roam.v.mccmnc AS mccmnc,
			 c.deviceUpdate.properties.reported.roam.v.area AS area
			 FROM c
			 WHERE c.deviceUpdate.properties.reported.roam.v != null
			 AND c.deviceId = "${deviceId}"
			 AND c.deviceUpdate.properties.reported.roam.ts < ${ts}
			 ORDER BY c.timestamp DESC
			 OFFSET 0 LIMIT 1
			 `
						log(context)({ sql })
						const b = exponential({
							randomisationFactor: 0,
							initialDelay: 1000,
							maxDelay: 5800,
						})
						b.failAfter(5)
						b.on('ready', async (attempt) => {
							log(context)({ attempt: attempt + 1 })
							const res: {
								cell: number
								mccmnc: number
								area: number
							}[] = (await container.items.query(sql).fetchAll()).resources
							log(context)({ res })
							if (res.length === 0) {
								b.backoff()
								return
							}
							const { cell, mccmnc, area } = res[0]
							resolve({
								cellId: cellId({ cell, mccmnc, area }),
								cell,
								mccmnc,
								area,
								lat: v.lat,
								lng: v.lng,
								acc: v.acc,
								ts,
								deviceId,
							})
						})
						b.on('fail', () => {
							resolve(undefined)
						})
						b.backoff()
					}),
			),
		)
	).filter((r) => r !== undefined) as {
		cellId: string
		cell: number
		mccmnc: number
		area: number
		lat: number
		lng: number
		acc?: number
		ts: number
	}[]

	log(context)({ roamingPositions })

	if (roamingPositions.length === 0) {
		context.done()
		return
	}

	// Persist in CosmosDB
	context.bindings.deviceCellGeolocation = JSON.stringify(roamingPositions)

	context.done()
}

export default queryCellGeolocation
