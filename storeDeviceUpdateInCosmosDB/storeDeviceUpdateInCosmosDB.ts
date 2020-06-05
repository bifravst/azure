import { AzureFunction, Context } from '@azure/functions'
import { log } from '../lib/log'
import { Update } from '../lib/iotMessages'
import { v4 } from 'uuid'

/**
 * Store Device Twin Update in Cosmose DB SignalR so it can be queried later
 */
const storeDeviceUpdateInCosmosDB: AzureFunction = async (
	context: Context,
	update: Update,
): Promise<void> => {
	const doc = {
		id: v4(),
		update,
		systemPropertiesArray: context.bindingData.systemPropertiesArray,
	}

	log(context)(doc)

	context.bindings.deviceMessage = JSON.stringify(doc)

	context.done()
}

export default storeDeviceUpdateInCosmosDB
