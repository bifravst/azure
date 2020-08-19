import {
	regexGroupMatcher,
	StepRunnerFunc,
	InterpolatedStep,
	regexMatcher,
} from '@bifravst/e2e-bdd-test-runner'
import { generateDeviceCertificate } from '../../cli/iot/generateDeviceCertificate'
import { connectDevice } from '../../cli/iot/connectDevice'
import { IotDpsClient } from '@azure/arm-deviceprovisioningservices'
import { AzureCliCredentials } from '@azure/ms-rest-nodeauth'
import { MqttClient } from 'mqtt'
import { deviceTopics } from '../../cli/iot/deviceTopics'
import { v4 } from 'uuid'
import * as chai from 'chai'
import { expect } from 'chai'
import * as chaiSubset from 'chai-subset'
chai.use(chaiSubset)
import * as fetchPonyfill from 'fetch-ponyfill'
const { fetch } = fetchPonyfill()

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
	let fwResult = ''
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
		regexGroupMatcher(
			/^the (?<desiredOrReported>desired|reported) state of the (?:device|cat tracker) "(?<deviceId>[^"]+)" (?:should )?(?<equalOrMatch>equals?|match(?:es)?)$/,
		)(async ({ desiredOrReported, deviceId, equalOrMatch }, step) => {
			if (step.interpolatedArgument === undefined) {
				throw new Error('Must provide argument!')
			}
			const j = JSON.parse(step.interpolatedArgument)
			const connection = connections[deviceId]
			const state: Record<string, any> = await new Promise(
				(resolve, reject) => {
					const getTwinPropertiesRequestId = v4()
					const i = setTimeout(reject, 20000)
					connection.publish(
						deviceTopics.getTwinProperties(getTwinPropertiesRequestId),
						'',
					)
					connection.subscribe(
						deviceTopics.getTwinPropertiesAccepted(getTwinPropertiesRequestId),
					)
					connection.once('message', (topic, payload) => {
						if (
							topic !==
							deviceTopics.getTwinPropertiesAccepted(getTwinPropertiesRequestId)
						) {
							console.debug('[iot]', `Unexpected topic: ${topic}`)
							reject()
							clearInterval(i)
						}
						resolve(JSON.parse(payload.toString()))
						clearInterval(i)
					})
				},
			)
			const fragment = state[desiredOrReported]
			if (equalOrMatch.startsWith('match')) {
				expect(fragment).to.containSubset(j)
			} else {
				expect(fragment).to.deep.equal(j)
			}
			return state
		}),
		regexGroupMatcher(/^I download the firmware from (?<fwPackageURI>http.+)$/)(
			async ({ fwPackageURI }) => {
				const res = await fetch(fwPackageURI)
				expect(res.status).to.equal(200)
				fwResult = await (await res.blob()).text()
				return [fwPackageURI, fwResult]
			},
		),
		regexMatcher(/^the firmware file should contain this payload$/)(
			async (_, step) => {
				if (step.interpolatedArgument === undefined) {
					throw new Error('Must provide argument!')
				}
				expect(fwResult).to.equal(step.interpolatedArgument)
			},
		),
	]
}
