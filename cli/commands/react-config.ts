import { CommandDefinition } from './CommandDefinition'
import { objectToEnv } from '@bifravst/object-to-env'
import { fromEnv } from '../../lib/fromEnv'
import { WebSiteManagementClient } from '@azure/arm-appservice'
import { StorageManagementClient } from '@azure/arm-storage'

export const reactConfigCommand = ({
	websiteClient,
	storageClient,
	resourceGroup,
}: {
	websiteClient: () => Promise<WebSiteManagementClient>
	storageClient: () => Promise<StorageManagementClient>
	resourceGroup: string
}): CommandDefinition => ({
	command: 'react-config',
	action: async () => {
		const [
			{ hostNames },
			{ primaryEndpoints: appEndpoints },
		] = await Promise.all([
			websiteClient().then(async (client) =>
				client.webApps.get(resourceGroup, `${resourceGroup}api`),
			),
			storageClient().then(async (client) =>
				client.storageAccounts.getProperties(
					resourceGroup,
					`${resourceGroup}app`,
				),
			),
		])

		process.stdout.write(
			objectToEnv(
				{
					cloudFlavour: 'Azure',
					...fromEnv({
						azureB2cTenant: 'B2C_TENANT',
						azureClientId: 'APP_REG_CLIENT_ID',
					})(process.env),
					azureApiEndpoint: `https://${hostNames?.[0]}/`,
					webAppUrl: appEndpoints?.web,
				},
				'REACT_APP_',
			),
		)
	},
	help: 'Prints the stack outputs as create-react-app environment variables.',
})
