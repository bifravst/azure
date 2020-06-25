import { ComandDefinition } from './CommandDefinition'
import { deviceFileLocations } from '../iot/deviceFileLocations'
import { promises as fs } from 'fs'
import chalk from 'chalk'
import { IotDpsClient } from '@azure/arm-deviceprovisioningservices'
import { connect } from 'mqtt'
import { v4 } from 'uuid'
import { parse, URLSearchParams } from 'url'
import { DeviceRegistrationState } from 'azure-iot-provisioning-service/lib/interfaces'
import { uiServer, WebSocketConnection } from '@bifravst/device-ui-server'
import { deviceTopics } from '../iot/deviceTopics'
import { dpsTopics } from '../iot/dpsTopics'
import { defaultConfig } from '../iot/defaultConfig'

const deviceUiUrl = process.env.DEVICE_UI_LOCATION ?? ''

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
		const deviceFiles = deviceFileLocations({
			certsDir,
			deviceId,
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

		const [deviceCert, deviceKey] = await Promise.all([
			fs.readFile(deviceFiles.certWithChain, 'utf-8'),
			fs.readFile(deviceFiles.privateKey, 'utf-8'),
		])

		let iotHub

		try {
			const registration = JSON.parse(
				await fs.readFile(deviceFiles.registration, 'utf-8'),
			) as DeviceRegistrationState
			iotHub = registration.assignedHub
		} catch {
			// Connect to Device Provisioning Service using MQTT
			// @see https://docs.microsoft.com/en-us/azure/iot-dps/iot-dps-mqtt-support

			const armDpsClient = await iotDpsClient()
			const dps = await armDpsClient.iotDpsResource.get(
				`${resourceGroup}ProvisioningService`,
				resourceGroup,
			)
			const dpsHostname = dps.properties.serviceOperationsHostName as string
			const idScope = dps.properties.idScope as string
			console.log(chalk.magenta(`Connecting to`), chalk.yellow(dpsHostname))
			console.log(chalk.magenta(`ID scope`), chalk.yellow(idScope))

			const client = connect({
				host: dpsHostname,
				port: 8883,
				key: deviceKey,
				cert: deviceCert,
				rejectUnauthorized: true,
				clientId: deviceId,
				username: `${idScope}/registrations/${deviceId}/api-version=2019-03-31`,
				protocol: 'mqtts',
				version: 4,
			})

			// To register a device through DPS, a device should subscribe using $dps/registrations/res/# as a Topic Filter. The multi-level wildcard # in the Topic Filter is used only to allow the device to receive additional properties in the topic name. DPS does not allow the usage of the # or ? wildcards for filtering of subtopics. Since DPS is not a general-purpose pub-sub messaging broker, it only supports the documented topic names and topic filters.
			client.subscribe(dpsTopics.registrationResponses)

			client.on('connect', () => {
				console.log(chalk.magenta('Connected:'), chalk.yellow(deviceId))

				// The device should publish a register message to DPS using $dps/registrations/PUT/iotdps-register/?$rid={request_id} as a Topic Name. The payload should contain the Device Registration object in JSON format. In a successful scenario, the device will receive a response on the $dps/registrations/res/202/?$rid={request_id}&retry-after=x topic name where x is the retry-after value in seconds. The payload of the response will contain the RegistrationOperationStatus object in JSON format.
				client.publish(
					dpsTopics.register(),
					JSON.stringify({
						registrationId: deviceId,
					}),
				)
			})

			// The device must poll the service periodically to receive the result of the device registration operation.
			const p = new Promise<DeviceRegistrationState>((resolve, reject) => {
				client.on('message', (topic, payload) => {
					console.debug(chalk.magenta(topic), chalk.yellow(payload.toString()))
					const message = JSON.parse(payload.toString())
					if (topic.startsWith(dpsTopics.registrationResult(202))) {
						const args = new URLSearchParams(`${parse(topic).query}`)
						const { operationId, status } = message
						console.log(chalk.magenta('Status:'), chalk.yellow(status))
						console.log(
							chalk.magenta('Retry after:'),
							chalk.yellow(args.get('retry-after') as string),
						)
						setTimeout(() => {
							// Assuming that the device has already subscribed to the $dps/registrations/res/# topic as indicated above, it can publish a get operationstatus message to the $dps/registrations/GET/iotdps-get-operationstatus/?$rid={request_id}&operationId={operationId} topic name. The operation ID in this message should be the value received in the RegistrationOperationStatus response message in the previous step.
							client.publish(dpsTopics.registationStatus(operationId), '')
						}, parseInt(args.get('retry-after') ?? '1', 10) * 1000)
						return
					}
					// In the successful case, the service will respond on the $dps/registrations/res/200/?$rid={request_id} topic. The payload of the response will contain the RegistrationOperationStatus object. The device should keep polling the service if the response code is 202 after a delay equal to the retry-after period. The device registration operation is successful if the service returns a 200 status code.
					if (topic.startsWith(dpsTopics.registrationResult(200))) {
						const { status, registrationState } = message
						console.log(chalk.magenta('Status:'), chalk.yellow(status))
						console.log(
							chalk.magenta('IoT Hub:'),
							chalk.yellow(registrationState.assignedHub),
						)
						resolve(registrationState)
					}
					reject(new Error(`Unexpected message on topic ${topic}!`))
				})
				client.on('error', (err) => {
					console.error(chalk.red(err.message))
					reject(err)
				})
			})

			const registration = await p

			client.end()
			client.removeAllListeners()

			iotHub = registration.assignedHub

			console.log(
				chalk.green(`Device registration succeeded with IotHub`),
				chalk.blueBright(iotHub),
			)

			await fs.writeFile(
				deviceFiles.registration,
				JSON.stringify(registration, null, 2),
				'utf-8',
			)
		} finally {
			console.log(chalk.magenta(`Connecting to`), chalk.yellow(`${iotHub}`))

			const client = connect({
				host: iotHub,
				port: 8883,
				key: deviceKey,
				cert: deviceCert,
				rejectUnauthorized: true,
				clientId: deviceId,
				protocol: 'mqtts',
				username: `${iotHub}/${deviceId}/?api-version=2018-06-30`,
				version: 4,
			})

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

			const simulateFota = (fota: { jobId: string }) => {
				updateTwinReported({
					fota: {
						jobId: fota.jobId,
						status: 'IN_PROGRESS',
					},
				})
				setTimeout(() => {
					updateTwinReported({
						fota: {
							jobId: fota.jobId,
							status: 'SUCCEEDED',
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

			client.on('connect', async () => {
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
						console.log(chalk.magenta('>'), chalk.cyan(JSON.stringify(message)))
						client.publish(
							deviceTopics.messages(deviceId),
							JSON.stringify(message),
						)
					},
					onWsConnection: (c) => {
						console.log(chalk.magenta('[ws]'), chalk.cyan('connected'))
						wsConnection = c
						sendConfigToUi()
					},
				})
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
					if (desiredUpdate.fota !== undefined) {
						simulateFota(desiredUpdate.fota)
					}
					return
				}
				console.error(chalk.red(`Unexpected topic:`), chalk.yellow(topic))
			})

			client.on('error', (err) => {
				console.error(chalk.red(err.message))
			})
		}
	},
	help: 'Connect to the IoT Hub',
})
