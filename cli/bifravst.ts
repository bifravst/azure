import * as program from 'commander'
import * as chalk from 'chalk'
import * as path from 'path'
import * as fs from 'fs'
import { createCARootCommand } from './commands/create-ca-root'
import { IotDpsClient } from '@azure/arm-deviceprovisioningservices'
import { AzureCliCredentials } from '@azure/ms-rest-nodeauth'
import { WebSiteManagementClient } from '@azure/arm-appservice'
import { createDeviceCertCommand } from './commands/create-device-cert'
import { connectCommand } from './commands/connect'
import { proofCARootPossessionCommand } from './commands/proof-ca-possession'
import { createCAIntermediateCommand } from './commands/create-ca-intermediate'
import {
	iotDeviceProvisioningServiceName,
	resourceGroupName,
	deploymentName,
} from '../arm/resources'
import fetch from 'node-fetch'
import { reactConfigCommand } from './commands/react-config'

const version = JSON.parse(
	fs.readFileSync(path.join(process.cwd(), 'package.json'), 'utf-8'),
).version

const ioTHubDPSConnectionString = ({
	resourceGroupName,
	credentials,
}: {
	deploymentName: string
	resourceGroupName: string
	credentials: () => Promise<AzureCliCredentials>
}) => async (): Promise<string> => {
	const creds = await credentials()
	const subscriptionId = creds.tokenInfo.subscription
	const token = await creds.getToken()

	return Promise.all([
		fetch(
			`https://management.azure.com/subscriptions/${subscriptionId}/resourceGroups/${resourceGroupName}/providers/Microsoft.Devices/provisioningServices/${resourceGroupName}ProvisioningService/listkeys?api-version=2018-01-22`,
			{
				method: 'POST',
				headers: {
					Authorization: `Bearer ${token.accessToken}`,
					'Content-type': `application/json`,
				},
			},
		),
		fetch(
			`https://management.azure.com/subscriptions/${subscriptionId}/resourceGroups/${resourceGroupName}/providers/Microsoft.Devices/provisioningServices/${resourceGroupName}ProvisioningService?api-version=2018-01-22`,
			{
				headers: {
					Authorization: `Bearer ${token.accessToken}`,
					'Content-type': `application/json`,
				},
			},
		),
	])
		.then(async (res) => Promise.all(res.map(async (r) => r.json())))
		.then(
			([
				{ value },
				{
					properties: { serviceOperationsHostName },
				},
			]) =>
				`HostName=${serviceOperationsHostName};SharedAccessKeyName=provisioningserviceowner;SharedAccessKey=${value[0].primaryKey}`,
		)
}

const creds = async () => {
	const creds = await AzureCliCredentials.create()

	const {
		tokenInfo: { subscription },
	} = creds

	console.error(chalk.magenta('Subscription:'), chalk.yellow(subscription))
	console.error(
		chalk.magenta('Resource Group:'),
		chalk.yellow(resourceGroupName()),
	)

	return creds
}

let currentCreds: Promise<AzureCliCredentials>

const getCurrentCreds = async () => {
	if (currentCreds === undefined) currentCreds = creds()
	return currentCreds
}

const bifravstCLI = async () => {
	const certsDir = path.resolve(process.cwd(), 'certificates')

	const resourceGroup = resourceGroupName()
	const deployment = deploymentName()
	const dpsName = iotDeviceProvisioningServiceName()

	const getIotHubConnectionString = ioTHubDPSConnectionString({
		resourceGroupName: resourceGroup,
		deploymentName: deployment,
		credentials: getCurrentCreds,
	})
	const getIotDpsClient = async () =>
		getCurrentCreds().then(
			(creds) => new IotDpsClient(creds as any, creds.tokenInfo.subscription), // FIXME: This removes a TypeScript incompatibility error
		)
	const getWebsiteClient = async () =>
		getCurrentCreds().then(
			(creds) =>
				new WebSiteManagementClient(creds, creds.tokenInfo.subscription),
		)

	program.description('Bifravst Command Line Interface')

	const commands = [
		createCARootCommand({
			certsDir,
			iotDpsClient: getIotDpsClient,
			dpsName,
			resourceGroup,
		}),
		proofCARootPossessionCommand({
			iotDpsClient: getIotDpsClient,
			certsDir,
			dpsName,
			resourceGroup,
		}),
		createCAIntermediateCommand({
			certsDir,
			ioTHubDPSConnectionString: getIotHubConnectionString,
		}),
		createDeviceCertCommand({
			certsDir,
		}),
		connectCommand({
			iotDpsClient: getIotDpsClient,
			certsDir,
			version,
			resourceGroup,
		}),
		reactConfigCommand({
			websiteClient: getWebsiteClient,
			resourceGroup,
		}),
	]

	let ran = false
	commands.forEach(({ command, action, help, options }) => {
		const cmd = program.command(command)
		cmd
			.action(async (...args) => {
				try {
					ran = true
					await action(...args)
				} catch (error) {
					console.error(
						chalk.red.inverse(' ERROR '),
						chalk.red(`${command} failed!`),
					)
					console.error(chalk.red.inverse(' ERROR '), chalk.red(error))
					process.exit(1)
				}
			})
			.on('--help', () => {
				console.log('')
				console.log(chalk.yellow(help))
				console.log('')
			})
		if (options) {
			options.forEach(({ flags, description, defaultValue }) =>
				cmd.option(flags, description, defaultValue),
			)
		}
	})

	program.parse(process.argv)

	if (!ran) {
		program.outputHelp(chalk.yellow)
		throw new Error('No command selected!')
	}
}

bifravstCLI().catch((err) => {
	console.error(chalk.red(err))
	process.exit(1)
})
