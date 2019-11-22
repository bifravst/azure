import * as program from 'commander'
import chalk from 'chalk'
import * as path from 'path'
import { registerCaCommand } from './commands/register-ca'
import { IotHubClient } from "@azure/arm-iothub";
import { AzureCliCredentials } from "@azure/ms-rest-nodeauth";
import { proofPosession } from './commands/proofPosession';

const bifravstCLI = async () => {
	const certsDir = path.resolve(process.cwd(), 'certificates')

	const creds = await AzureCliCredentials.create();

	const { tokenInfo: { subscription } } = creds

	console.log(chalk.yellow('Subscription ID:'), chalk.green(subscription))


	const iotClient = new IotHubClient(creds, subscription);

	program.description('Bifravst Command Line Interface')

	const commands = [
		registerCaCommand({
			certsDir,
			iotClient,
		}),
		proofPosession({
			certsDir,
			iotClient
		})
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
