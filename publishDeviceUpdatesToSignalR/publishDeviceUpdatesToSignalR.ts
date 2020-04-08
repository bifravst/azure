import { AzureFunction, Context } from '@azure/functions'
import { log } from '../lib/log'

type Message = {
	version: number
	tags?: { [key: string]: any }
	properties?: {
		desired?: { [key: string]: any }
		reported?: { [key: string]: any }
	}
}

/**
 * Publishes Device Twin Update to SignalR so the web application can receive real-time notifications
 */
const publishDeviceUpdatesToSignalR: AzureFunction = async (
	context: Context,
	messages: Message[],
): Promise<void> => {
	log(context)(messages)
	messages.forEach(({ properties }) => {
		if (!properties?.reported) return
		console.log({
			reported: properties.reported,
		})
	})
	context.done()
}

export default publishDeviceUpdatesToSignalR
