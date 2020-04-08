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
 *
 * FIXME: Get device ID
 */
const publishDeviceUpdatesToSignalR: AzureFunction = async (
	context: Context,
	messages: Message[],
): Promise<void> => {
	log(context)(messages)

	const updates = messages
		.filter(({ properties }) => properties?.reported)
		.map(({ properties }) => properties?.reported)

	if (updates.length) {
		log(context)({ updates })
		context.bindings.signalRMessages = updates.map(update => ({
			target: 'newMessage',
			arguments: [update],
		}))
	}

	context.done()
}

export default publishDeviceUpdatesToSignalR
