import fetch from 'node-fetch'
import { handleErrorResponse } from './handleResponse'

export type User = {
	id: string
	identities: {
		signInType: 'userPrincipalName' | 'emailAddress'
		issuer: string
		issuerAssignedId: string
	}[]
}

/**
 * Contains the password profile associated with a user. The passwordProfile property of the user entity is a passwordProfile object.
 */
export type PasswordProfile = {
	/**
	 * true if the user must change her password on the next login; otherwise false.
	 */
	forceChangePasswordNextSignIn: boolean
	/**
	 * If true, at next sign-in, the user must perform a multi-factor authentication (MFA) before being forced to change their password. The behavior is identical to forceChangePasswordNextSignIn except that the user is required to first perform a multi-factor authentication before password change. After a password change, this property will be automatically reset to false. If not set, default is false.
	 */
	forceChangePasswordNextSignInWithMfa: boolean
	/**
	 * The password for the user. This property is required when a user is created. It can be updated, but the user will be required to change the password on the next login. The password must satisfy minimum requirements as specified by the user’s passwordPolicies property. By default, a strong password is required.
	 */
	password: string
}

export type Identity = {
	signInType: 'userName' | 'emailAddress' | 'federated'
	issuer: string
	issuerAssignedId: string
}

export type B2CClient = {
	/**
	 * Retrieve a list of user objects.
	 *
	 * @see https://docs.microsoft.com/en-us/graph/api/user-list?view=graph-rest-1.0&tabs=http
	 */
	listUsers: () => Promise<User[]>
	/**
	 * Create a new user.
	 *
	 * @see https://docs.microsoft.com/en-us/graph/api/user-post-users?view=graph-rest-1.0&tabs=http
	 */
	createUser: (args: {
		/**
		 * true if the account is enabled; otherwise, false.
		 */
		accountEnabled: boolean
		/**
		 * The name to display in the address book for the user.
		 */
		displayName: string
		/**
		 * Only needs to be specified when creating a new user account if you are using a federated domain for the user's userPrincipalName (UPN) property.
		 */
		onPremisesImmutableId?: string
		/**
		 * The mail alias for the user.
		 */
		mailNickname: string
		/**
		 * The password profile for the user.
		 */
		passwordProfile: PasswordProfile
		/**
		 * The user principal name (someuser@contoso.com).
		 */
		userPrincipalName: string
		/**
		 * Additional Identities
		 *
		 * @see https://docs.microsoft.com/en-us/graph/api/user-post-users?view=graph-rest-1.0&tabs=http#example-2-create-a-user-with-social-and-local-account-identities
		 */
		identities?: Identity[]
	}) => Promise<User>
	/**
	 * Create a new user for the given email and password.
	 */
	createUserForEmailAndPassword: (args: {
		email: string
		password: string
	}) => Promise<User>
}

/**
 * @see https://docs.microsoft.com/en-us/azure/active-directory-b2c/manage-user-accounts-graph-api
 */
export const b2cClient = ({
	accessToken,
	b2cTenant,
}: {
	accessToken: string
	b2cTenant: string
}): B2CClient => {
	const endpoint = 'https://graph.microsoft.com/v1.0'
	const defaultHeaders = {
		Authorization: `Bearer ${accessToken}`,
	}
	const createUser = async (args: Parameters<B2CClient['createUser']>[0]) => {
		const res = await fetch(`${endpoint}/users`, {
			method: 'POST',
			headers: {
				...defaultHeaders,
				'Content-Type': 'application/json; charset=utf-8',
			},
			body: JSON.stringify(args),
		})
		await handleErrorResponse(res)
		return await res.json()
	}
	return {
		listUsers: async () => {
			const res = await fetch(
				`${endpoint}/users?$select=id,identities,displayName,userPrincipalName,mailNickname`,
				{
					headers: defaultHeaders,
				},
			)
			await handleErrorResponse(res)
			return (await res.json()).value
		},
		createUser,
		createUserForEmailAndPassword: async ({
			email,
			password,
		}: Parameters<B2CClient['createUserForEmailAndPassword']>[0]) => {
			const [id] = email.split('@')
			return createUser({
				accountEnabled: true,
				displayName: `Test User (${email})`,
				userPrincipalName: `${id}@${b2cTenant}.onmicrosoft.com`,
				mailNickname: id,
				passwordProfile: {
					forceChangePasswordNextSignIn: false,
					forceChangePasswordNextSignInWithMfa: false,
					password,
				},
				identities: [
					{
						signInType: 'emailAddress',
						issuer: `${b2cTenant}.onmicrosoft.com`,
						issuerAssignedId: email,
					},
				],
			})
		},
	}
}
