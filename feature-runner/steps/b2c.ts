import { StepRunner, regexGroupMatcher } from '@bifravst/e2e-bdd-test-runner'
import { b2cClient } from '../lib/b2c/b2cClient'
import {
	getClientAccessToken,
	getUserAccessToken,
} from '../lib/b2c/accessToken'

export const b2cSteps = async ({
	b2cTenant,
	tenantId,
	clientSecret,
	clientId,
	ropcClientId,
}: {
	b2cTenant: string
	tenantId: string
	clientId: string
	ropcClientId: string
	clientSecret: string
}): Promise<StepRunner<any>[]> => {
	const accessToken = await getClientAccessToken({
		tenantId,
		clientId,
		clientSecret,
	})
	const client = b2cClient({ accessToken, b2cTenant })
	return [
		regexGroupMatcher(
			/^an Azure AD B2C user exists with the email "(?<email>[^"]+)" and the password "(?<password>[^"]+)"$/,
		)(async ({ email, password }) =>
			client.createUserForEmailAndPassword({ email, password }),
		),
		regexGroupMatcher(
			/^I log in as the Azure AD B2C user "(?<email>[^"]+)" with the password "(?<password>[^"]+)" and store the access token in "(?<storageName>[^"]+)"$/,
		)(async ({ email, password, storageName }, _, runner) => {
			const token = await getUserAccessToken({
				clientId: ropcClientId,
				b2cTenant,
				password,
				email,
			})
			runner.store[storageName] = token
			return token
		}),
	]
}
