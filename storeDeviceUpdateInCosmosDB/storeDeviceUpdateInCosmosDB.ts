import { AzureFunction, Context } from '@azure/functions'
import { log } from '../lib/log'
import { DeviceUpdate } from '../lib/iotMessages'

/**
 * Store Device Twin Update in Cosmos DB so it can be queried later
 */
const storeDeviceUpdateInCosmosDB: AzureFunction = async (
	context: Context,
	update: DeviceUpdate,
): Promise<void> => {
	const doc = {
		deviceUpdate: update,
		deviceId:
			context.bindingData.systemProperties['iothub-connection-device-id'],
		timestamp: context.bindingData.systemProperties['iothub-enqueuedtime'],
		source: context.bindingData.systemProperties['iothub-message-source'],
	}

	log(context)({ doc, context })

	context.bindings.deviceUpdate = JSON.stringify(doc)

	context.done()
}

export default storeDeviceUpdateInCosmosDB
