import chalk from 'chalk'
import { ComandDefinition } from './CommandDefinition'
import { generateCAChain } from '../iot/generateCA'
import { ProvisioningServiceClient } from 'azure-iot-provisioning-service'
import { IotDpsClient } from '@azure/arm-deviceprovisioningservices'
import { generateProofOfPosession } from '../iot/generateProofOfPosession'

export const registerCaCommand = ({
	certsDir,
	ioTHubDPSConnectionString,
	iotDpsClient,
}: {
	certsDir: string
	ioTHubDPSConnectionString: () => Promise<string>
	iotDpsClient: () => Promise<IotDpsClient>
}): ComandDefinition => ({
	command: 'register-ca',
	action: async () => {

		const log = (...message: any[]) => {
			console.log(...message.map(m => chalk.magenta(m)))
		}

		const debug = (...message: any[]) => {
			console.log(...message.map(m => chalk.cyan(m)))
		}

		const { root, intermediate } = await generateCAChain({
			certsDir,
			log,
			debug
		})
		console.log(chalk.magenta(`CA root and intermediate certificate generated.`))

		// Register root CA certificate on DPS

		const certificateName = 'bifravst-root'
		const resourceGroupName = 'bifravst'
		const dpsName = 'bifravstProvisioningService'

		const armDpsClient = await iotDpsClient()

		await armDpsClient.dpsCertificate.createOrUpdate(
			resourceGroupName,
			dpsName,
			certificateName,
			{
				certificate: root.certificate
			},
		)

		console.log(
			chalk.magenta(`CA root registered with DPS.`),
			chalk.yellow(dpsName)
		)

		// Create verification cert

		const { etag } = await armDpsClient.dpsCertificate.get(certificateName, resourceGroupName, dpsName)
		const { properties } = await armDpsClient.dpsCertificate.generateVerificationCode(
			certificateName,
			etag as string,
			resourceGroupName,
			dpsName
		)

		if (!properties?.verificationCode) {
			throw new Error(`Failed to generate verification code`)
		}

		await generateProofOfPosession({
			certsDir,
			log,
			debug,
			verificationCode: properties.verificationCode
		})

		console.log(
			chalk.magenta(`Generated verification certificate for verification code`),
			chalk.yellow(properties.verificationCode)
		)

		// Create enrollment group

		const dpsConnString = await ioTHubDPSConnectionString()

		const dpsHostname = dpsConnString.split(';')[0].split('=')[1]

		const dpsClient = ProvisioningServiceClient.fromConnectionString(dpsConnString)

		const enrollmentGroupId = 'bifravst'

		await dpsClient.createOrUpdateEnrollmentGroup({
			enrollmentGroupId,
			attestation: {
				type: 'x509',
				//@ts-ignore
				x509: {
					signingCertificates: {
						primary: {
							certificate: intermediate.certificate
						}
					}
				}
			},
			provisioningStatus: "enabled",
			reprovisionPolicy: {
				migrateDeviceData: true,
				updateHubAssignment: true
			}
		})

		console.log(
			chalk.magenta(`Created enrollment group for intermediate CA cert.`),
			chalk.yellow(enrollmentGroupId)
		)

		console.log(chalk.magenta(`Added CA certificate to Device Provisioning Service`), chalk.yellow(dpsHostname))

		console.log()

		console.log(chalk.green('You can now verify the proof of posession using'), chalk.blueBright('node cli proof-ca-possession'))
	},
	help: 'Creates a CA for devices and adds it to the registry',
})
