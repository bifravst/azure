import chalk from 'chalk'
import { ComandDefinition } from './CommandDefinition'
import { IotDpsClient } from '@azure/arm-deviceprovisioningservices'
import { promises as fs } from 'fs'
import { caFileLocations } from '../iot/caFileLocations'

export const proofCaPossessionCommand = ({
	certsDir,
	iotDpsClient,
}: {
	certsDir: string
	iotDpsClient: () => Promise<IotDpsClient>
}): ComandDefinition => ({
	command: 'proof-ca-possession',
	action: async () => {

		const certificateName = 'bifravst-root'
		const resourceGroupName = 'bifravst'
		const dpsName = 'bifravstProvisioningService'

		const armDpsClient = await iotDpsClient()

		const { etag } = await armDpsClient.dpsCertificate.get(certificateName, resourceGroupName, dpsName)

		const certLocations = caFileLocations(certsDir)

		const verificationCert = await fs.readFile(certLocations.verificationCert, 'utf-8')

		console.log(chalk.magenta('Certificate:'), chalk.yellow(certificateName))

		await armDpsClient.dpsCertificate.verifyCertificate(certificateName, etag as string, {
			certificate: verificationCert,
		}, resourceGroupName, dpsName)

		console.log(chalk.magenta('Verified root CA certificate.'))
		console.log()
		console.log(chalk.green('You can now generate device certificates using'), chalk.blueBright('node cli generate-cert'))
	},
	help: 'Verifies the root CA certificate which is registered with the Device Provisioning System',
})
