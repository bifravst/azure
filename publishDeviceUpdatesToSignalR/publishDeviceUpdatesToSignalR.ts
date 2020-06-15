import { AzureFunction, Context } from '@azure/functions'
import { log } from '../lib/log'
import { DeviceUpdate, TwinChangeEvent } from '../lib/iotMessages'

/**
 * Publishes Device Twin Update to SignalR so the web application can receive real-time notifications
 */
const publishDeviceUpdatesToSignalR: AzureFunction = async (
	context: Context,
	updates: DeviceUpdate[],
): Promise<void> => {
	log(context)({
		messages: updates,
		systemPropertiesArray: context.bindingData.systemPropertiesArray,
	})

	const signalRMessages = []

	const addProperties = (message: DeviceUpdate, k: number) => ({
		message,
		systemProperties: context.bindingData.systemPropertiesArray[k],
	})

	const reportedUpdates = updates
		.map(addProperties)
		.filter(
			({ systemProperties }) =>
				systemProperties['iothub-message-source'] === 'twinChangeEvents',
		)
		.filter(
			({ message }) =>
				(message as TwinChangeEvent)?.properties?.reported ??
				(message as TwinChangeEvent)?.properties?.desired,
		)
		.map(({ message, systemProperties }) => ({
			deviceId: systemProperties['iothub-connection-device-id'],
			state: {
				reported: (message as TwinChangeEvent)?.properties?.reported,
				desired: (message as TwinChangeEvent)?.properties?.desired,
			},
		}))

	if (reportedUpdates.length) {
		signalRMessages.push(
			...reportedUpdates.map((update) =>
				// Send to a per-device "topic", so clients can subscribe to updates for a specific device
				({
					target: `deviceState:${update.deviceId}`,
					arguments: [update],
				}),
			),
		)
	}

	const messages = updates
		.map(addProperties)
		.filter(
			({ systemProperties }) =>
				systemProperties['iothub-message-source'] === 'Telemetry',
		)
		.map(({ message, systemProperties }) => ({
			deviceId: systemProperties['iothub-connection-device-id'],
			message,
		}))

	if (messages.length) {
		signalRMessages.push(
			...messages.map((message) =>
				// Send to a per-device "topic", so clients can subscribe to updates for a specific device
				({
					target: `deviceMessage:${message.deviceId}`,
					arguments: [message],
				}),
			),
		)
		messages.forEach((message) => {
			// Send to a per-action "topic", so clients can subscribe to updates for a specific action
			signalRMessages.push(
				...Object.keys(message.message).map((key) => ({
					target: `deviceMessage:${key}`,
					arguments: [message],
				})),
			)
		})
	}

	log(context)({ signalRMessages })

	context.bindings.signalRMessages = signalRMessages

	context.done()
}

export default publishDeviceUpdatesToSignalR
