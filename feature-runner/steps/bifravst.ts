import {
	regexMatcher,
	StepRunnerFunc,
	InterpolatedStep,
} from '@bifravst/e2e-bdd-test-runner'
import { randomWords } from '@bifravst/random-words'
import { generateDeviceCertificate } from '../../cli/iot/generateDeviceCertificate'
import { list } from '../../cli/iot/intermediateRegistry'

export const bifravstStepRunners = ({
	certsDir,
}: {
	certsDir: string
}): ((step: InterpolatedStep) => StepRunnerFunc<any> | false)[] => {
	return [
		regexMatcher(/^I generate a certificate$/)(async () => {
			const deviceId = (await randomWords({ numWords: 3 })).join('-')

			const intermediateCerts = await list({ certsDir })
			const intermediateCertId = intermediateCerts[0]

			await generateDeviceCertificate({
				deviceId,
				certsDir,
				intermediateCertId,
			})

			return deviceId
		}),
	]
}
