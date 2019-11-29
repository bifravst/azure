import * as program from 'commander'
import chalk from 'chalk'
import * as path from 'path'
import { registerCARootCommand } from './commands/register-ca-root'
import { IotHubClient } from "@azure/arm-iothub";
import { IotDpsClient } from '@azure/arm-deviceprovisioningservices'
import { AzureCliCredentials } from "@azure/ms-rest-nodeauth";
import { generateDeviceCommand } from './commands/generate-device-cert';
import { connectCommand } from './commands/connect';
import { run } from './process/run';
import { proofCARootPossessionCommand } from './commands/proof-ca-possession';
import { registerCAIntermediateCommand } from './commands/register-ca-intermediate';
import { iotDeviceProvisioningServiceName, resourceGroupName, deploymentName } from '../arm/resources';

const ioTHubDPSConnectionString = ({ deploymentName, resourceGroupName }: { deploymentName: string, resourceGroupName: string }) => async () => (await run({
	command: 'az',
	args: [
		'group', 'deployment', 'show', '-g', resourceGroupName, '-n', deploymentName, '--query', 'properties.outputs.ioTHubDPSConnectionString.value'
	]
})).replace(/"/g, '')

const creds = async () => {
	const creds = await AzureCliCredentials.create();

	const { tokenInfo: { subscription } } = creds

	console.log(chalk.magenta('Subscription ID:'), chalk.yellow(subscription))

	return creds
}

let currentCreds: Promise<AzureCliCredentials>;

const getCurrentCreds = () => {
	if (!currentCreds) currentCreds = creds()
	return currentCreds
}

const bifravstCLI = async () => {
	const certsDir = path.resolve(process.cwd(), 'certificates')

	const resourceGroup = resourceGroupName()
	const deployment = deploymentName()
	const dpsName = iotDeviceProvisioningServiceName()

	const getIotHubConnectionString = ioTHubDPSConnectionString({ resourceGroupName: resourceGroup, deploymentName: deployment })
	const getIotDpsClient = () => getCurrentCreds().then(creds => new IotDpsClient(creds, creds.tokenInfo.subscription))
	const getIotClient = () => getCurrentCreds().then(creds => new IotHubClient(creds, creds.tokenInfo.subscription))

	program.description('Bifravst Command Line Interface')

	const commands = [
		registerCARootCommand({
			certsDir,
			iotDpsClient: getIotDpsClient,
			dpsName,
			resourceGroup
		}),
		proofCARootPossessionCommand({
			iotDpsClient: getIotDpsClient,
			certsDir,
			dpsName,
			resourceGroup
		}),
		registerCAIntermediateCommand({
			certsDir,
			ioTHubDPSConnectionString: getIotHubConnectionString,
			iotDpsClient: getIotDpsClient
		}),
		generateDeviceCommand({
			iotClient: getIotClient,
			certsDir
		}),
		connectCommand({
			iotDpsClient: getIotDpsClient,
			certsDir
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

bifravstCLI().catch(err => {
	console.error(chalk.red(err))
	process.exit(1)
})
