import { AzureFunction, Context, HttpRequest } from '@azure/functions'
import { IotHubClient } from '@azure/arm-iothub'
import * as msRestNodeAuth from '@azure/ms-rest-nodeauth'

const listDevices: AzureFunction = async (
	context: Context,
	req: HttpRequest,
): Promise<void> => {
	context.log({ req })
	try {
		// See https://docs.microsoft.com/en-us/azure/app-service/overview-managed-identity?tabs=dotnet#obtaining-tokens-for-azure-resources
		const msiTokenRes = await msRestNodeAuth.loginWithAppServiceMSI({
			msiEndpoint: process.env.MSI_ENDPOINT || '',
			msiSecret: process.env.MSI_SECRET || '',
		})
		console.log(msiTokenRes)

		const iotHubClient = new IotHubClient(
			msiTokenRes,
			process.env.AZURE_SUBSCRIPTION_ID || '',
		)
		const iotHubs = await iotHubClient.iotHubResource.listBySubscription()

		context.res = {
			// status: 200, /* Defaults to 200 */
			headers: {
				'Content-Type': 'application/json; charset=uft-8',
			},
			isRaw: true,
			body: JSON.stringify(iotHubs),
		}
	} catch (error) {
		context.res = {
			status: 500,
			isRaw: true,
			body: JSON.stringify(error),
		}
	}
}

export default listDevices
