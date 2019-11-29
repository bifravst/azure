import chalk from 'chalk'
import { ComandDefinition } from './CommandDefinition'
import { IotDpsClient } from '@azure/arm-deviceprovisioningservices'
import { promises as fs } from 'fs'
import { CARootFileLocations } from '../iot/caFileLocations'

export const proofCARootPossessionCommand = ({
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
	command: 'proof-ca-root-possession',
	action: async () => {

		const certLocations = CARootFileLocations(certsDir)

		const certificateName = (await fs.readFile(certLocations.name, 'utf-8')).trim()

		const armDpsClient = await iotDpsClient()

		const { etag } = await armDpsClient.dpsCertificate.get(certificateName, resourceGroup, dpsName)

		const verificationCert = await fs.readFile(certLocations.verificationCert, 'utf-8')

		console.log(chalk.magenta('Certificate:'), chalk.yellow(certificateName))

		await armDpsClient.dpsCertificate.verifyCertificate(certificateName, etag as string, {
			certificate: verificationCert,
		}, resourceGroup, dpsName)

		console.log(chalk.magenta('Verified root CA certificate.'))
		console.log()
		console.log(chalk.green('You can now register a CA intermediate certificate using'), chalk.blueBright('node cli register-ca-intermediate'))
	},
	help: 'Verifies the root CA certificate which is registered with the Device Provisioning System',
})