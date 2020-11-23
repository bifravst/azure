import * as chalk from 'chalk'
import { CommandDefinition } from './CommandDefinition'
import { randomWords } from '@bifravst/random-words'
import { generateDeviceCertificate } from '../iot/generateDeviceCertificate'
import { log, debug } from '../logging'
import { list as listIntermediateCerts } from '../iot/intermediateRegistry'

export const createDeviceCertCommand = ({
	certsDir,
}: {
	certsDir: string
}): CommandDefinition => ({
	command: 'create-device-cert',
	options: [
		{
			flags: '-d, --deviceId <deviceId>',
			description: 'Device ID, if left blank a random ID will be generated',
		},
		{
			flags: '-i, --intermediateCertId <intermediateCertId>',
			description:
				'ID of the CA intermediate certificate to use, if left blank the first will be used',
		},
	],
	action: async ({
		deviceId,
		intermediateCertId,
	}: {
		deviceId: string
		intermediateCertId: string
	}) => {
		const id = deviceId || (await randomWords({ numWords: 3 })).join('-')

		if (!intermediateCertId) {
			const intermediateCerts = await listIntermediateCerts({ certsDir })
			intermediateCertId = intermediateCerts[0]
		}

		console.log(
			chalk.magenta('Intermediate certificate:'),
			chalk.yellow(intermediateCertId),
		)

		await generateDeviceCertificate({
			deviceId: id,
			certsDir,
			log,
			debug,
			intermediateCertId,
		})
		console.log(
			chalk.magenta(`Certificate for device ${chalk.yellow(id)} generated.`),
		)

		console.log(
			chalk.green('You can now connect to the broker using'),
			chalk.blueBright(`node cli connect ${id}`),
		)

		console.log()
		console.log(
			chalk.green('You can now flash the credentials to your device'),
			chalk.greenBright(`node cli flash`),
			chalk.blueBright(id),
		)
	},
	help: 'Generate a device certificate and register a device in the registry.',
})
