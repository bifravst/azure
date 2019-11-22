import chalk from 'chalk'
import { ComandDefinition } from './CommandDefinition'
import { generateCA } from '../iot/generateCA'
import { IotHubClient } from "@azure/arm-iothub";
import { generateProofOfPosession } from '../iot/generateProofOfPosession';

export const registerCaCommand = ({
	certsDir,
	iotClient,
}: {
	certsDir: string
	iotClient: IotHubClient
}): ComandDefinition => ({
	command: 'register-ca',
	action: async () => {

		const log = (...message: any[]) => {
			console.log(...message.map(m => chalk.magenta(m)))
		}

		const debug = (...message: any[]) => {
			console.log(...message.map(m => chalk.cyan(m)))
		}

		const { certificate } = await generateCA({
			certsDir,
			log,
			debug
		})
		console.log(chalk.magenta(`CA certificate generated.`))

		console.log(certificate)

		const resourceGroupName = 'bifravst'
		const iotHubName = 'bifravst'
		const certificateName = `${iotHubName}-devices`

		const iotHubCert = await iotClient.certificates.createOrUpdate(
			resourceGroupName,
			iotHubName,
			certificateName,
			{
				certificate,
			}
		)

		const cert = await iotClient.certificates.generateVerificationCode(
			resourceGroupName,
			iotHubName,
			certificateName,
			iotHubCert.etag as string,
		)

		await generateProofOfPosession({
			certsDir,
			log,
			debug,
			verificationCode: cert.properties?.verificationCode ?? ''
		})

		console.log(chalk.magenta(`Added CA certificate to registry`), chalk.blueBright(iotHubName))
		console.log(chalk.green('You can now proof the posession using'), chalk.yellow(`node cli proof-ca-posession`))
	},
	help: 'Creates a CA for devices and adds it to the registry',
})
