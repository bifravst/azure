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
	log(context)({
		messages,
		systemPropertiesArray: context.bindingData.systemPropertiesArray,
	})

	const updates = messages
		.map((message, k) => ({
			message,
			systemProperties: context.bindingData.systemPropertiesArray[k],
		}))
		.filter(({ message: { properties } }) => properties?.reported)
		.map(({ message: { properties }, systemProperties }) => ({
			deviceId: systemProperties['iothub-connection-device-id'],
			update: {
				reported: properties?.reported,
			},
		}))

	if (updates.length) {
		log(context)({ updates })
		context.bindings.signalRMessages = updates.map((update) =>
			// Send to a per-device "topic", so clients can subscribe to updates for a specific device
			({
				target: `deviceUpdate:${update.deviceId}`,
				arguments: [update],
			}),
		)
	}

	context.done()
}

export default publishDeviceUpdatesToSignalR
