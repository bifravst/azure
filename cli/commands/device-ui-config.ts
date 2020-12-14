import { CommandDefinition } from './CommandDefinition'
import { objectToEnv } from '@bifravst/object-to-env'
import { StorageManagementClient } from '@azure/arm-storage'

export const deviceUiConfigCommand = ({
	storageClient,
	resourceGroup,
}: {
	storageClient: () => Promise<StorageManagementClient>
	resourceGroup: string
}): CommandDefinition => ({
	command: 'device-ui-config',
	action: async () => {
		const [{ primaryEndpoints: deviceUiEndpoints }] = await Promise.all([
			storageClient().then(async (client) =>
				client.storageAccounts.getProperties(
					resourceGroup,
					`${resourceGroup}deviceui`,
				),
			),
		])

		process.stdout.write(
			objectToEnv(
				{
					deviceUiBaseUrl: deviceUiEndpoints?.web,
				},
				'SNOWPACK_PUBLIC_',
			),
		)
	},
	help:
		'Prints the environment variables for the Device Simulator Web Application.',
})
