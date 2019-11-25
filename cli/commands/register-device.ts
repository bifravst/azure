import chalk from 'chalk'
import { ComandDefinition } from './CommandDefinition'
import { randomWords } from '@bifravst/random-words'
import { generateDeviceCertificate } from '../iot/generateDeviceCertificate'
import { IotHubClient } from "@azure/arm-iothub";

export const registerDeviceCommand = ({
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

		console.log(chalk.green('You can now connect to the broker.'))
	},
	help: 'Generate a device certificate and register a device in the registry.',
})

