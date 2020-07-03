import fetch from 'node-fetch'

export type B2CClient = {
	listUsers: () => Promise<
		{
			id: string
			identities: {
				signInType: 'userPrincipalName' | 'emailAddress'
				issuer: string
				issuerAssignedId: string
			}[]
		}[]
	>
}

export const b2cClient = ({
	accessToken,
}: {
	accessToken: string
}): B2CClient => {
	return {
		listUsers: async () => {
			const res = await fetch(
				`https://graph.microsoft.com/v1.0/users?$select=id,identities`,
				{
					headers: {
						Authorization: `Bearer ${accessToken}`,
					},
				},
			)
			return (await res.json()).value
		},
	}
}
