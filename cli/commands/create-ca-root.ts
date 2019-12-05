import chalk from 'chalk'
import { ComandDefinition } from './CommandDefinition'
import { IotDpsClient } from '@azure/arm-deviceprovisioningservices'
import { generateProofOfPosession } from '../iot/generateProofOfPosession'
import { v4 } from 'uuid'
import { generateCARoot } from '../iot/generateCARoot'
import { log, debug } from '../logging'

export const createCARootCommand = ({
	certsDir,
	iotDpsClient,
	resourceGroup,
	dpsName,
}: {
	certsDir: string
	resourceGroup: string
	dpsName: string
	iotDpsClient: () => Promise<IotDpsClient>
}): ComandDefinition => ({
	command: 'create-ca-root',
	action: async () => {
		const certificateName = `bifravst-root-${v4()}`

		const root = await generateCARoot({
			certsDir,
			name: certificateName,
			log,
			debug,
		})
		console.log(chalk.magenta(`CA root certificate generated.`))

		// Register root CA certificate on DPS

		const armDpsClient = await iotDpsClient()

		await armDpsClient.dpsCertificate.createOrUpdate(
			resourceGroup,
			dpsName,
			certificateName,
			{
				certificate: root.certificate,
			},
		)

		console.log(
			chalk.magenta(`CA root registered with DPS.`),
			chalk.yellow(dpsName),
		)

		// Create verification cert

		const { etag } = await armDpsClient.dpsCertificate.get(
			certificateName,
			resourceGroup,
			dpsName,
		)
		const {
			properties,
		} = await armDpsClient.dpsCertificate.generateVerificationCode(
			certificateName,
			etag as string,
			resourceGroup,
			dpsName,
		)

		if (!properties?.verificationCode) {
			throw new Error(`Failed to generate verification code`)
		}

		await generateProofOfPosession({
			certsDir,
			log,
			debug,
			verificationCode: properties.verificationCode,
		})

		console.log(
			chalk.magenta(`Generated verification certificate for verification code`),
			chalk.yellow(properties.verificationCode),
		)

		console.log()

		console.log(
			chalk.green('You can now verify the proof of posession using'),
			chalk.blueBright('node cli proof-ca-root-possession'),
		)
	},
	help:
		'Creates a CA root certificate and registers it with the IoT Device Provisioning Service',
})
