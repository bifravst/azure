import {
	regexGroupMatcher,
	StepRunnerFunc,
	InterpolatedStep,
} from '@bifravst/e2e-bdd-test-runner'
import { generateDeviceCertificate } from '../../cli/iot/generateDeviceCertificate'
import { connectDevice } from '../../cli/iot/connectDevice'
import { IotDpsClient } from '@azure/arm-deviceprovisioningservices'
import { AzureCliCredentials } from '@azure/ms-rest-nodeauth'
import { MqttClient } from 'mqtt'
import { deviceTopics } from '../../cli/iot/deviceTopics'
import { v4 } from 'uuid'

export const deviceStepRunners = ({
	certsDir,
	resourceGroup,
	intermediateCertId,
}: {
	certsDir: string
	resourceGroup: string
	intermediateCertId: string
}): ((step: InterpolatedStep) => StepRunnerFunc<any> | false)[] => {
	const connections = {} as Record<string, MqttClient>
	return [
		regexGroupMatcher(
			/^I generate a certificate for the (?:device|cat tracker) "(?<deviceId>[^"]+)"$/,
		)(async ({ deviceId }) => {
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
		regexGroupMatcher(
			/^the (?:device|cat tracker) "(?<deviceId>[^"]+)" updates its reported state with$/,
		)(async ({ deviceId }, step) => {
			if (step.interpolatedArgument === undefined) {
				throw new Error('Must provide argument!')
			}
			const reported = JSON.parse(step.interpolatedArgument)
			const connection = connections[deviceId]
			connection.publish(
				deviceTopics.updateTwinReported(v4()),
				JSON.stringify(reported),
			)
		}),
	]
}
