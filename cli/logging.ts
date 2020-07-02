import * as chalk from 'chalk'

export const log = (...message: any[]) => {
	console.log(...message.map((m) => chalk.magenta(m)))
}

export const debug = (...message: any[]) => {
	console.log(...message.map((m) => chalk.cyan(m)))
}
