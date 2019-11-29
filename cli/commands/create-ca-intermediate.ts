import chalk from 'chalk'
import { ComandDefinition } from './CommandDefinition'
import { generateCAIntermediate } from '../iot/generateCAIntermediate'
import { ProvisioningServiceClient } from 'azure-iot-provisioning-service'
import { IotDpsClient } from '@azure/arm-deviceprovisioningservices'
import { add as addToIntermediateRegistry } from '../iot/intermediateRegistry'
import { v4 } from 'uuid'
import { log, debug } from '../logging'

export const createCAIntermediateCommand = ({
	certsDir,
	ioTHubDPSConnectionString,
}: {
	certsDir: string
	ioTHubDPSConnectionString: () => Promise<string>
	iotDpsClient: () => Promise<IotDpsClient>
}): ComandDefinition => ({
	command: 'create-ca-intermediate',
	action: async () => {

		const id = v4()

		const intermediate = await generateCAIntermediate({
			id,
			certsDir,
			log,
			debug
		})
		console.log(chalk.magenta(`CA intermediate certificate generated.`))

		await addToIntermediateRegistry({ certsDir, id })

		// Create enrollment group

		const dpsConnString = await ioTHubDPSConnectionString()

		const dpsClient = ProvisioningServiceClient.fromConnectionString(dpsConnString)

		const enrollmentGroupId = `bifravst-${id}`

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
			chalk.magenta(`Created enrollment group for CA intermediate certificiate`),
			chalk.yellow(enrollmentGroupId)
		)

		console.log()

		console.log(chalk.green('You can now generate device certificates using'), chalk.blueBright('node cli generate-device-cert'))
	},
	help: 'Creates a CA intermediate certificate registers it with an IoT Device Provisioning Service enrollment group',
})
