import { ComandDefinition } from './CommandDefinition'
import * as chalk from 'chalk'
import { IotDpsClient } from '@azure/arm-deviceprovisioningservices'
import { v4 } from 'uuid'
import { uiServer, WebSocketConnection } from '@bifravst/device-ui-server'
import { deviceTopics } from '../iot/deviceTopics'
import { defaultConfig } from '../iot/defaultConfig'
import { fromEnv } from '../../lib/fromEnv'
import { connectDevice } from '../iot/connectDevice'
import { Status } from '../iot/fota'

let deviceUiUrl = ''

try {
	const { deviceUiUrl: d } = fromEnv({
		deviceUiUrl: 'DEVICE_UI_LOCATION',
	})(process.env)
	deviceUiUrl = d
} catch (e) {
	console.error(chalk.red(e.message))
}

export const connectCommand = ({
	certsDir,
	iotDpsClient,
	version,
	resourceGroup,
}: {
	iotDpsClient: () => Promise<IotDpsClient>
	certsDir: string
	version: string
	resourceGroup: string
}): ComandDefinition => ({
	command: 'connect <deviceId>',
	action: async (deviceId: string) => {
		try {
			const client = await connectDevice({
				certsDir,
				deviceId,
				dps: async () => {
					const armDpsClient = await iotDpsClient()
					const dps = await armDpsClient.iotDpsResource.get(
						`${resourceGroup}ProvisioningService`,
						resourceGroup,
					)
					return dps.properties as {
						serviceOperationsHostName: string
						idScope: string
					}
				},
				log: (info, context, ...rest) =>
					console.log(
						chalk.magenta(`${info}:`),
						chalk.yellow(context),
						...rest.map(chalk.gray),
					),
			})

			const devRoam = {
				dev: {
					v: {
						band: 666,
						nw: 'LAN',
						modV: 'device-simulator',
						brdV: 'device-simulator',
						appV: version,
						iccid: '12345678901234567890',
					},
					ts: Date.now(),
				},
				roam: {
					v: {
						rsrp: 70,
						area: 30401,
						mccmnc: 24201,
						cell: 16964098,
						ip: '0.0.0.0',
					},
					ts: Date.now(),
				},
			} as const

			let cfg = {
				...defaultConfig,
			}

			let wsConnection: WebSocketConnection

			const sendConfigToUi = () => {
				if (wsConnection !== undefined) {
					console.log(chalk.magenta('[ws>'), JSON.stringify(cfg))
					wsConnection.send(JSON.stringify(cfg))
				}
			}

			const updateTwinReported = (update: { [key: string]: any }) => {
				console.log(chalk.magenta('>'), chalk.cyan(JSON.stringify(update)))
				client.publish(
					deviceTopics.updateTwinReported(v4()),
					JSON.stringify(update),
				)
			}

			const updateConfig = (updateConfig: { [key: string]: any }) => {
				cfg = {
					...cfg,
					...updateConfig,
				}
				console.log(chalk.blue('Config:'))
				console.log(cfg)
				updateTwinReported({ cfg, ...devRoam })
				sendConfigToUi()
			}

			/**
			 * Simulate the FOTA process
			 * @see https://docs.microsoft.com/en-us/azure/iot-hub/tutorial-firmware-update#update-the-firmware
			 */
			const simulateFota = ({ fwVersion }: { fwVersion: string }) => {
				updateTwinReported({
					firmware: {
						currentFwVersion: version,
						pendingFwVersion: fwVersion,
						status: Status.DOWNLOADING,
					},
				})
				setTimeout(() => {
					updateTwinReported({
						firmware: {
							currentFwVersion: fwVersion,
							pendingFwVersion: fwVersion,
							status: Status.CURRENT,
						},
						dev: {
							v: {
								appV: fwVersion,
							},
							ts: Date.now(),
						},
					})
				}, 10 * 1000)
			}

			// See https://docs.microsoft.com/en-us/azure/iot-hub/iot-hub-mqtt-support#update-device-twins-reported-properties
			// A device must first subscribe to the $iothub/twin/res/# topic to receive the operation's responses from IoT Hub.
			client.subscribe(deviceTopics.twinResponses)
			// Receive desired properties update notifications
			// See https://docs.microsoft.com/en-us/azure/iot-hub/iot-hub-mqtt-support#receiving-desired-properties-update-notifications
			client.subscribe(deviceTopics.desiredUpdate.name)

			const getTwinPropertiesRequestId = v4()

			console.log(chalk.green('Connected:'), chalk.blueBright(deviceId))

			const getTwinPropertiesTopic = deviceTopics.getTwinProperties(
				getTwinPropertiesRequestId,
			)
			console.log(chalk.magenta('>'), chalk.yellow(getTwinPropertiesTopic))
			client.publish(getTwinPropertiesTopic, '')

			await uiServer({
				deviceUiUrl,
				deviceId: deviceId,
				onUpdate: updateTwinReported,
				onMessage: (message) => {
					console.log(
						chalk.magenta('>'),
						chalk.yellow(deviceTopics.messages(deviceId)),
					)
					console.log(chalk.magenta('>'), chalk.cyan(JSON.stringify(message)))
					client.publish(
						deviceTopics.messages(deviceId),
						JSON.stringify(message),
					)
				},
				onBatch: (update) => {
					console.log(
						chalk.magenta('>'),
						chalk.yellow(deviceTopics.batch(deviceId)),
					)
					console.log(chalk.magenta('>'), chalk.cyan(JSON.stringify(update)))
					client.publish(deviceTopics.batch(deviceId), JSON.stringify(update))
				},
				onWsConnection: (c) => {
					console.log(chalk.magenta('[ws]'), chalk.cyan('connected'))
					wsConnection = c
					sendConfigToUi()
				},
			})

			client.on('message', (topic, payload) => {
				console.log(chalk.magenta('<'), chalk.yellow(topic))
				if (payload.length) {
					console.log(chalk.magenta('<'), chalk.cyan(payload.toString()))
				}
				// Handle update reported messages
				if (
					topic ===
					deviceTopics.twinResponse({
						rid: getTwinPropertiesRequestId,
						status: 200,
					})
				) {
					const p = JSON.parse(payload.toString())
					updateConfig(p.desired.cfg)
					return
				}
				if (deviceTopics.updateTwinReportedAccepted.test(topic)) {
					// pass
					return
				}
				// Handle desired updates
				if (deviceTopics.desiredUpdate.test(topic)) {
					const desiredUpdate = JSON.parse(payload.toString())
					if (desiredUpdate.cfg !== undefined) {
						updateConfig(desiredUpdate.cfg)
					}
					if (desiredUpdate.firmware !== undefined) {
						simulateFota(desiredUpdate.firmware)
					}
					return
				}
				console.error(chalk.red(`Unexpected topic:`), chalk.yellow(topic))
			})

			client.on('error', (err) => {
				console.error(chalk.red(err.message))
			})
		} catch (err) {
			console.error(chalk.red(err.message))
			process.exit(1)
		}
	},
	help: 'Connect to the IoT Hub',
})
