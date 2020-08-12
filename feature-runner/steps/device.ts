import {
	regexGroupMatcher,
	StepRunnerFunc,
	InterpolatedStep,
} from '@bifravst/e2e-bdd-test-runner'
import { generateDeviceCertificate } from '../../cli/iot/generateDeviceCertificate'
import { list } from '../../cli/iot/intermediateRegistry'
import { connectDevice } from '../../cli/iot/connectDevice'
import { IotDpsClient } from '@azure/arm-deviceprovisioningservices'
import { AzureCliCredentials } from '@azure/ms-rest-nodeauth'
import { MqttClient } from 'mqtt'

export const deviceStepRunners = ({
	certsDir,
	resourceGroup,
}: {
	certsDir: string
	resourceGroup: string
}): ((step: InterpolatedStep) => StepRunnerFunc<any> | false)[] => {
	const connections = {} as Record<string, MqttClient>
	return [
		regexGroupMatcher(
			/^I generate a certificate for the (?:device|cat tracker) "(?<deviceId>[^"]+)"$/,
		)(async ({ deviceId }) => {
			const intermediateCerts = await list({ certsDir })
			const intermediateCertId = intermediateCerts[0]

			await generateDeviceCertificate({
				deviceId,
				certsDir,
				intermediateCertId,
			})

			return deviceId
		}),
		regexGroupMatcher(
			/^I connect the (?:device|cat tracker) "(?<deviceId>[^"]+)"$/,
		)(async ({ deviceId }) => {
			const connection = await connectDevice({
				deviceId,
				certsDir,
				dps: async () => {
					const creds = await AzureCliCredentials.create()
					const dpsClient = new IotDpsClient(
						creds,
						creds.tokenInfo.subscription,
					)
					const dps = await dpsClient.iotDpsResource.get(
						`${resourceGroup}ProvisioningService`,
						resourceGroup,
					)
					return dps.properties as {
						serviceOperationsHostName: string
						idScope: string
					}
				},
			})
			connections[deviceId] = connection
			return deviceId
		}),
	]
}
