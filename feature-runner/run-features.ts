import {
	FeatureRunner,
	ConsoleReporter,
	randomStepRunners,
} from '@bifravst/e2e-bdd-test-runner'
import * as program from 'commander'
import * as chalk from 'chalk'
import { v4 } from 'uuid'

let ran = false

type BifravstWorld = {
	subscriptionId: string
	resourceGroup: string
}

program
	.arguments('<featureDir>')
	.option('-r, --print-results', 'Print results')
	.option('-p, --progress', 'Print progress')
	.option('-X, --no-retry', 'Do not retry steps')
	.option(
		'-s, --subscription <subscription>',
		'Subscription ID',
		process.env.SUBSCRIPTION_ID,
	)
	.option(
		'-r, --resource-group <resource-group>',
		'Resource group name',
		process.env.RESOURCE_GROUP_NAME ?? 'bifravst',
	)
	.action(
		async (
			featureDir: string,
			{
				printResults,
				subscription: subscriptionId,
				resourceGroup,
				progress,
				retry,
			}: {
				printResults: boolean
				subscription: string
				resourceGroup: string
				progress: boolean
				retry: boolean
			},
		) => {
			ran = true

			const world: BifravstWorld = {
				subscriptionId,
				resourceGroup,
			} as const

			console.log(chalk.yellow.bold(' World:'))
			console.log()
			console.log(world)
			console.log()

			const runner = new FeatureRunner<BifravstWorld>(world, {
				dir: featureDir,
				reporters: [
					new ConsoleReporter({
						printResults,
						printProgress: progress,
						printProgressTimestamps: true,
						printSummary: true,
					}),
				],
				retry,
			})
			runner.addStepRunners(
				randomStepRunners({
					generators: {
						email: () => `${v4()}@example.com`,
						password: () =>
							((pw) =>
								`${pw[0].toUpperCase()}${pw.substr(1)}${Math.round(
									Math.random() * 1000,
								)}`)(
								Math.random()
									.toString(36)
									.replace(/[^a-z]+/g, ''),
							),
					},
				}),
			)

			try {
				const { success } = await runner.run()
				if (!success) {
					process.exit(1)
					return
				}
				process.exit()
			} catch (error) {
				console.error(chalk.red('Running the features failed!'))
				console.error(error)
				process.exit(1)
			}
		},
	)
	.parse(process.argv)

if (!ran) {
	program.outputHelp(chalk.red)
	process.exit(1)
}
