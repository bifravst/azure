import { AzureFunction, Context } from '@azure/functions'
import { log } from '../lib/log'
import { Update } from '../lib/iotMessages'

/**
 * Store Device Twin Update in Cosmose DB SignalR so it can be queried later
 */
const storeDeviceUpdateInCosmosDB: AzureFunction = async (
	context: Context,
	update: Update,
): Promise<void> => {
	const doc = {
		update,
		deviceId:
			context.bindingData.systemProperties['iothub-connection-device-id'],
		timestamp: context.bindingData.systemProperties['iothub-enqueuedtime'],
		source: context.bindingData.systemProperties['iothub-message-source'],
	}

	log(context)(doc)

	context.bindings.deviceMessage = JSON.stringify(doc)

	context.done()
}

export default storeDeviceUpdateInCosmosDB
