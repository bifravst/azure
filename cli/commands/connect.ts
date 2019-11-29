import { ComandDefinition } from './CommandDefinition'
import { deviceFileLocations } from '../iot/deviceFileLocations'
import { promises as fs } from 'fs'
import chalk from 'chalk'
import { IotDpsClient } from '@azure/arm-deviceprovisioningservices'
import { connect } from 'mqtt'
import { v4 } from 'uuid'
import { parse, URLSearchParams } from 'url'
import { DeviceRegistrationState } from 'azure-iot-provisioning-service/lib/interfaces'

export const connectCommand = ({
	certsDir,
	iotDpsClient
}: {
	iotDpsClient: () => Promise<IotDpsClient>
	certsDir: string
}): ComandDefinition => ({
	command: 'connect <deviceId>',
	action: async (deviceId: string) => {

		const deviceFiles = deviceFileLocations({
			certsDir,
			deviceId
		})

		const [
			deviceCert,
			deviceKey,
		] = await Promise.all([
			fs.readFile(deviceFiles.certWithChain, 'utf-8'),
			fs.readFile(deviceFiles.privateKey, 'utf-8'),
		])

		let iotHub

		try {
			const registration = JSON.parse(await fs.readFile(deviceFiles.registration,
				'utf-8')) as DeviceRegistrationState
			iotHub = registration.assignedHub
		} catch {

			// Connect to Device Provisioning Service using MQTT
			// @see https://docs.microsoft.com/en-us/azure/iot-dps/iot-dps-mqtt-support

			const armDpsClient = await iotDpsClient()
			const dps = await armDpsClient.iotDpsResource.get('bifravstProvisioningService', 'bifravst')
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
			client.subscribe('$dps/registrations/res/#')

			client.on('connect', () => {
				console.log(chalk.magenta('Connected:'), chalk.yellow(deviceId))

				// The device should publish a register message to DPS using $dps/registrations/PUT/iotdps-register/?$rid={request_id} as a Topic Name. The payload should contain the Device Registration object in JSON format. In a successful scenario, the device will receive a response on the $dps/registrations/res/202/?$rid={request_id}&retry-after=x topic name where x is the retry-after value in seconds. The payload of the response will contain the RegistrationOperationStatus object in JSON format.
				client.publish(`$dps/registrations/PUT/iotdps-register/?$rid=${v4()}`, JSON.stringify({
					registrationId: deviceId
				}))
			})

			// The device must poll the service periodically to receive the result of the device registration operation.
			const p = new Promise<DeviceRegistrationState>((resolve, reject) => {
				client.on('message', (topic, payload) => {
					console.debug(chalk.magenta(topic), chalk.yellow(payload.toString()))
					const message = JSON.parse(payload.toString())
					if (topic.indexOf('$dps/registrations/res/202') === 0) {
						const args = new URLSearchParams(`${parse(topic).query}`)
						const { operationId, status } = message
						console.log(chalk.magenta('Status:'), chalk.yellow(status))
						console.log(chalk.magenta('Retry after:'), chalk.yellow(args.get('retry-after') as string))
						setTimeout(() => {
							// Assuming that the device has already subscribed to the $dps/registrations/res/# topic as indicated above, it can publish a get operationstatus message to the $dps/registrations/GET/iotdps-get-operationstatus/?$rid={request_id}&operationId={operationId} topic name. The operation ID in this message should be the value received in the RegistrationOperationStatus response message in the previous step. 
							client.publish(`$dps/registrations/GET/iotdps-get-operationstatus/?$rid=${v4()}&operationId=${operationId}`, '')
						}, parseInt(args.get('retry-after') || '1', 10) * 1000)
						return
					}
					// In the successful case, the service will respond on the $dps/registrations/res/200/?$rid={request_id} topic. The payload of the response will contain the RegistrationOperationStatus object. The device should keep polling the service if the response code is 202 after a delay equal to the retry-after period. The device registration operation is successful if the service returns a 200 status code.
					if (topic.indexOf('$dps/registrations/res/200') === 0) {
						const { status, registrationState } = message
						console.log(chalk.magenta('Status:'), chalk.yellow(status))
						console.log(chalk.magenta('IoT Hub:'), chalk.yellow(registrationState.assignedHub))
						resolve(registrationState)
					}
					reject(new Error(`Unexpected message on topic ${topic}!`))
				})
				client.on('error', err => {
					console.error(chalk.red(err.message))
					reject(err)
				})
			})

			const registration = await p

			client.end()
			client.removeAllListeners()

			iotHub = registration.assignedHub

			console.log(chalk.green(`Device registration succeeded with IotHub`), chalk.blueBright(iotHub))

			await fs.writeFile(deviceFiles.registration, JSON.stringify(registration, null, 2), 'utf-8')
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

			client.on('connect', () => {
				console.log(chalk.green('Connected:'), chalk.blueBright(deviceId))
			})

			client.on('error', err => {
				console.error(chalk.red(err.message))
			})
		}
	},
	help: 'Connect to the IoT Hub',
})

