// @microsoft/microsoft-graph-client does not support clients using secrets, yet:
// https://github.com/microsoftgraph/msgraph-sdk-javascript/issues/237#issuecomment-644322566

import fetch from 'node-fetch'
import { URLSearchParams } from 'url'
import { handleErrorResponse } from './handleResponse'

/**
 * Generates a client level access token which can be used to interact with the Graph API
 */
export const getClientAccessToken = async ({
	tenantId,
	clientId,
	clientSecret,
}: {
	tenantId: string
	clientId: string
	clientSecret: string
}): Promise<string> => {
	const res = await fetch(
		`https://login.microsoftonline.com/${tenantId}/oauth2/v2.0/token`,
		{
			method: 'POST',
			body: new URLSearchParams({
				client_id: clientId,
				scope: 'https://graph.microsoft.com/.default',
				client_secret: clientSecret,
				grant_type: 'client_credentials',
			}),
		},
	)
	await handleErrorResponse(res)
	const data = await res.json()
	return data.access_token
}

export const getUserAccessToken = async ({
	email,
	password,
	b2cTenant,
	clientId,
}: {
	email: string
	password: string
	b2cTenant: string
	clientId: string
}): Promise<string> => {
	const apiScope = `https://${b2cTenant}.onmicrosoft.com/api`
	const scopes = [
		`${apiScope}/user_impersonation`,
		`${apiScope}/bifravst.admin`,
	]

	const res = await fetch(
		`https://${b2cTenant}.b2clogin.com/${b2cTenant}.onmicrosoft.com/B2C_1_developer/oauth2/v2.0/token`,
		{
			method: 'POST',
			body: new URLSearchParams({
				username: email,
				password,
				grant_type: 'password',
				client_id: clientId,
				response_type: 'token',
				scope: scopes.join(' '),
			}),
		},
	)
	await handleErrorResponse(res)
	const data = await res.json()
	return data.access_token
}
