import chalk from 'chalk'
import { ComandDefinition } from './CommandDefinition'
import { generateCAChain } from '../iot/generateCA'
import { ProvisioningServiceClient } from 'azure-iot-provisioning-service'
import { IotDpsClient } from '@azure/arm-deviceprovisioningservices'

export const registerCaCommand = ({
	certsDir,
	ioTHubDPSConnectionString,
	iotDpsClient,
}: {
	certsDir: string
	ioTHubDPSConnectionString: string
	iotDpsClient: IotDpsClient
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
		console.log(chalk.magenta(`CA root and intermediat certificate generated.`))

		await iotDpsClient.dpsCertificate.createOrUpdate(
			'bifravst',
			'bifravstProvisioningService',
			'bifravst-root',
			{
				certificate: root.certificate
			},
		)

		// TODO: verify

		const dpsHostname = ioTHubDPSConnectionString.split(';')[0].split('=')[1]

		console.log(ioTHubDPSConnectionString)

		const dpsClient = ProvisioningServiceClient.fromConnectionString(ioTHubDPSConnectionString)

		await dpsClient.createOrUpdateEnrollmentGroup({
			enrollmentGroupId: 'bifravst',
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

		console.log(chalk.magenta(`Added CA certificate to Device Provisioning Service`), chalk.blueBright(dpsHostname))
	},
	help: 'Creates a CA for devices and adds it to the registry',
})
