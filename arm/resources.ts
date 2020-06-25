export const resourceGroupName = () =>
	process.env.RESOURCE_GROUP_NAME ?? 'bifravst'

export const deploymentName = resourceGroupName

/**
 * Returns the name of the Device Provisioning Service
 */
export const iotDeviceProvisioningServiceName = () =>
	`${resourceGroupName()}ProvisioningService`
