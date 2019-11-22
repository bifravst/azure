import chalk from 'chalk'
import { ComandDefinition } from './CommandDefinition'
import { promises as fs } from 'fs'
import { IotHubClient } from "@azure/arm-iothub";
import { caFileLocations } from '../iot/caFileLocations';
import { ProvisioningServiceClient } from 'azure-iot-provisioning-service'

export const proofPosession = ({
	certsDir,
	iotClient,
	iotHubConnectionString,
}: {
	certsDir: string
	iotHubConnectionString: string
	iotClient: IotHubClient
}): ComandDefinition => ({
	command: 'proof-ca-posession',
	action: async () => {

		const resourceGroupName = 'bifravst'
		const iotHubName = 'bifravst'
		const certificateName = 'bifravst-devices'

		const cert = await iotClient.certificates.get(
			resourceGroupName,
			iotHubName,
			certificateName,
		)

		const caFiles = caFileLocations(certsDir)
		const verificationPEM = await fs.readFile(caFiles.verificationPEM, 'utf-8')

		await iotClient.certificates.verify(
			resourceGroupName,
			iotHubName,
			certificateName,
			cert.etag as string,
			{
				certificate: verificationPEM
			})

		console.log(chalk.magenta(`Verified CA certificate on IoT Hub`, chalk.blueBright(iotHubName)))

		const client = ProvisioningServiceClient.fromConnectionString(iotHubConnectionString)
		// See https://github.com/MicrosoftDocs/azure-docs/blob/master/articles/iot-dps/quick-enroll-device-x509-node.md
		await client.createOrUpdateEnrollmentGroup({
			enrollmentGroupId: 'bifravst',
			attestation: {
				type: "x509",
				//@ts-ignore
				x509: {
					signingCertificates: {
						primary: {
							certificate: (await fs.readFile(caFiles.cert, 'utf-8')).toString()
						}
					},
				}
			},
		})

		console.log(chalk.green('You can now generate device certificates.'))
	},
	help: 'Creates a CA for devices and adds it to the registry',
})
