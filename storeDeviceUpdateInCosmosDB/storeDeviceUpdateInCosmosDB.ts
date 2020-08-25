import { AzureFunction, Context } from '@azure/functions'
import { log } from '../lib/log'
import { DeviceUpdate, BatchDeviceUpdate } from '../lib/iotMessages'
import { batchToDoc } from './batchToDoc'

/**
 * Store Device Twin Update in Cosmos DB so it can be queried later
 */
const storeDeviceUpdateInCosmosDB: AzureFunction = async (
	context: Context,
	update: DeviceUpdate | BatchDeviceUpdate,
): Promise<void> => {
	log(context)({ context, update })
	const baseDoc = {
		deviceId:
			context.bindingData.systemProperties['iothub-connection-device-id'],
		timestamp: context.bindingData.systemProperties['iothub-enqueuedtime'],
		source: context.bindingData.systemProperties['iothub-message-source'],
	} as const

	let document: typeof baseDoc & {
		deviceUpdate: DeviceUpdate | DeviceUpdate[]
	}

	if (context?.bindingData?.properties?.batch !== undefined) {
		document = {
			...baseDoc,
			deviceUpdate: batchToDoc(update as BatchDeviceUpdate),
		}
	} else {
		document = {
			...baseDoc,
			deviceUpdate: update as DeviceUpdate,
		}
	}

	context.bindings.deviceUpdate = JSON.stringify(document)
	log(context)({ document })

	context.done()
}

export default storeDeviceUpdateInCosmosDB
