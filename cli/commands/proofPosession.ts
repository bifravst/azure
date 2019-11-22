import chalk from 'chalk'
import { ComandDefinition } from './CommandDefinition'
import { promises as fs } from 'fs'
import { IotHubClient } from "@azure/arm-iothub";
import { caFileLocations } from '../iot/caFileLocations';

export const proofPosession = ({
	certsDir,
	iotClient,
}: {
	certsDir: string
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

		console.log(chalk.green('You can now generate device certificates.'))
	},
	help: 'Creates a CA for devices and adds it to the registry',
})
