import chalk from 'chalk'
import { ComandDefinition } from './CommandDefinition'
import { generateCAIntermediate } from '../iot/generateCAIntermediate'
import { ProvisioningServiceClient } from 'azure-iot-provisioning-service'
import { add as addToIntermediateRegistry } from '../iot/intermediateRegistry'
import { v4 } from 'uuid'
import { log, debug } from '../logging'

export const createCAIntermediateCommand = ({
	certsDir,
	ioTHubDPSConnectionString,
}: {
	certsDir: string
	ioTHubDPSConnectionString: () => Promise<string>
}): ComandDefinition => ({
	command: 'create-ca-intermediate',
	action: async () => {
		const id = v4()

		const intermediate = await generateCAIntermediate({
			id,
			certsDir,
			log,
			debug,
		})
		console.log(chalk.magenta(`CA intermediate certificate generated.`))

		await addToIntermediateRegistry({ certsDir, id })

		// Create enrollment group

		const dpsConnString = await ioTHubDPSConnectionString()

		const dpsClient = ProvisioningServiceClient.fromConnectionString(
			dpsConnString,
		)

		const enrollmentGroupId = `bifravst-${id}`

		// FIXME: Remove undefined, once https://github.com/Azure/azure-iot-sdk-node/pull/663 is released
		await dpsClient.createOrUpdateEnrollmentGroup({
			enrollmentGroupId,
			attestation: {
				type: 'x509',
				x509: {
					signingCertificates: {
						primary: {
							certificate: intermediate.certificate,
							info: undefined as any,
						},
						secondary: undefined as any,
					},
					clientCertificates: undefined as any,
					caReferences: undefined as any,
				},
			},
			provisioningStatus: 'enabled',
			reprovisionPolicy: {
				migrateDeviceData: true,
				updateHubAssignment: true,
			},
			initialTwin: undefined as any,
			iotHubHostName: undefined as any,
			iotHubs: undefined as any,
			etag: undefined as any,
			createdDateTimeUtc: undefined as any,
			lastUpdatedDateTimeUtc: undefined as any,
		})

		console.log(
			chalk.magenta(
				`Created enrollment group for CA intermediate certificiate`,
			),
			chalk.yellow(enrollmentGroupId),
		)

		console.log()

		console.log(
			chalk.green('You can now generate device certificates using'),
			chalk.blueBright('node cli create-device-cert'),
		)
	},
	help:
		'Creates a CA intermediate certificate registers it with an IoT Device Provisioning Service enrollment group',
})
