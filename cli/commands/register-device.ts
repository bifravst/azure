import chalk from 'chalk'
import { ComandDefinition } from './CommandDefinition'
import { randomWords } from '@bifravst/random-words'
import * as path from 'path'
import { generateDeviceCertificate } from '../iot/generateDeviceCertificate'
import { deviceFileLocations } from '../iot/deviceFileLocations'
import { promises as fs } from 'fs'
import { IotHubClient } from "@azure/arm-iothub";
import { caFileLocations } from '../iot/caFileLocations'

export const registerDeviceCommand = ({
	iotClient,
	certsDir,
}: {
	iotClient: IotHubClient,
	certsDir: string
}): ComandDefinition => ({
	command: 'register-device',
	options: [
		{
			flags: '-d, --deviceId <deviceId>',
			description: 'Device ID, if left blank a random ID will be generated',
		},
	],
	action: async ({ deviceId }: { deviceId: string }) => {
		const id = deviceId || (await randomWords({ numWords: 3 })).join('-')

		await generateDeviceCertificate({
			deviceId: id,
			certsDir,
			log: (...message: any[]) => {
				console.log(...message.map(m => chalk.magenta(m)))
			},
			debug: (...message: any[]) => {
				console.log(...message.map(m => chalk.cyan(m)))
			},
		})
		console.log(
			chalk.green(`Certificate for device ${chalk.yellow(id)} generated.`),
		)

		const certificate = deviceFileLocations({
			certsDir,
			deviceId: id
		})
		const caCertificate = caFileLocations(certsDir)

		const key = await fs.readFile(path.resolve(certsDir, certificate.publicKey), 'utf-8')

		const resourceGroup = 'bifravst'
		const iotHubName = 'bifravst'

		const iotHubInfo = await iotClient.iotHubResource.get(resourceGroup, iotHubName)

		// Writes a self-contained JSON file
		// This setup uses the long-term MQTT domain
		// See https://cloud.google.com/iot/docs/how-tos/mqtt-bridge#downloading_mqtt_server_certificates
		await fs.writeFile(
			certificate.json,
			JSON.stringify(
				{
					caCert: await fs.readFile(caCertificate.cert, 'utf-8'),
					privateKey: await fs.readFile(certificate.privateKey, 'utf-8'),
					publicKey: key,
					clientId: id,
					brokerHostname: iotHubInfo.properties?.hostName,
				},
				null,
				2,
			),
		)

		console.log(chalk.green('You can now connect to the broker.'))
	},
	help: 'Generate a device certificate and register a device in the registry.',
})

