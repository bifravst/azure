import { ComandDefinition } from './CommandDefinition'
import { objectToEnv } from '@bifravst/object-to-env'
import { fromEnv } from '../../lib/fromEnv'
import { WebSiteManagementClient } from '@azure/arm-appservice'

export const reactConfigCommand = ({
	websiteClient,
	resourceGroup,
}: {
	websiteClient: () => Promise<WebSiteManagementClient>
	resourceGroup: string
}): ComandDefinition => ({
	command: 'react-config',
	action: async () => {
		const c = await websiteClient()

		const { hostNames } = await c.webApps.get(
			resourceGroup,
			`${resourceGroup}api`,
		)

		process.stdout.write(
			objectToEnv(
				{
					eslint: true,
					cloudFlavour: 'Azure',
					...fromEnv({
						azureB2cTenant: 'B2C_TENANT',
						azureClientId: 'APP_REG_CLIENT_ID',
					})(process.env),
					azureApiEndpoint: `https://${hostNames?.[0]}/`,
				},
				'REACT_APP_',
			),
		)
	},

	help: 'Prints the stack outputs as create-react-app environment variables.',
})
