import chalk from 'chalk'
import { ComandDefinition } from './CommandDefinition'
import { generateCA } from '../iot/generateCA'
import { ProvisioningServiceClient } from 'azure-iot-provisioning-service'

export const registerCaCommand = ({
	certsDir,
	ioTHubDPSConnectionString,
}: {
	certsDir: string
	ioTHubDPSConnectionString: string
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
							certificate
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
